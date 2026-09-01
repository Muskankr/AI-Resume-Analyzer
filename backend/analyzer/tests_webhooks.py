"""Tests for webhook registration and delivery.

Three separate things were wrong and each gets its own coverage here:

* the model had no migration, so the table did not exist;
* the views had no route, so nothing could reach them;
* the delivery URL was never validated, so the endpoint aimed the server's
  HTTP client wherever the caller liked.

Nothing here opens a socket. :func:`analyzer.webhook_utils.deliver` is exercised
with ``requests.post`` patched, and the SSRF rules are exercised through the
injectable resolver that :mod:`analyzer.url_safety` already provides.
"""

import hashlib
import hmac
import json
from unittest.mock import patch

import requests
from django.contrib.auth.models import User
from django.db.utils import IntegrityError
from django.test import TestCase
from django.urls import resolve, reverse
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import Webhook
from analyzer.webhook_utils import (
    EVENT_HEADER,
    SIGNATURE_HEADER,
    TIMESTAMP_HEADER,
    build_payload,
    deliver,
    sign_payload,
    summarize_analysis,
    trigger_webhooks_for_user,
)


def _response(status_code=200):
    """A stand-in for what ``requests.post`` returns."""
    return type(
        "FakeResponse",
        (),
        {
            "status_code": status_code,
            "raw": type("Raw", (), {"read": staticmethod(lambda *a, **k: b"")})(),
            "close": lambda self: None,
        },
    )()


class WebhookRoutingTests(TestCase):
    """The endpoints existed as functions but were never published.

    `resolve()` is checked against `url_name` rather than `func.__name__`:
    `@api_view` returns a wrapper whose `__name__` is always "view", so
    comparing the function name would pass for any routed DRF view at all.
    """

    def test_collection_route_resolves(self):
        self.assertEqual(resolve("/api/webhooks/").url_name, "manage_webhooks")

    def test_detail_route_resolves(self):
        self.assertEqual(resolve("/api/webhooks/1/").url_name,
                         "webhook_detail")

    def test_test_delivery_route_resolves(self):
        self.assertEqual(
            resolve("/api/webhooks/1/test/").url_name, "test_webhook")

    def test_routes_are_named(self):
        self.assertEqual(reverse("manage_webhooks"), "/api/webhooks/")
        self.assertEqual(
            reverse("webhook_detail", args=[7]), "/api/webhooks/7/")
        self.assertEqual(reverse("test_webhook", args=[
                         7]), "/api/webhooks/7/test/")


class WebhookModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="hooks", password="password123")

    def test_table_exists_and_user_deletion_cascades(self):
        """The regression the missing migration caused, pinned directly.

        `User.delete()` cascades into analyzer_webhook. With no migration this
        raised OperationalError, which showed up as an unrelated unsubscribe
        test failing.
        """
        Webhook.objects.create(user=self.user, url="https://example.com/hook")
        self.user.delete()
        self.assertEqual(Webhook.objects.count(), 0)

    def test_each_webhook_gets_its_own_secret(self):
        first = Webhook.objects.create(
            user=self.user, url="https://example.com/a")
        second = Webhook.objects.create(
            user=self.user, url="https://example.com/b")

        self.assertEqual(len(first.secret), 64)
        self.assertNotEqual(first.secret, second.secret)

    def test_same_url_cannot_be_registered_twice_by_one_user(self):
        Webhook.objects.create(user=self.user, url="https://example.com/hook")
        with self.assertRaises(IntegrityError):
            Webhook.objects.create(
                user=self.user, url="https://example.com/hook")

    def test_two_users_may_share_a_url(self):
        other = User.objects.create_user(
            username="other", password="password123")
        Webhook.objects.create(user=self.user, url="https://example.com/hook")
        Webhook.objects.create(user=other, url="https://example.com/hook")
        self.assertEqual(Webhook.objects.count(), 2)

    def test_success_clears_the_failure_count(self):
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")
        hook.record_failure("boom")
        hook.record_success(200)

        hook.refresh_from_db()
        self.assertEqual(hook.consecutive_failures, 0)
        self.assertEqual(hook.last_status_code, 200)
        self.assertEqual(hook.last_error, "")

    def test_repeated_failures_disable_the_webhook(self):
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")

        for _ in range(Webhook.MAX_CONSECUTIVE_FAILURES - 1):
            hook.record_failure("still down")
        hook.refresh_from_db()
        self.assertTrue(hook.is_active)

        hook.record_failure("still down")
        hook.refresh_from_db()
        self.assertFalse(hook.is_active)

    def test_a_long_error_is_truncated_rather_than_rejected(self):
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")
        hook.record_failure("x" * 5000)
        hook.refresh_from_db()
        self.assertEqual(len(hook.last_error), 255)


