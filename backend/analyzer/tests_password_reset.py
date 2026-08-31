"""Tests for password reset delivery and the password policy.

Two things were broken here. The request endpoint ``print()``ed the reset link
to the server console and never called ``send_mail``, so on a deployed instance
the link went somewhere the user could not read. And the confirm endpoint
passed whatever it was given straight to ``set_password()``, which does not
validate — so ``"1"`` worked, ``"password"`` worked, and omitting the field
entirely set an unusable password while answering "Password has been reset
successfully", locking the account for good.
"""

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.serializers import SignupSerializer
from analyzer.views import (
    PASSWORD_RESET_REQUESTED_MESSAGE,
    PasswordResetRequestThrottle,
    build_password_reset_link,
)

#: Long, not in the common-password list, not all digits.
GOOD_PASSWORD = "correct-horse-battery-42"


def reset_credentials(user):
    """Return the ``(uid, token)`` pair a reset link carries."""
    return (
        urlsafe_base64_encode(force_bytes(user.pk)),
        default_token_generator.make_token(user),
    )


@override_settings(
    # The throttles are keyed in the cache; a shared one would leak counts
    # between tests and make them order-dependent.
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class PasswordResetRequestTests(TestCase):
    def setUp(self):
        cache.clear()
        mail.outbox = []
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="resetme", password=GOOD_PASSWORD, email="resetme@example.com"
        )

    def test_sends_an_email_to_the_account(self):
        """It used to print to stdout and send nothing."""
        resp = self.client.post(
            "/api/password-reset/", {"username": "resetme"}, format="json"
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["resetme@example.com"])

    def test_the_email_contains_a_working_reset_link(self):
        self.client.post("/api/password-reset/",
                         {"username": "resetme"}, format="json")

        uid, _ = reset_credentials(self.user)
        self.assertIn(f"/reset-password/{uid}/", mail.outbox[0].body)

    @override_settings(FRONTEND_URL="https://resume.example.com")
    def test_the_link_uses_the_configured_frontend_url(self):
        """It was hardcoded to http://localhost:5173 wherever this ran."""
        link = build_password_reset_link(self.user)

        self.assertTrue(link.startswith(
            "https://resume.example.com/reset-password/"))
        self.assertNotIn("localhost", link)

    @override_settings(FRONTEND_URL="https://resume.example.com/")
    def test_a_trailing_slash_does_not_double_up(self):
        self.assertNotIn("//reset-password",
                         build_password_reset_link(self.user))

    def test_unknown_username_gets_the_same_answer(self):
        """The reply must not reveal whether an account exists."""
        known = self.client.post(
            "/api/password-reset/", {"username": "resetme"}, format="json"
        )
        unknown = self.client.post(
            "/api/password-reset/", {"username": "nobody-here"}, format="json"
        )

        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(unknown.data["message"],
                         PASSWORD_RESET_REQUESTED_MESSAGE)

    def test_no_email_is_sent_for_an_unknown_username(self):
        self.client.post(
            "/api/password-reset/", {"username": "nobody-here"}, format="json"
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_account_without_an_email_address_is_handled_quietly(self):
        """Signup only collects a username, so this is a common case."""
        User.objects.create_user(username="noaddress", password=GOOD_PASSWORD)

        resp = self.client.post(
            "/api/password-reset/", {"username": "noaddress"}, format="json"
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["message"],
                         PASSWORD_RESET_REQUESTED_MESSAGE)
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_username_does_not_error(self):
        resp = self.client.post("/api/password-reset/", {}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_requests_are_throttled(self):
        """Unlimited requests meant unlimited outbound mail.

        Run against the rate actually configured rather than an overridden one,
        so this also fails if the setting is later removed or set to something
        meaningless.
        """
        throttle = PasswordResetRequestThrottle()
        allowed = throttle.num_requests
        self.assertIsNotNone(
            allowed, "password_reset throttle rate is not configured")

        for attempt in range(allowed):
            resp = self.client.post(
                "/api/password-reset/", {"username": "resetme"}, format="json"
            )
            self.assertEqual(
                resp.status_code, status.HTTP_200_OK, f"blocked early on {attempt}"
            )

        blocked = self.client.post(
            "/api/password-reset/", {"username": "resetme"}, format="json"
        )
        self.assertEqual(blocked.status_code,
                         status.HTTP_429_TOO_MANY_REQUESTS)

    def test_the_configured_rate_is_not_absurdly_high(self):
        """A 10000/hour ceiling would be the same as having none."""
        throttle = PasswordResetRequestThrottle()
        self.assertLessEqual(throttle.num_requests, 60)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
)
class PasswordResetConfirmTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="resetme", password=GOOD_PASSWORD, email="resetme@example.com"
        )

    def confirm(self, **overrides):
        uid, token = reset_credentials(self.user)
        body = {"uid": uid, "token": token, "new_password": GOOD_PASSWORD}
        body.update(overrides)
        return self.client.post("/api/password-reset-confirm/", body, format="json")

    def test_sets_a_valid_new_password(self):
        resp = self.confirm(new_password="a-brand-new-secret-99")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("a-brand-new-secret-99"))

    def test_rejects_an_invalid_token(self):
        resp = self.confirm(token="not-a-real-token")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(GOOD_PASSWORD))

    def test_a_token_cannot_be_reused(self):
        """Django's token generator keys on the password hash."""
        first = self.confirm(new_password="a-brand-new-secret-99")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        uid, token = reset_credentials(self.user)  # minted from the old hash
        self.user.refresh_from_db()
        replay = self.client.post(
            "/api/password-reset-confirm/",
            {"uid": uid, "token": token, "new_password": "yet-another-secret-77"},
            format="json",
        )
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_password_no_longer_locks_the_account(self):
        """The headline bug: set_password(None) marks the password unusable.

        The old code answered 200 "Password has been reset successfully" and
        left the account permanently unable to log in.
        """
        resp = self.confirm(new_password=None)

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", resp.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.has_usable_password())
        self.assertTrue(self.user.check_password(GOOD_PASSWORD))

    def test_empty_password_is_rejected(self):
        resp = self.confirm(new_password="")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(GOOD_PASSWORD))

    def test_rejects_a_one_character_password(self):
        resp = self.confirm(new_password="1")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", resp.data)

    def test_rejects_a_common_password(self):
        """CommonPasswordValidator is configured; it just was not being run."""
        resp = self.confirm(new_password="password")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", resp.data)

    def test_rejects_an_all_numeric_password(self):
        resp = self.confirm(new_password="98765432109")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", resp.data)

    def test_rejects_a_password_too_similar_to_the_username(self):
        resp = self.confirm(new_password="resetme")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", resp.data)

    def test_validation_errors_are_readable(self):
        """The UI renders these, so they must be sentences, not codes."""
        resp = self.confirm(new_password="1")

        messages = resp.data["new_password"]
        self.assertIsInstance(messages, list)
        self.assertTrue(all(isinstance(m, str) for m in messages))
        self.assertTrue(any("too short" in m.lower() for m in messages))

    def test_an_invalid_token_is_reported_before_the_password_is_checked(self):
        """A bad link must not become a way to probe the password policy."""
        resp = self.confirm(token="not-a-real-token", new_password="1")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)
        self.assertNotIn("new_password", resp.data)


