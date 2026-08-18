"""Tests for the outbound-fetch guard on user-supplied resume URLs.

``/api/upload/`` used to hand any ``http(s)://`` URL straight to
``requests.get``, so an anonymous caller could make the backend connect to the
Celery broker on localhost, our own API, or the cloud metadata endpoint — and
read the differing error messages to work out what was listening.

These tests pin down three things: which addresses are refused, that a redirect
cannot be used to walk from a public host to an internal one, and that a
refusal never says *why* (the reason is what made the endpoint a scanner).
"""

from unittest.mock import patch

from django.test import TestCase

from analyzer.url_fetcher import download_and_validate_url, fetch_with_redirect_guard
from analyzer.url_safety import (
    ALLOWED_PORTS,
    GENERIC_REJECTION_MESSAGE,
    MAX_REDIRECTS,
    UnsafeURLError,
    assert_url_is_safe,
    is_public_address,
)

#: A routable address, used wherever a test needs the guard to say yes.
PUBLIC_IP = "93.184.216.34"


def resolver_returning(*addresses):
    """Build a resolver that always answers with ``addresses``.

    Injected so the address rules can be tested without depending on live DNS
    (or on a particular hostname continuing to resolve the way it does today).
    """
    import ipaddress

    def _resolve(hostname, port):
        return [ipaddress.ip_address(a) for a in addresses]

    return _resolve


class PublicAddressTests(TestCase):
    """The address classification itself."""

    def test_rejects_loopback(self):
        self.assertFalse(is_public_address("127.0.0.1"))
        self.assertFalse(is_public_address("127.1.2.3"))
        self.assertFalse(is_public_address("::1"))

    def test_rejects_private_ranges(self):
        for address in ("10.0.0.5", "192.168.1.1", "172.16.4.9", "fd00::1"):
            with self.subTest(address=address):
                self.assertFalse(is_public_address(address))

    def test_rejects_link_local_metadata_address(self):
        """169.254.169.254 is where cloud instance credentials live."""
        self.assertFalse(is_public_address("169.254.169.254"))
        self.assertFalse(is_public_address("fe80::1"))

    def test_rejects_unspecified_and_multicast(self):
        self.assertFalse(is_public_address("0.0.0.0"))
        self.assertFalse(is_public_address("::"))
        self.assertFalse(is_public_address("224.0.0.1"))

    def test_rejects_ipv4_loopback_wearing_an_ipv6_hat(self):
        """``::ffff:127.0.0.1`` is not reported as loopback by Python."""
        self.assertFalse(is_public_address("::ffff:127.0.0.1"))
        self.assertFalse(is_public_address("::ffff:169.254.169.254"))

    def test_rejects_6to4_wrapped_private_address(self):
        # 2002:: + 10.0.0.1 encoded as hex — a v6 address that routes to v4
        # private space.
        self.assertFalse(is_public_address("2002:0a00:0001::"))

    def test_accepts_a_routable_address(self):
        self.assertTrue(is_public_address(PUBLIC_IP))
        self.assertTrue(is_public_address("2606:2800:220:1::"))

    def test_garbage_is_not_public(self):
        """Fails closed — an address we cannot parse is never allowed."""
        self.assertFalse(is_public_address("not-an-ip"))
        self.assertFalse(is_public_address(""))


