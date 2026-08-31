from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .badge_models import ResumeBadge
from .models import ResumeAnalysis


class ResumeScoreBadgeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="badge-user",
            password="test-password-123",
        )
        self.client = APIClient()

    def create_analysis(self, score):
        return ResumeAnalysis.objects.create(
            user=self.user,
            file_name=f"resume-{score}.pdf",
            score=score,
            skills_found=[],
            suggestions=[],
            matched_skills=[],
            partial_skills=[],
            missing_skills=[],
            target_role="Frontend Developer",
            experience_level="Junior",
        )

    def test_authenticated_endpoint_creates_stable_badge_and_markdown(self):
        self.client.force_authenticate(self.user)

        first = self.client.get("/api/badge/")
        second = self.client.get("/api/badge/")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data["badge_id"], second.data["badge_id"])
        self.assertIn("![ATS Score]", first.data["markdown"])
        self.assertIn("/api/badge/", first.data["badge_url"])
        self.assertEqual(ResumeBadge.objects.filter(user=self.user).count(), 1)

    def test_public_badge_requires_no_authentication(self):
        self.create_analysis(85)
        badge = ResumeBadge.objects.create(user=self.user)

        response = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("image/svg+xml", response["Content-Type"])
        self.assertIn("85%", response.content.decode("utf-8"))
        self.assertEqual(
            response["Cache-Control"],
            "no-cache, no-store, must-revalidate",
        )

    def test_same_badge_url_tracks_latest_analysis_score(self):
        first = self.create_analysis(72)
        badge = ResumeBadge.objects.create(user=self.user)

        response_one = self.client.get(f"/api/badge/{badge.badge_id}/svg/")
        self.assertEqual(response_one.status_code, 200)
        self.assertIn("72%", response_one.content.decode("utf-8"))

        self.create_analysis(91)
        response_two = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response_two.status_code, 200)
        self.assertIn("91%", response_two.content.decode("utf-8"))
        self.assertNotIn("72%", response_two.content.decode("utf-8"))
        self.assertNotEqual(
            first.id,
            ResumeAnalysis.objects.order_by("-created_at", "-id").first().id,
        )

    def test_badge_without_analysis_shows_na(self):
        badge = ResumeBadge.objects.create(user=self.user)

        response = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("N/A", response.content.decode("utf-8"))

    def test_unknown_badge_returns_404(self):
        import uuid

        response = self.client.get(f"/api/badge/{uuid.uuid4()}/svg/")

        self.assertEqual(response.status_code, 404)

    def test_disabled_badge_returns_404(self):
        badge = ResumeBadge.objects.create(user=self.user, enabled=False)

        response = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response.status_code, 404)

    def test_management_endpoint_requires_authentication(self):
        response = self.client.get("/api/badge/")
        self.assertEqual(response.status_code, 401)