class SignupPasswordPolicyTests(TestCase):
    """Signup and reset must agree on what a valid password is.

    Exercises SignupSerializer directly rather than POSTing to /api/auth/signup/.
    The endpoint also gates on a CAPTCHA, which is a separate concern with its
    own tests; going through it would make these fail for the wrong reason the
    moment that check changes, and would obscure which rule actually rejected
    the password.
    """

    def _errors_for(self, password, username="brandnew"):
        serializer = SignupSerializer(
            data={"username": username, "password": password})
        is_valid = serializer.is_valid()
        return is_valid, serializer.errors

    def test_accepts_a_strong_password(self):
        is_valid, errors = self._errors_for(GOOD_PASSWORD)

        self.assertTrue(is_valid, errors)

    def test_rejects_a_common_password(self):
        """`password123` passed the old min_length=6 check."""
        is_valid, errors = self._errors_for("password123")

        self.assertFalse(is_valid)
        self.assertIn("password", errors)

    def test_rejects_an_all_numeric_password(self):
        is_valid, errors = self._errors_for("29384756102")

        self.assertFalse(is_valid)
        self.assertIn("password", errors)

    def test_rejects_a_password_similar_to_the_username(self):
        is_valid, errors = self._errors_for("brandnew1", username="brandnew")

        self.assertFalse(is_valid)
        self.assertIn("password", errors)

    def test_rejects_a_short_password(self):
        is_valid, errors = self._errors_for("ab3!x")

        self.assertFalse(is_valid)
        self.assertIn("password", errors)

    def test_a_valid_password_actually_creates_the_user(self):
        serializer = SignupSerializer(
            data={"username": "brandnew", "password": GOOD_PASSWORD})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertTrue(User.objects.filter(username="brandnew").exists())