class AssertUrlIsSafeTests(TestCase):
    """The whole-URL check: scheme, port, host."""

    def test_allows_a_public_https_url(self):
        parsed = assert_url_is_safe(
            "https://files.example.com/cv.pdf", resolver=resolver_returning(PUBLIC_IP)
        )
        self.assertEqual(parsed.hostname, "files.example.com")

    def test_rejects_non_http_schemes(self):
        for url in (
            "ftp://example.com/cv.pdf",
            "file:///etc/passwd",
            "gopher://example.com:6379/_SET%20x%20y",
        ):
            with self.subTest(url=url):
                with self.assertRaises(UnsafeURLError):
                    assert_url_is_safe(url, resolver=resolver_returning(PUBLIC_IP))

    def test_rejects_internal_service_ports(self):
        """Restricting the port is what keeps the fetcher away from Redis etc."""
        for port in (22, 3306, 5432, 6379, 8000, 9200):
            with self.subTest(port=port):
                with self.assertRaises(UnsafeURLError):
                    assert_url_is_safe(
                        f"http://files.example.com:{port}/cv.pdf",
                        resolver=resolver_returning(PUBLIC_IP),
                    )

    def test_allows_explicit_web_ports(self):
        for port in sorted(ALLOWED_PORTS):
            with self.subTest(port=port):
                assert_url_is_safe(
                    f"http://files.example.com:{port}/cv.pdf",
                    resolver=resolver_returning(PUBLIC_IP),
                )

    def test_rejects_literal_internal_addresses(self):
        for url in (
            "http://127.0.0.1/cv.pdf",
            "http://127.0.0.1:80/cv.pdf",
            "http://169.254.169.254/latest/meta-data/",
            "http://10.0.0.1/cv.pdf",
            "http://[::1]/cv.pdf",
            "http://0.0.0.0/cv.pdf",
        ):
            with self.subTest(url=url):
                with self.assertRaises(UnsafeURLError):
                    assert_url_is_safe(url)

    def test_rejects_a_hostname_that_resolves_internally(self):
        """The classic bypass: a public name with a 127.0.0.1 A record."""
        with self.assertRaises(UnsafeURLError):
            assert_url_is_safe(
                "http://evil.example.com/cv.pdf",
                resolver=resolver_returning("127.0.0.1"),
            )

    def test_rejects_when_any_resolved_address_is_internal(self):
        """One public record must not launder the internal one alongside it."""
        with self.assertRaises(UnsafeURLError):
            assert_url_is_safe(
                "http://mixed.example.com/cv.pdf",
                resolver=resolver_returning(PUBLIC_IP, "169.254.169.254"),
            )

    def test_rejects_url_without_a_host(self):
        with self.assertRaises(UnsafeURLError):
            assert_url_is_safe("http:///cv.pdf")

    def test_rejects_empty_input(self):
        for value in ("", None, 42):
            with self.subTest(value=value):
                with self.assertRaises(UnsafeURLError):
                    assert_url_is_safe(value)

    def test_reason_is_recorded_but_not_the_user_message(self):
        """The detail exists for logs; the message handed out stays generic."""
        with self.assertRaises(UnsafeURLError) as ctx:
            assert_url_is_safe("http://127.0.0.1/cv.pdf")

        self.assertIn("loopback", ctx.exception.reason)
        self.assertEqual(str(ctx.exception), GENERIC_REJECTION_MESSAGE)


class FakeResponse:
    """Minimal stand-in for a streaming ``requests`` response."""

    def __init__(self, status_code=200, headers=None, body=b"%PDF-1.4 fake"):
        self.status_code = status_code
        self.headers = headers or {}
        self._body = body
        self.closed = False

    @property
    def is_redirect(self):
        return self.status_code in (301, 302, 303, 307, 308) and "Location" in self.headers

    @property
    def is_permanent_redirect(self):
        return self.status_code in (301, 308)

    def iter_content(self, chunk_size=8192):
        for start in range(0, len(self._body), chunk_size):
            yield self._body[start : start + chunk_size]

    def close(self):
        self.closed = True