class ResumeBadgeControlTests(TestCase):
    """Turning the badge off, and issuing a new URL (#865).

    Before this, ``ResumeBadge.enabled`` was reachable only from the ORM. The
    column existed, ``resume_score_badge`` filtered on it, and
    ``test_disabled_badge_returns_404`` above covered the disabled path -- by
    setting the field directly, because no request could produce that state.
    A user whose browser had once opened an analysis had a permanent public URL
    reporting their newest ATS score and no way to withdraw it.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="badge-owner",
            password="test-password-123",
        )
        self.other = User.objects.create_user(
            username="someone-else",
            password="test-password-123",
        )
        self.client = APIClient()

    def analysis_for(self, user, score):
        return ResumeAnalysis.objects.create(
            user=user,
            file_name=f"resume-{score}.pdf",
            score=score,
            skills_found=[],
            suggestions=[],
            matched_skills=[],
            partial_skills=[],
            missing_skills=[],
            target_role="Frontend Developer",
            experience_level="Junior",
        )

    def badge_for(self, user):
        return ResumeBadge.objects.get(user=user)

    # -- disabling ---------------------------------------------------------

    def test_post_enabled_false_takes_the_badge_offline(self):
        self.analysis_for(self.user, 88)
        self.client.force_authenticate(self.user)
        badge_url = self.client.get("/api/badge/").data["badge_url"]
        badge_id = self.badge_for(self.user).badge_id

        self.assertEqual(self.client.get(f"/api/badge/{badge_id}/svg/").status_code, 200)

        response = self.client.post("/api/badge/", {"enabled": False}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["enabled"])
        self.assertFalse(self.badge_for(self.user).enabled)
        self.assertEqual(self.client.get(f"/api/badge/{badge_id}/svg/").status_code, 404)
        # The URL is unchanged -- disabled is paused, not rotated.
        self.assertEqual(response.data["badge_url"], badge_url)

    def test_delete_takes_the_badge_offline(self):
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")
        badge_id = self.badge_for(self.user).badge_id

        response = self.client.delete("/api/badge/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["enabled"])
        self.assertEqual(self.client.get(f"/api/badge/{badge_id}/svg/").status_code, 404)

    def test_delete_keeps_the_row_and_the_identifier(self):
        """A second DELETE must not mint a different badge.

        Deleting the row would mean the next GET creates a new one with a new
        badge_id, so a badge someone had switched off would come back pointing
        somewhere else. Rotation is the explicit way to change the URL.
        """
        self.client.force_authenticate(self.user)
        original = self.client.get("/api/badge/").data["badge_id"]

        self.client.delete("/api/badge/")
        self.client.delete("/api/badge/")

        self.assertEqual(ResumeBadge.objects.filter(user=self.user).count(), 1)
        self.assertEqual(self.client.get("/api/badge/").data["badge_id"], original)
        self.assertFalse(self.badge_for(self.user).enabled)

    def test_a_disabled_badge_can_be_switched_back_on(self):
        self.analysis_for(self.user, 64)
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")
        badge_id = self.badge_for(self.user).badge_id

        self.client.delete("/api/badge/")
        response = self.client.post("/api/badge/", {"enabled": True}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["enabled"])
        svg = self.client.get(f"/api/badge/{badge_id}/svg/")
        self.assertEqual(svg.status_code, 200)
        self.assertIn("64%", svg.content.decode("utf-8"))

    # -- rotating ----------------------------------------------------------

    def test_rotate_issues_a_new_url_and_kills_the_old_one(self):
        self.analysis_for(self.user, 77)
        self.client.force_authenticate(self.user)
        before = self.client.get("/api/badge/").data
        old_id = before["badge_id"]

        response = self.client.post("/api/badge/", {"rotate": True}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.data["badge_id"], old_id)
        self.assertNotEqual(response.data["badge_url"], before["badge_url"])
        self.assertEqual(self.client.get(f"/api/badge/{old_id}/svg/").status_code, 404)
        self.assertEqual(
            self.client.get(f"/api/badge/{response.data['badge_id']}/svg/").status_code,
            200,
        )

    def test_rotate_alone_leaves_the_badge_enabled(self):
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")

        response = self.client.post("/api/badge/", {"rotate": True}, format="json")

        self.assertTrue(response.data["enabled"])

    def test_rotate_and_disable_in_one_request(self):
        """What someone wants when they have just realised where they pasted it."""
        self.client.force_authenticate(self.user)
        old_id = self.client.get("/api/badge/").data["badge_id"]

        response = self.client.post(
            "/api/badge/", {"enabled": False, "rotate": True}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["enabled"])
        self.assertNotEqual(response.data["badge_id"], old_id)
        self.assertEqual(self.client.get(f"/api/badge/{old_id}/svg/").status_code, 404)
        self.assertEqual(
            self.client.get(f"/api/badge/{response.data['badge_id']}/svg/").status_code,
            404,
        )

    def test_rotating_a_disabled_badge_does_not_re_enable_it(self):
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")
        self.client.delete("/api/badge/")

        response = self.client.post("/api/badge/", {"rotate": True}, format="json")

        self.assertFalse(response.data["enabled"])

    # -- request validation ------------------------------------------------

    def test_string_booleans_are_accepted(self):
        """A form post sends "false", not False."""
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")

        response = self.client.post("/api/badge/", {"enabled": "false"})

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["enabled"])
        self.assertFalse(self.badge_for(self.user).enabled)

    def test_a_non_boolean_is_rejected_rather_than_treated_as_truthy(self):
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")

        response = self.client.post("/api/badge/", {"enabled": "maybe"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertTrue(self.badge_for(self.user).enabled)

    def test_an_empty_body_is_rejected(self):
        """A no-op that returns 200 reads like it worked."""
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")

        response = self.client.post("/api/badge/", {}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_a_misspelled_field_is_rejected_rather_than_ignored(self):
        """`{"enable": false}` must not answer 200 and leave the badge up."""
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")

        response = self.client.post("/api/badge/", {"enable": False}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("enable", response.data["detail"])
        self.assertTrue(self.badge_for(self.user).enabled)

    # -- authorisation -----------------------------------------------------

    def test_the_endpoint_only_ever_touches_the_caller_s_own_badge(self):
        self.client.force_authenticate(self.other)
        self.client.get("/api/badge/")
        other_badge = self.badge_for(self.other)

        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")
        self.client.post("/api/badge/", {"enabled": False, "rotate": True}, format="json")

        other_badge.refresh_from_db()
        self.assertTrue(other_badge.enabled)
        self.assertEqual(other_badge.badge_id, self.badge_for(self.other).badge_id)

    def test_writes_require_authentication(self):
        self.assertEqual(self.client.post("/api/badge/", {"enabled": False}).status_code, 401)
        self.assertEqual(self.client.delete("/api/badge/").status_code, 401)

    # -- payload -----------------------------------------------------------

    def test_the_payload_reports_enabled_and_when_it_last_changed(self):
        self.client.force_authenticate(self.user)

        created = self.client.get("/api/badge/").data
        self.assertTrue(created["enabled"])
        self.assertIsNotNone(created["updated_at"])

        disabled = self.client.delete("/api/badge/").data
        self.assertFalse(disabled["enabled"])
        self.assertGreater(disabled["updated_at"], created["updated_at"])

    def test_markdown_tracks_a_rotated_url(self):
        self.client.force_authenticate(self.user)
        self.client.get("/api/badge/")

        rotated = self.client.post("/api/badge/", {"rotate": True}, format="json").data

        self.assertIn(rotated["badge_id"], rotated["markdown"])
        self.assertEqual(rotated["markdown"], f"![ATS Score]({rotated['badge_url']})")
