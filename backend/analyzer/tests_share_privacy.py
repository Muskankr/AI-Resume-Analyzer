"""Tests for share-link privacy and lifecycle (#705).

Three separable claims are made by the change, and they are tested separately
because they can regress independently:

* the *payload* is narrow — the resume text never leaves the account;
* the *lifecycle* works — off by default, enable, rotate, revoke, expire;
* the *responses do not leak* — a revoked id is indistinguishable from an
  invented one.

The redaction helpers get their own class, because that is unit-testable logic
with a genuine false-positive risk (year ranges and metrics look like phone
numbers) and it is easier to pin down here than through an HTTP round trip.
"""

import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import ResumeAnalysis
from analyzer.sharing import (
    DEFAULT_SHARE_LIFETIME_DAYS,
    MAX_SHARE_LIFETIME_DAYS,
    MIN_SHARE_LIFETIME_DAYS,
    PUBLIC_FIELDS,
    REDACTION_MARKER,
    clamp_lifetime_days,
    redact_contact_details,
    redact_structure,
)

#: A resume body with every kind of detail the public view must never carry.
PRIVATE_RESUME_TEXT = (
    "JANE DOE\n"
    "42 Maple Street, Springfield\n"
    "jane.doe@example.com | +1 415 555 0134\n"
    "linkedin.com/in/jane-doe\n\n"
    "EXPERIENCE\n"
    "Senior Backend Engineer, Acme Corp\n"
    "Built the billing pipeline in Python and Django.\n"
)


def make_analysis(user, **overrides):
    defaults = dict(
        file_name="Jane_Doe_Resume.pdf",
        score=72,
        skills_found=["python", "django"],
        suggestions=["Add a project using React"],
        matched_skills=["python"],
        partial_skills=[],
        missing_skills=["react"],
        target_role="Backend Developer",
        experience_level="Senior",
        resume_text=PRIVATE_RESUME_TEXT,
        cover_letter_text="Dear hiring team, reach me on jane.doe@example.com.",
        cover_letter_feedback={"word_count": 9,
                               "note": "Call +1 415 555 0134"},
        interview_questions=["Explain the GIL."],
    )
    defaults.update(overrides)
    return ResumeAnalysis.objects.create(user=user, **defaults)


class SharePayloadTests(TestCase):
    """What the public endpoint is allowed to return."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="jane", password="password123")
        self.analysis = make_analysis(self.user)
        self.analysis.enable_sharing(lifetime_days=DEFAULT_SHARE_LIFETIME_DAYS)
        self.url = f"/api/shared/{self.analysis.share_id}/"

    def test_resume_text_is_not_in_the_response(self):
        """The bug, stated directly."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("resume_text", response.data)

        body = response.content.decode()
        self.assertNotIn("Maple Street", body)
        self.assertNotIn("jane.doe@example.com", body)
        self.assertNotIn("415 555 0134", body)

    def test_cover_letter_is_not_in_the_response(self):
        response = self.client.get(self.url)

        self.assertNotIn("cover_letter_text", response.data)
        self.assertNotIn("cover_letter_feedback", response.data)
        self.assertNotIn("Dear hiring team", response.content.decode())

    def test_filename_is_not_in_the_response(self):
        """``Jane_Doe_Resume.pdf`` identifies the owner on its own."""
        response = self.client.get(self.url)

        self.assertNotIn("file_name", response.data)
        self.assertNotIn("Jane_Doe", response.content.decode())

    def test_private_primary_key_is_not_exposed(self):
        response = self.client.get(self.url)

        self.assertNotIn("id", response.data)

    def test_response_keys_are_exactly_the_allowlist(self):
        """A denylist would fail open as the model grows; assert the allowlist."""
        response = self.client.get(self.url)

        self.assertEqual(
            set(response.data.keys()),
            set(PUBLIC_FIELDS) | {"expires_at"},
        )

    def test_useful_fields_are_still_present(self):
        """Narrowing the payload must not empty the page it feeds."""
        response = self.client.get(self.url)

        self.assertEqual(response.data["score"], 72)
        self.assertEqual(response.data["target_role"], "Backend Developer")
        self.assertEqual(response.data["experience_level"], "Senior")
        self.assertEqual(response.data["skills_found"], ["python", "django"])
        self.assertEqual(response.data["missing_skills"], ["react"])

    def test_expiry_is_advertised_to_the_viewer(self):
        response = self.client.get(self.url)

        self.assertIsNotNone(response.data["expires_at"])

    def test_contact_details_inside_published_strings_are_redacted(self):
        """Suggestions are generated from the document and can quote it back."""
        self.analysis.suggestions = ["Email jane.doe@example.com to follow up"]
        self.analysis.save(update_fields=["suggestions"])

        response = self.client.get(self.url)

        self.assertEqual(response.data["suggestions"], [
                         f"Email {REDACTION_MARKER} to follow up"])

    def test_a_view_is_counted(self):
        self.client.get(self.url)
        self.client.get(self.url)

        self.analysis.refresh_from_db()
        self.assertEqual(self.analysis.share_view_count, 2)


