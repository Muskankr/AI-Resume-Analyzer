"""Tests for signed digest-unsubscribe links.

The endpoint used to unsubscribe whatever email address it was handed, and its
404-vs-200 responses said whether an account existed. These tests pin down both
the token flow and the fact that the response no longer varies with account
existence.
"""

from django.contrib.auth.models import User
from django.core import signing
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import UserProfile
from analyzer.tests import require_table
from analyzer.unsubscribe_tokens import (
    UNSUBSCRIBE_SALT,
    build_unsubscribe_url,
    make_unsubscribe_token,
    read_unsubscribe_token,
)


class UnsubscribeTokenTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tokenuser", password="password123", email="token@example.com"
        )

    def test_round_trips_to_the_same_user(self):
        token = make_unsubscribe_token(self.user)
        self.assertEqual(read_unsubscribe_token(token), self.user)

    def test_token_does_not_contain_the_email_address(self):
        """The whole point is to keep the address out of the URL."""
        self.assertNotIn("token@example.com",
                         make_unsubscribe_token(self.user))

    def test_rejects_a_tampered_token(self):
        token = make_unsubscribe_token(self.user)
        tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
        self.assertIsNone(read_unsubscribe_token(tampered))

    def test_rejects_an_expired_token(self):
        token = make_unsubscribe_token(self.user)
        self.assertIsNone(read_unsubscribe_token(token, max_age=-1))

    def test_rejects_a_token_signed_with_a_different_salt(self):
        """A signed value from elsewhere in the project must not work here."""
        foreign = signing.dumps({"uid": self.user.pk},
                                salt="some.other.purpose")
        self.assertIsNone(read_unsubscribe_token(foreign))

    def test_rejects_empty_and_malformed_input(self):
        for value in ("", None, "not-a-token", 12345):
            with self.subTest(value=value):
                self.assertIsNone(read_unsubscribe_token(value))

    def test_returns_none_when_the_user_no_longer_exists(self):
        # `User.delete()` cascades into `analyzer_webhook`, and that table has
        # no migration (#631), so this fails on the delete before it reaches
        # anything to do with unsubscribing. Guarded on the precondition rather
        # than marked expected-failure, so that it starts running by itself
        # whenever the migration lands, in either merge order.
        require_table(self, "analyzer_webhook", issue="#631")

        token = make_unsubscribe_token(self.user)
        self.user.delete()
        self.assertIsNone(read_unsubscribe_token(token))

    def test_salt_is_namespaced_to_unsubscribing(self):
        self.assertEqual(UNSUBSCRIBE_SALT, "analyzer.digest.unsubscribe")

    @override_settings(FRONTEND_URL="https://resume.example.com")
    def test_builds_a_link_pointing_at_the_configured_frontend(self):
        url = build_unsubscribe_url(self.user)
        self.assertTrue(url.startswith(
            "https://resume.example.com/unsubscribe?token="))
        self.assertNotIn("email=", url)

    @override_settings(FRONTEND_URL="https://resume.example.com/")
    def test_trailing_slash_does_not_double_up(self):
        self.assertNotIn("//unsubscribe", build_unsubscribe_url(self.user))

    @override_settings(UNSUBSCRIBE_TOKEN_MAX_AGE_DAYS=1)
    def test_lifetime_is_configurable(self):
        from analyzer.unsubscribe_tokens import get_max_age_seconds

        self.assertEqual(get_max_age_seconds(), 24 * 60 * 60)


class UnsubscribeEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="digestuser", password="password123", email="digest@example.com"
        )
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.profile.weekly_digest_opt_in = True
        self.profile.save()

        self.other = User.objects.create_user(
            username="victim", password="password123", email="victim@example.com"
        )
        self.other_profile, _ = UserProfile.objects.get_or_create(
            user=self.other)
        self.other_profile.weekly_digest_opt_in = True
        self.other_profile.save()

    def test_valid_token_unsubscribes(self):
        token = make_unsubscribe_token(self.user)
        response = self.client.get(f"/api/unsubscribe/?token={token}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unsubscribed_count"], 1)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.weekly_digest_opt_in)

    def test_token_works_by_post_as_well(self):
        response = self.client.post(
            "/api/unsubscribe/", {"token": make_unsubscribe_token(self.user)}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.weekly_digest_opt_in)

    def test_bare_email_no_longer_unsubscribes_anyone(self):
        """The reported problem: no proof of ownership was required."""
        response = self.client.get(
            "/api/unsubscribe/?email=victim@example.com")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.other_profile.refresh_from_db()
        self.assertTrue(self.other_profile.weekly_digest_opt_in)

    def test_bare_username_no_longer_unsubscribes_anyone(self):
        response = self.client.post(
            "/api/unsubscribe/", {"username": "victim"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.other_profile.refresh_from_db()
        self.assertTrue(self.other_profile.weekly_digest_opt_in)

    def test_one_users_token_cannot_unsubscribe_another(self):
        token = make_unsubscribe_token(self.user)
        self.client.get(f"/api/unsubscribe/?token={token}")

        self.other_profile.refresh_from_db()
        self.assertTrue(self.other_profile.weekly_digest_opt_in)

    def test_response_is_identical_for_known_and_unknown_addresses(self):
        """No status-code oracle for whether an account exists."""
        known = self.client.get("/api/unsubscribe/?email=digest@example.com")
        unknown = self.client.get(
            "/api/unsubscribe/?email=nobody-here@example.com")

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)

    def test_invalid_token_is_rejected_without_saying_why(self):
        response = self.client.get("/api/unsubscribe/?token=clearly-not-valid")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("no longer valid", response.data["error"])

    def test_expired_token_reads_the_same_as_an_invalid_one(self):
        with override_settings(UNSUBSCRIBE_TOKEN_MAX_AGE_DAYS=0):
            response = self.client.get(
                f"/api/unsubscribe/?token={make_unsubscribe_token(self.user)}"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.weekly_digest_opt_in)

    def test_authenticated_user_can_unsubscribe_without_a_token(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/unsubscribe/", {})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.weekly_digest_opt_in)

    def test_authenticated_user_cannot_unsubscribe_someone_else(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/unsubscribe/", {"email": "victim@example.com"})

        self.other_profile.refresh_from_db()
        self.assertTrue(self.other_profile.weekly_digest_opt_in)

    def test_unsubscribing_twice_still_reads_as_success(self):
        token = make_unsubscribe_token(self.user)
        self.client.get(f"/api/unsubscribe/?token={token}")
        second = self.client.get(f"/api/unsubscribe/?token={token}")

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data["already_unsubscribed"])
        self.assertEqual(second.data["unsubscribed_count"], 0)

    def test_missing_token_explains_what_to_do(self):
        response = self.client.get("/api/unsubscribe/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing its token", response.data["error"])


class WeeklyDigestLinkTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="subscriber", password="password123", email="sub@example.com"
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.weekly_digest_opt_in = True
        profile.save()

    def test_digest_email_carries_a_token_not_an_email_address(self):
        from django.core import mail

        call_command("send_weekly_digest")

        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn("/unsubscribe?token=", body)
        self.assertNotIn("/unsubscribe?email=", body)

    def test_the_link_in_the_email_actually_works(self):
        from django.core import mail

        call_command("send_weekly_digest")
        body = mail.outbox[0].body
        token = body.split("/unsubscribe?token=")[1].split()[0]

        response = APIClient().get(f"/api/unsubscribe/?token={token}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        profile = UserProfile.objects.get(user=self.user)
        self.assertFalse(profile.weekly_digest_opt_in)

    def test_dry_run_does_not_send_anything(self):
        """``options.get("dry-run")`` never matched argparse's "dry_run" key."""
        from django.core import mail

        call_command("send_weekly_digest", "--dry-run")

        self.assertEqual(len(mail.outbox), 0)