class RedirectGuardTests(TestCase):
    """A redirect must not be a way around the address check."""

    def test_follows_a_redirect_between_public_hosts(self):
        responses = [
            FakeResponse(302, {"Location": f"http://{PUBLIC_IP}/final.pdf"}),
            FakeResponse(200),
        ]

        with patch("analyzer.url_fetcher.requests.get", side_effect=responses) as mock_get:
            result = fetch_with_redirect_guard(f"http://{PUBLIC_IP}/start.pdf", headers={})

        self.assertEqual(result.status_code, 200)
        self.assertEqual(mock_get.call_count, 2)
        # Redirects must be walked by us, not by requests.
        self.assertFalse(mock_get.call_args_list[0].kwargs["allow_redirects"])

    def test_blocks_a_redirect_into_the_metadata_service(self):
        """Public host on hop 1, 169.254.169.254 on hop 2."""
        responses = [
            FakeResponse(302, {"Location": "http://169.254.169.254/latest/meta-data/"}),
            FakeResponse(200, body=b"secret-credentials"),
        ]

        with patch("analyzer.url_fetcher.requests.get", side_effect=responses) as mock_get:
            with self.assertRaises(UnsafeURLError):
                fetch_with_redirect_guard(f"http://{PUBLIC_IP}/start.pdf", headers={})

        # The second request must never have been made.
        self.assertEqual(mock_get.call_count, 1)

    def test_blocks_a_redirect_to_loopback(self):
        responses = [FakeResponse(302, {"Location": "http://127.0.0.1:6379/"})]

        with patch("analyzer.url_fetcher.requests.get", side_effect=responses):
            with self.assertRaises(UnsafeURLError):
                fetch_with_redirect_guard(f"http://{PUBLIC_IP}/start.pdf", headers={})

    def test_resolves_a_relative_redirect_against_the_current_url(self):
        responses = [
            FakeResponse(302, {"Location": "/elsewhere.pdf"}),
            FakeResponse(200),
        ]

        with patch("analyzer.url_fetcher.requests.get", side_effect=responses) as mock_get:
            fetch_with_redirect_guard(f"http://{PUBLIC_IP}/start.pdf", headers={})

        self.assertEqual(
            mock_get.call_args_list[1].args[0], f"http://{PUBLIC_IP}/elsewhere.pdf"
        )

    def test_gives_up_on_a_redirect_loop(self):
        looping = [
            FakeResponse(302, {"Location": f"http://{PUBLIC_IP}/loop"})
            for _ in range(MAX_REDIRECTS + 2)
        ]

        with patch("analyzer.url_fetcher.requests.get", side_effect=looping):
            with self.assertRaises(UnsafeURLError):
                fetch_with_redirect_guard(f"http://{PUBLIC_IP}/loop", headers={})

    def test_redirect_without_a_location_is_rejected(self):
        with patch("analyzer.url_fetcher.requests.get", return_value=FakeResponse(302)):
            # No Location header, so is_redirect is False and it is treated as a
            # plain response rather than followed into nowhere.
            result = fetch_with_redirect_guard(f"http://{PUBLIC_IP}/x.pdf", headers={})
        self.assertEqual(result.status_code, 302)


class DownloadEntryPointTests(TestCase):
    """End-to-end behaviour of the function the views actually call."""

    def test_internal_url_is_refused_with_the_generic_message(self):
        with patch("analyzer.url_fetcher.requests.get") as mock_get:
            with self.assertRaises(ValueError) as ctx:
                download_and_validate_url("http://127.0.0.1:6379/")

        self.assertEqual(str(ctx.exception), GENERIC_REJECTION_MESSAGE)
        # Nothing was fetched — the guard ran before any connection.
        mock_get.assert_not_called()

    def test_metadata_endpoint_is_refused(self):
        with patch("analyzer.url_fetcher.requests.get") as mock_get:
            with self.assertRaises(ValueError):
                download_and_validate_url(
                    "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
                )

        mock_get.assert_not_called()

    def test_error_message_does_not_reveal_what_was_reachable(self):
        """A 404 and a refused connection must read identically."""
        with patch(
            "analyzer.url_fetcher.requests.get", return_value=FakeResponse(404)
        ):
            with self.assertRaises(ValueError) as not_found:
                download_and_validate_url(f"http://{PUBLIC_IP}/missing.pdf")

        import requests as requests_lib

        with patch(
            "analyzer.url_fetcher.requests.get",
            side_effect=requests_lib.exceptions.ConnectionError("port 6379 refused"),
        ):
            with self.assertRaises(ValueError) as refused:
                download_and_validate_url(f"http://{PUBLIC_IP}/missing.pdf")

        self.assertEqual(str(not_found.exception), str(refused.exception))
        self.assertNotIn("6379", str(refused.exception))

    def test_non_http_scheme_still_reports_the_scheme_problem(self):
        """Kept specific: it is user error, and says nothing about our network."""
        with self.assertRaises(ValueError) as ctx:
            download_and_validate_url("ftp://example.com/file.pdf")

        self.assertIn("valid URL starting with http", str(ctx.exception))