class WebhookSigningTests(TestCase):
    def test_signature_matches_an_independent_computation(self):
        body = b'{"event":"ping"}'
        signature = sign_payload("s3cret", "1700000000", body)

        expected = hmac.new(
            b"s3cret", b"1700000000." + body, hashlib.sha256
        ).hexdigest()
        self.assertEqual(signature, f"sha256={expected}")

    def test_signature_changes_with_the_timestamp(self):
        body = b'{"event":"ping"}'
        self.assertNotEqual(
            sign_payload("s3cret", "1700000000", body),
            sign_payload("s3cret", "1700000001", body),
        )

    def test_signature_changes_with_the_body(self):
        self.assertNotEqual(
            sign_payload("s3cret", "1700000000", b'{"a":1}'),
            sign_payload("s3cret", "1700000000", b'{"a":2}'),
        )

    def test_a_different_secret_produces_a_different_signature(self):
        body = b'{"event":"ping"}'
        self.assertNotEqual(
            sign_payload("one", "1700000000", body),
            sign_payload("two", "1700000000", body),
        )

    def test_payload_envelope_carries_event_and_timestamp(self):
        payload = build_payload("ping", {"hello": "world"})
        self.assertEqual(payload["event"], "ping")
        self.assertEqual(payload["data"], {"hello": "world"})
        self.assertIn("sent_at", payload)


class WebhookPayloadTests(TestCase):
    """The delivered payload must not contain the resume itself."""

    ANALYSIS = {
        "id": 7,
        "score": 81,
        "target_role": "Backend Developer",
        "skills_found": ["python", "django"],
        "matched_skills": ["python"],
        "missing_skills": ["docker"],
        "suggestions": ["Add projects or experience with Docker"],
        "readability_label": "moderate",
        "resume_text": "SECRET RESUME BODY, home address, phone number",
        "cover_letter_text": "Dear hiring manager",
        "job_description": "confidential internal posting",
    }

    def test_summary_keeps_the_useful_fields(self):
        summary = summarize_analysis(self.ANALYSIS)
        self.assertEqual(summary["analysis_id"], 7)
        self.assertEqual(summary["score"], 81)
        self.assertEqual(summary["target_role"], "Backend Developer")
        self.assertEqual(summary["suggestion_count"], 1)

    def test_summary_drops_the_resume_and_cover_letter_text(self):
        serialized = json.dumps(summarize_analysis(self.ANALYSIS))
        self.assertNotIn("SECRET RESUME BODY", serialized)
        self.assertNotIn("Dear hiring manager", serialized)
        self.assertNotIn("confidential internal posting", serialized)

    def test_a_non_dict_result_summarizes_to_empty(self):
        self.assertEqual(summarize_analysis(None), {})


class WebhookDeliveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="hooks", password="password123")
        self.hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook"
        )

    @patch("analyzer.webhook_utils.assert_url_is_safe")
    @patch("analyzer.webhook_utils.requests.post")
    def test_successful_delivery_is_signed_and_recorded(self, mock_post, _safe):
        mock_post.return_value = _response(200)

        self.assertTrue(deliver(self.hook, "ping", {"hello": "world"}))

        _, kwargs = mock_post.call_args
        headers = kwargs["headers"]
        body = kwargs["data"]

        # The signature must cover the exact bytes sent, so `data=` is used
        # rather than `json=` — this asserts the two have not drifted apart.
        self.assertEqual(
            headers[SIGNATURE_HEADER],
            sign_payload(self.hook.secret, headers[TIMESTAMP_HEADER], body),
        )
        self.assertEqual(headers[EVENT_HEADER], "ping")
        self.assertEqual(json.loads(body)["data"], {"hello": "world"})

        self.hook.refresh_from_db()
        self.assertEqual(self.hook.last_status_code, 200)
        self.assertEqual(self.hook.consecutive_failures, 0)

    @patch("analyzer.webhook_utils.assert_url_is_safe")
    @patch("analyzer.webhook_utils.requests.post")
    def test_redirects_are_not_followed(self, mock_post, _safe):
        mock_post.return_value = _response(200)
        deliver(self.hook, "ping", {})
        self.assertFalse(mock_post.call_args.kwargs["allow_redirects"])

    @patch("analyzer.webhook_utils.assert_url_is_safe")
    @patch("analyzer.webhook_utils.requests.post")
    def test_an_error_status_counts_as_a_failure(self, mock_post, _safe):
        mock_post.return_value = _response(500)

        self.assertFalse(deliver(self.hook, "ping", {}))

        self.hook.refresh_from_db()
        self.assertEqual(self.hook.last_status_code, 500)
        self.assertEqual(self.hook.consecutive_failures, 1)
        self.assertIn("500", self.hook.last_error)

    @patch("analyzer.webhook_utils.assert_url_is_safe")
    @patch("analyzer.webhook_utils.requests.post")
    def test_a_connection_error_is_recorded_not_raised(self, mock_post, _safe):
        mock_post.side_effect = requests.ConnectionError("no route to host")

        self.assertFalse(deliver(self.hook, "ping", {}))

        self.hook.refresh_from_db()
        self.assertEqual(self.hook.consecutive_failures, 1)
        self.assertIn("no route to host", self.hook.last_error)

    @patch("analyzer.webhook_utils.requests.post")
    def test_an_internal_destination_is_never_contacted(self, mock_post):
        """The SSRF case, checked at delivery time rather than only at write.

        A hostname that resolved to a public address when it was registered can
        resolve to loopback later, so validation runs immediately before the
        request — and when it fails, no request is made at all.
        """
        self.hook.url = "http://127.0.0.1:6379/"
        self.hook.save(update_fields=["url"])

        self.assertFalse(deliver(self.hook, "ping", {}))

        mock_post.assert_not_called()
        self.hook.refresh_from_db()
        self.assertIn("not allowed", self.hook.last_error)

    @patch("analyzer.webhook_utils.requests.post")
    def test_cloud_metadata_is_never_contacted(self, mock_post):
        self.hook.url = "http://169.254.169.254/latest/meta-data/"
        self.hook.save(update_fields=["url"])

        self.assertFalse(deliver(self.hook, "ping", {}))
        mock_post.assert_not_called()

    @patch("analyzer.webhook_utils.assert_url_is_safe")
    @patch("analyzer.webhook_utils.requests.post")
    def test_inactive_webhooks_are_not_queued(self, mock_post, _safe):
        self.hook.is_active = False
        self.hook.save(update_fields=["is_active"])

        with patch("analyzer.tasks.deliver_webhook_task.delay") as mock_delay:
            queued = trigger_webhooks_for_user(
                self.user, {"id": 1, "score": 50})

        self.assertEqual(queued, 0)
        mock_delay.assert_not_called()

    def test_active_webhooks_are_queued_once_each(self):
        Webhook.objects.create(
            user=self.user, url="https://example.com/second")

        with patch("analyzer.tasks.deliver_webhook_task.delay") as mock_delay:
            queued = trigger_webhooks_for_user(
                self.user, {"id": 1, "score": 50})

        self.assertEqual(queued, 2)
        self.assertEqual(mock_delay.call_count, 2)
        self.assertEqual(
            mock_delay.call_args.kwargs["event"], Webhook.EVENT_ANALYSIS_COMPLETED
        )

    def test_anonymous_analyses_queue_nothing(self):
        with patch("analyzer.tasks.deliver_webhook_task.delay") as mock_delay:
            self.assertEqual(trigger_webhooks_for_user(None, {"id": 1}), 0)
        mock_delay.assert_not_called()


class WebhookAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="hooks", password="password123")
        self.other = User.objects.create_user(
            username="other", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_registration_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get("/api/webhooks/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_and_list(self):
        resp = self.client.post(
            "/api/webhooks/",
            {"url": "https://example.com/hook", "description": "CI collector"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["url"], "https://example.com/hook")

        listing = self.client.get("/api/webhooks/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)

    def test_the_secret_is_returned_once_and_never_again(self):
        created = self.client.post(
            "/api/webhooks/", {"url": "https://example.com/a"})
        self.assertIn("secret", created.data)
        self.assertEqual(len(created.data["secret"]), 64)

        listing = self.client.get("/api/webhooks/")
        self.assertNotIn("secret", listing.data[0])

        detail = self.client.get(f"/api/webhooks/{created.data['id']}/")
        self.assertNotIn("secret", detail.data)

    def test_a_loopback_destination_is_rejected_at_registration(self):
        resp = self.client.post(
            "/api/webhooks/", {"url": "http://127.0.0.1:6379/"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("url", resp.data)
        self.assertEqual(Webhook.objects.count(), 0)

    def test_cloud_metadata_is_rejected_at_registration(self):
        resp = self.client.post(
            "/api/webhooks/", {"url": "http://169.254.169.254/latest/meta-data/"}
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Webhook.objects.count(), 0)

    def test_a_non_http_scheme_is_rejected(self):
        resp = self.client.post(
            "/api/webhooks/", {"url": "file:///etc/passwd"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Webhook.objects.count(), 0)

    def test_a_non_web_port_is_rejected(self):
        resp = self.client.post(
            "/api/webhooks/", {"url": "http://example.com:5432/"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_missing_url_is_rejected(self):
        resp = self.client.post("/api/webhooks/", {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("url", resp.data)

    def test_a_duplicate_url_is_rejected_with_a_message(self):
        self.client.post("/api/webhooks/", {"url": "https://example.com/hook"})
        resp = self.client.post(
            "/api/webhooks/", {"url": "https://example.com/hook"})

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already registered", str(resp.data["url"]))

    def test_the_per_user_limit_is_enforced(self):
        from analyzer.views import MAX_WEBHOOKS_PER_USER

        for index in range(MAX_WEBHOOKS_PER_USER):
            Webhook.objects.create(
                user=self.user, url=f"https://example.com/{index}")

        resp = self.client.post(
            "/api/webhooks/", {"url": "https://example.com/extra"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at most", resp.data["detail"])

    def test_a_user_only_sees_their_own_webhooks(self):
        Webhook.objects.create(
            user=self.other, url="https://example.com/theirs")
        Webhook.objects.create(user=self.user, url="https://example.com/mine")

        listing = self.client.get("/api/webhooks/")
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(listing.data[0]["url"], "https://example.com/mine")

    def test_another_users_webhook_reads_as_missing(self):
        theirs = Webhook.objects.create(
            user=self.other, url="https://example.com/theirs"
        )

        self.assertEqual(
            self.client.get(f"/api/webhooks/{theirs.pk}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(f"/api/webhooks/{theirs.pk}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertTrue(Webhook.objects.filter(pk=theirs.pk).exists())

    def test_delete_removes_the_webhook(self):
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")
        resp = self.client.delete(f"/api/webhooks/{hook.pk}/")

        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Webhook.objects.filter(pk=hook.pk).exists())

    def test_patch_can_reenable_a_disabled_webhook_and_clears_the_strikes(self):
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")
        for _ in range(Webhook.MAX_CONSECUTIVE_FAILURES):
            hook.record_failure("down")
        hook.refresh_from_db()
        self.assertFalse(hook.is_active)

        resp = self.client.patch(
            f"/api/webhooks/{hook.pk}/", {"is_active": True})

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        hook.refresh_from_db()
        self.assertTrue(hook.is_active)
        self.assertEqual(hook.consecutive_failures, 0)

    def test_patch_cannot_move_a_webhook_to_an_internal_address(self):
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")
        resp = self.client.patch(
            f"/api/webhooks/{hook.pk}/", {"url": "http://127.0.0.1:6379/"}
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        hook.refresh_from_db()
        self.assertEqual(hook.url, "https://example.com/hook")

    def test_status_is_reported_on_the_listing(self):
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")
        hook.record_failure("Receiver returned HTTP 502", status_code=502)

        listing = self.client.get("/api/webhooks/")
        self.assertEqual(listing.data[0]["status"]["last_status_code"], 502)
        self.assertEqual(listing.data[0]["status"]["consecutive_failures"], 1)

    @patch("analyzer.webhook_utils.assert_url_is_safe")
    @patch("analyzer.webhook_utils.requests.post")
    def test_test_delivery_reports_the_outcome(self, mock_post, _safe):
        mock_post.return_value = _response(200)
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")

        resp = self.client.post(f"/api/webhooks/{hook.pk}/test/")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["delivered"])
        self.assertEqual(resp.data["status"]["last_status_code"], 200)
        self.assertEqual(
            mock_post.call_args.kwargs["headers"][EVENT_HEADER], "ping")

    @patch("analyzer.webhook_utils.assert_url_is_safe")
    @patch("analyzer.webhook_utils.requests.post")
    def test_a_failing_test_delivery_reports_rather_than_errors(self, mock_post, _safe):
        mock_post.return_value = _response(503)
        hook = Webhook.objects.create(
            user=self.user, url="https://example.com/hook")

        resp = self.client.post(f"/api/webhooks/{hook.pk}/test/")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["delivered"])
        self.assertEqual(resp.data["status"]["last_status_code"], 503)