class ShareLifecycleTests(TestCase):
    """Off by default, and revocable once on."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="owner", password="password123")
        self.analysis = make_analysis(self.user)
        self.public_url = f"/api/shared/{self.analysis.share_id}/"
        self.manage_url = f"/api/history/{self.analysis.pk}/share/"

    def test_a_new_analysis_is_not_shared(self):
        """Sharing used to be implicit from the moment a row existed."""
        self.assertFalse(self.analysis.share_enabled)
        self.assertEqual(self.client.get(
            self.public_url).status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_enable_sharing(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.manage_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_live"])
        self.assertIsNotNone(response.data["share_url"])
        self.assertEqual(self.client.get(
            self.public_url).status_code, status.HTTP_200_OK)

    def test_default_lifetime_is_applied(self):
        self.client.force_authenticate(user=self.user)
        before = timezone.now()

        self.client.post(self.manage_url, {}, format="json")

        self.analysis.refresh_from_db()
        expected = before + timedelta(days=DEFAULT_SHARE_LIFETIME_DAYS)
        self.assertAlmostEqual(
            self.analysis.share_expires_at.timestamp(),
            expected.timestamp(),
            delta=10,
        )

    def test_owner_can_choose_a_shorter_lifetime(self):
        self.client.force_authenticate(user=self.user)

        self.client.post(self.manage_url, {"lifetime_days": 2}, format="json")

        self.analysis.refresh_from_db()
        self.assertLess(
            self.analysis.share_expires_at,
            timezone.now() + timedelta(days=3),
        )

    def test_an_over_long_lifetime_is_clamped_and_reported(self):
        """Silently disagreeing with a request answered 200 is the failure here."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.manage_url, {"lifetime_days": 99999}, format="json")

        self.assertEqual(
            response.data["lifetime_clamped_to_days"], MAX_SHARE_LIFETIME_DAYS)

    def test_revoking_kills_the_link(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(self.manage_url, {}, format="json")
        self.assertEqual(self.client.get(
            self.public_url).status_code, status.HTTP_200_OK)

        response = self.client.delete(self.manage_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_live"])
        self.assertIsNone(response.data["share_url"])
        self.assertEqual(self.client.get(
            self.public_url).status_code, status.HTTP_404_NOT_FOUND)

    def test_revoking_keeps_the_id_so_re_enabling_does_not_force_a_resend(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(self.manage_url, {}, format="json")
        original_id = self.analysis.share_id

        self.client.delete(self.manage_url)
        self.client.post(self.manage_url, {}, format="json")

        self.analysis.refresh_from_db()
        self.assertEqual(self.analysis.share_id, original_id)

    def test_rotating_breaks_every_copy_of_the_old_link(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(self.manage_url, {}, format="json")
        old_url = f"/api/shared/{self.analysis.share_id}/"

        self.client.post(self.manage_url, {"rotate": True}, format="json")

        self.analysis.refresh_from_db()
        new_url = f"/api/shared/{self.analysis.share_id}/"
        self.assertNotEqual(old_url, new_url)
        self.assertEqual(self.client.get(old_url).status_code,
                         status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(
            new_url).status_code, status.HTTP_200_OK)

    def test_rotating_resets_the_view_counter(self):
        """The count answers "views of the link I sent", not an all-time total."""
        self.client.force_authenticate(user=self.user)
        self.client.post(self.manage_url, {}, format="json")
        self.client.get(self.public_url)

        self.client.post(self.manage_url, {"rotate": True}, format="json")

        self.analysis.refresh_from_db()
        self.assertEqual(self.analysis.share_view_count, 0)

    def test_an_expired_link_stops_working_without_a_cleanup_job(self):
        """Expiry is evaluated on read, so nothing depends on a cron having run."""
        self.analysis.enable_sharing(lifetime_days=1)
        self.analysis.share_expires_at = timezone.now() - timedelta(minutes=1)
        self.analysis.save(update_fields=["share_expires_at"])

        self.assertEqual(self.client.get(
            self.public_url).status_code, status.HTTP_404_NOT_FOUND)

    def test_enabled_with_no_expiry_is_treated_as_not_live(self):
        """Belt and braces: the failure mode of trusting it is an immortal link."""
        self.analysis.share_enabled = True
        self.analysis.share_expires_at = None
        self.analysis.save(update_fields=["share_enabled", "share_expires_at"])

        self.assertFalse(self.analysis.is_share_live())
        self.assertEqual(self.client.get(
            self.public_url).status_code, status.HTTP_404_NOT_FOUND)


class ShareResponseLeakTests(TestCase):
    """A response must not confirm which ids are real."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="alice", password="password123")
        self.other = User.objects.create_user(
            username="bob", password="password123")
        self.analysis = make_analysis(self.user)

    def test_revoked_and_invented_ids_answer_identically(self):
        self.analysis.enable_sharing(lifetime_days=7)
        self.analysis.revoke_sharing()

        revoked = self.client.get(f"/api/shared/{self.analysis.share_id}/")
        invented = self.client.get(f"/api/shared/{uuid.uuid4()}/")

        self.assertEqual(revoked.status_code, invented.status_code)
        self.assertEqual(revoked.status_code, status.HTTP_404_NOT_FOUND)

    def test_managing_someone_elses_analysis_is_a_404_not_a_403(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.get(f"/api/history/{self.analysis.pk}/share/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_another_user_cannot_enable_sharing_on_your_analysis(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.post(
            f"/api/history/{self.analysis.pk}/share/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.analysis.refresh_from_db()
        self.assertFalse(self.analysis.share_enabled)

    def test_share_management_requires_authentication(self):
        response = self.client.get(f"/api/history/{self.analysis.pk}/share/")

        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    @override_settings(FRONTEND_URL="https://resume.example.com/")
    def test_share_url_has_no_double_slash(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/history/{self.analysis.pk}/share/", {}, format="json")

        self.assertEqual(
            response.data["share_url"],
            f"https://resume.example.com/shared/{response.data['share_id']}",
        )


class RedactionTests(TestCase):
    """The helpers, where the false-positive risk actually lives."""

    def test_email_is_redacted(self):
        self.assertEqual(
            redact_contact_details(
                "Write to jane.doe+jobs@example.co.uk today"),
            f"Write to {REDACTION_MARKER} today",
        )

    def test_international_phone_is_redacted(self):
        self.assertEqual(
            redact_contact_details("Call +44 20 7946 0958"),
            f"Call {REDACTION_MARKER}",
        )

    def test_bracketed_area_code_is_redacted(self):
        self.assertEqual(
            redact_contact_details("Call (415) 555-0134 any time"),
            f"Call {REDACTION_MARKER} any time",
        )

    def test_profile_urls_are_redacted(self):
        redacted = redact_contact_details(
            "Portfolio: github.com/janedoe and www.jane.dev")

        self.assertNotIn("janedoe", redacted)
        self.assertNotIn("jane.dev", redacted)

    def test_handles_are_redacted(self):
        self.assertEqual(
            redact_contact_details("Find me @janecodes"),
            f"Find me {REDACTION_MARKER}",
        )

    def test_a_year_range_survives(self):
        """The regression this class exists for: `2019-2022` is not a phone number."""
        text = "Worked at Acme from 2019-2022 on the platform team"

        self.assertEqual(redact_contact_details(text), text)

    def test_metrics_survive(self):
        for text in (
            "Improved throughput by 40% across 3 services",
            "Reduced p99 latency from 1200 ms to 340 ms",
            "Owned a budget of 1.5 million over 2 years",
            "Shipped 12 releases in 6 months",
        ):
            with self.subTest(text=text):
                self.assertEqual(redact_contact_details(text), text)

    def test_short_digit_runs_survive(self):
        self.assertEqual(redact_contact_details(
            "Team of 8-10 engineers"), "Team of 8-10 engineers")

    def test_non_strings_pass_through_untouched(self):
        self.assertEqual(redact_contact_details(None), None)
        self.assertEqual(redact_contact_details(42), 42)

    def test_structures_are_walked(self):
        payload = {
            "suggestions": ["Mail jane@example.com", "Add React"],
            "partial_skills": [{"skill": "react", "matched_variant": "reactjs"}],
            "score": 72,
        }

        redacted = redact_structure(payload)

        self.assertEqual(redacted["suggestions"][0],
                         f"Mail {REDACTION_MARKER}")
        self.assertEqual(redacted["suggestions"][1], "Add React")
        self.assertEqual(redacted["partial_skills"][0]["skill"], "react")
        self.assertEqual(redacted["score"], 72)

    def test_dictionary_keys_are_not_rewritten(self):
        redacted = redact_structure({"contact@example.com": "value"})

        self.assertIn("contact@example.com", redacted)


class ClampLifetimeTests(TestCase):
    def test_default_when_absent(self):
        self.assertEqual(clamp_lifetime_days(
            None), (DEFAULT_SHARE_LIFETIME_DAYS, False))

    def test_default_when_junk(self):
        self.assertEqual(clamp_lifetime_days("not a number"),
                         (DEFAULT_SHARE_LIFETIME_DAYS, False))
        self.assertEqual(clamp_lifetime_days(
            {"days": 3}), (DEFAULT_SHARE_LIFETIME_DAYS, False))

    def test_a_valid_value_passes_through(self):
        self.assertEqual(clamp_lifetime_days(7), (7, False))

    def test_a_numeric_string_is_accepted(self):
        self.assertEqual(clamp_lifetime_days("7"), (7, False))

    def test_zero_and_negatives_are_raised_to_the_floor(self):
        self.assertEqual(clamp_lifetime_days(
            0), (MIN_SHARE_LIFETIME_DAYS, True))
        self.assertEqual(clamp_lifetime_days(-5),
                         (MIN_SHARE_LIFETIME_DAYS, True))

    def test_over_long_is_lowered_to_the_ceiling(self):
        self.assertEqual(clamp_lifetime_days(10_000),
                         (MAX_SHARE_LIFETIME_DAYS, True))

    def test_booleans_are_not_treated_as_integers(self):
        """``True`` is an ``int`` in Python; a one-day link from `{"lifetime_days": true}`
        would be a surprising reading of that request."""
        self.assertEqual(clamp_lifetime_days(
            True), (DEFAULT_SHARE_LIFETIME_DAYS, False))
