"""Safety checks for outbound fetches of user-supplied URLs.

``/api/upload/`` and ``/api/compare-bulk-jds/`` both let a caller hand us a link
instead of a file, and both are ``AllowAny``. That makes the backend an HTTP
client that strangers get to aim. Without a check on where it may point, the
obvious targets are the ones only reachable from inside:

* ``127.0.0.1:6379`` — the Celery broker, which ``settings.CELERY_BROKER_URL``
  puts on localhost.
* ``127.0.0.1:8000`` — our own API, called from a source address it trusts.
* ``169.254.169.254`` — the instance metadata service on every major cloud,
  which hands out instance credentials to anything that asks.

This module answers one question — *may we fetch this URL?* — and is written to
be boring about it: an address is allowed only when it is a public one, on a
port the web actually uses, over a scheme we understand.

Redirects are the part that is easy to get wrong. Validating the submitted URL
and then letting the HTTP client follow a ``302`` is not a control at all: the
attacker submits a URL on a host they own and redirects it wherever they like.
:func:`assert_url_is_safe` therefore has to be re-run on every hop, which is why
:mod:`analyzer.url_fetcher` walks the chain itself with redirects disabled
rather than handing the job to ``requests``.

Known limitation, deliberately not solved here: a host whose DNS record changes
between our lookup and the one ``requests`` does when it opens the socket can
still slip past (DNS rebinding). Closing that means pinning the validated
address into the connection, which means either a custom transport adapter or
losing certificate validation. That is a bigger change than this fix, and the
rebinding window is a much narrower path than the wide-open one being closed —
so it is recorded here rather than papered over.
"""

import ipaddress
import socket
from urllib.parse import urlparse

#: The only two schemes the fetcher understands. ``file://``, ``gopher://`` and
#: friends are classic SSRF pivots and have no business here.
ALLOWED_SCHEMES = ("http", "https")

#: Ports a public document link plausibly lives on. Restricting this is what
#: stops the fetcher being aimed at Redis (6379), Postgres (5432), an internal
#: admin panel on 8000, and so on.
ALLOWED_PORTS = frozenset({80, 443})

#: How many hops the redirect chain may take before we stop following it.
MAX_REDIRECTS = 5

#: One message for every rejection. The old code returned a different error for
#: 401/403, for 404 and for everything else, which turned the endpoint into a
#: usable port scanner — the error text told you what was listening. Callers
#: get this single string instead, so a refusal reveals nothing about what is
#: or is not reachable from the server.
GENERIC_REJECTION_MESSAGE = (
    "That link could not be fetched. Please provide a public link to your "
    "resume that anyone can open — for example a Google Drive or Dropbox "
    "share link set to 'Anyone with the link can view'."
)


class UnsafeURLError(ValueError):
    """Raised when a URL may not be fetched.

    Subclasses ``ValueError`` because both callers in ``views.py`` already turn
    a ``ValueError`` from the fetcher into a 400 with the message attached.
    """

    def __init__(self, message=GENERIC_REJECTION_MESSAGE, reason=""):
        super().__init__(message)
        #: Why it was actually rejected. Never sent to the caller — it exists so
        #: an operator reading logs, or a test, can tell the cases apart.
        self.reason = reason or message


def _describe(ip):
    """Return the reason ``ip`` is not routable on the public internet, or ``None``.

    Checked in specificity order purely so the logged reason is the useful one;
    several of these overlap (loopback is also reserved, for instance).
    """
    if ip.is_unspecified:
        # 0.0.0.0 / :: — on many stacks a connection here lands on localhost.
        return "unspecified address"
    if ip.is_loopback:
        return "loopback address"
    if ip.is_link_local:
        # Covers 169.254.0.0/16, and so the cloud metadata endpoint.
        return "link-local address"
    if ip.is_multicast:
        return "multicast address"
    if ip.is_private:
        # RFC 1918 for v4, plus unique-local fc00::/7 for v6.
        return "private address"
    if ip.is_reserved:
        return "reserved address"
    return None


def _unwrap(ip):
    """Return the address a v6 wrapper is really pointing at.

    ``::ffff:127.0.0.1`` and ``2002:7f00:1::`` are IPv4 loopback wearing a v6
    hat. Python reports neither as ``is_loopback``, so without unwrapping them
    they would sail through :func:`_describe`.
    """
    mapped = getattr(ip, "ipv4_mapped", None)
    if mapped is not None:
        return mapped

    sixtofour = getattr(ip, "sixtofour", None)
    if sixtofour is not None:
        return sixtofour

    teredo = getattr(ip, "teredo", None)
    if teredo:
        # (server, client) — the client half is the interesting one.
        return teredo[1]

    return ip


def is_public_address(raw_ip):
    """Return ``True`` when ``raw_ip`` is a public, routable address.

    Accepts a string or an ``ipaddress`` object. Anything unparseable is
    treated as not public — failing closed is the only safe direction here.
    """
    try:
        ip = ipaddress.ip_address(raw_ip) if isinstance(raw_ip, str) else raw_ip
    except ValueError:
        return False

    return _describe(_unwrap(ip)) is None


def resolve_host(hostname, port):
    """Return every IP ``hostname`` resolves to.

    All of them are checked, not just the first. A name with several A records
    — or one that resolves differently on each lookup — would otherwise only
    have to get one public address in front of the check to pass it.
    """
    try:
        infos = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError, ValueError):
        raise UnsafeURLError(reason=f"could not resolve host {hostname!r}")

    addresses = []
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            continue
        try:
            addresses.append(ipaddress.ip_address(sockaddr[0]))
        except ValueError:
            continue

    if not addresses:
        raise UnsafeURLError(reason=f"host {hostname!r} resolved to no usable address")

    return addresses


def assert_url_is_safe(url, resolver=resolve_host):
    """Raise :class:`UnsafeURLError` unless ``url`` is safe to fetch.

    Returns the parsed URL on success, so callers that already need the parts
    do not have to parse it twice.

    ``resolver`` is injectable so tests can exercise the address rules without
    depending on live DNS.
    """
    if not url or not isinstance(url, str):
        raise UnsafeURLError(reason="empty url")

    try:
        parsed = urlparse(url.strip())
    except ValueError:
        raise UnsafeURLError(reason="url could not be parsed")

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise UnsafeURLError(reason=f"scheme {parsed.scheme!r} is not allowed")

    try:
        hostname = parsed.hostname
    except ValueError:
        # urlparse defers some malformed-host errors to attribute access.
        raise UnsafeURLError(reason="url has an invalid host")

    if not hostname:
        raise UnsafeURLError(reason="url has no host")

    try:
        port = parsed.port
    except ValueError:
        raise UnsafeURLError(reason="url has an invalid port")

    if port is None:
        port = 443 if parsed.scheme.lower() == "https" else 80

    if port not in ALLOWED_PORTS:
        raise UnsafeURLError(reason=f"port {port} is not allowed")

    # A literal IP in the URL skips DNS entirely, so check it directly rather
    # than round-tripping it through the resolver.
    try:
        literal = ipaddress.ip_address(hostname)
    except ValueError:
        literal = None

    if literal is not None:
        blocked = _describe(_unwrap(literal))
        if blocked:
            raise UnsafeURLError(reason=f"{hostname} is a {blocked}")
        return parsed

    for address in resolver(hostname, port):
        blocked = _describe(_unwrap(address))
        if blocked:
            raise UnsafeURLError(
                reason=f"{hostname} resolves to {address}, a {blocked}"
            )

    return parsed
