"""Tests for suggestion feedback storage.

The endpoint used to accept a vote, answer "Feedback recorded successfully"
and discard it. These tests pin down that a vote is actually persisted,
validated, scoped to its owner, and changeable.
"""

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import ResumeAnalysis, SuggestionFeedback

SUGGESTION = "Add projects or experience with React"
OTHER_SUGGESTION = "Add projects or experience with Docker"


def make_analysis(user, **overrides):
    defaults = dict(
        file_name="resume.pdf",
        score=60,
        skills_found=["python"],
        suggestions=[SUGGESTION, OTHER_SUGGESTION],
        matched_skills=["python"],
        missing_skills=["react", "docker"],
        target_role="Frontend Developer",
    )
    defaults.update(overrides)
    return ResumeAnalysis.objects.create(user=user, **defaults)


class SuggestionFeedbackModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="voter", password="password123")
        self.analysis = make_analysis(self.user)

    def test_hash_is_derived_from_the_text_on_save(self):
        feedback = SuggestionFeedback.objects.create(
            user=self.user, analysis=self.analysis, suggestion_text=SUGGESTION, vote="up"
        )
        self.assertEqual(
            feedback.suggestion_hash, SuggestionFeedback.hash_suggestion(SUGGESTION)
        )

    def test_hash_ignores_surrounding_whitespace(self):
        self.assertEqual(
            SuggestionFeedback.hash_suggestion(f"  {SUGGESTION}  "),
            SuggestionFeedback.hash_suggestion(SUGGESTION),
        )

    def test_one_vote_per_user_analysis_and_suggestion(self):
        SuggestionFeedback.objects.create(
            user=self.user, analysis=self.analysis, suggestion_text=SUGGESTION, vote="up"
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SuggestionFeedback.objects.create(
                    user=self.user,
                    analysis=self.analysis,
                    suggestion_text=SUGGESTION,
                    vote="down",
                )

    def test_different_suggestions_can_both_be_voted_on(self):
        SuggestionFeedback.objects.create(
            user=self.user, analysis=self.analysis, suggestion_text=SUGGESTION, vote="up"
        )
        SuggestionFeedback.objects.create(
            user=self.user,
            analysis=self.analysis,
            suggestion_text=OTHER_SUGGESTION,
            vote="down",
        )
        self.assertEqual(SuggestionFeedback.objects.count(), 2)

    def test_feedback_is_removed_with_its_analysis(self):
        SuggestionFeedback.objects.create(
            user=self.user, analysis=self.analysis, suggestion_text=SUGGESTION, vote="up"
        )
        self.analysis.delete()
        self.assertEqual(SuggestionFeedback.objects.count(), 0)


class SuggestionFeedbackEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="voter", password="password123")
        self.analysis = make_analysis(self.user)
        self.client.force_authenticate(user=self.user)

    def _post(self, **payload):
        return self.client.post("/api/suggestion-feedback/", payload, format="json")

    def test_requires_authentication(self):
        response = APIClient().post(
            "/api/suggestion-feedback/",
            {"analysis_id": self.analysis.pk, "suggestion_text": SUGGESTION, "vote": "up"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vote_is_actually_stored(self):
        """The reported problem: the old endpoint reported success and stored nothing."""
        response = self._post(
            analysis_id=self.analysis.pk, suggestion_text=SUGGESTION, vote="up"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["created"])

        stored = SuggestionFeedback.objects.get(user=self.user, analysis=self.analysis)
        self.assertEqual(stored.vote, "up")
        self.assertEqual(stored.suggestion_text, SUGGESTION)

    def test_voting_again_updates_instead_of_duplicating(self):
        self._post(analysis_id=self.analysis.pk, suggestion_text=SUGGESTION, vote="up")
        response = self._post(
            analysis_id=self.analysis.pk, suggestion_text=SUGGESTION, vote="down"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["created"])
        self.assertEqual(SuggestionFeedback.objects.count(), 1)
        self.assertEqual(SuggestionFeedback.objects.get().vote, "down")

    def test_optional_comment_is_stored_and_truncated(self):
        self._post(
            analysis_id=self.analysis.pk,
            suggestion_text=SUGGESTION,
            vote="down",
            comment="x" * 5000,
        )
        self.assertEqual(len(SuggestionFeedback.objects.get().comment), 2000)

    def test_invalid_vote_is_rejected(self):
        response = self._post(
            analysis_id=self.analysis.pk, suggestion_text=SUGGESTION, vote="banana"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vote must be one of", response.data["detail"])
        self.assertEqual(SuggestionFeedback.objects.count(), 0)

    def test_missing_fields_are_rejected(self):
        for payload in (
            {"suggestion_text": SUGGESTION, "vote": "up"},
            {"analysis_id": 1, "vote": "up"},
            {"analysis_id": 1, "suggestion_text": "   ", "vote": "up"},
        ):
            with self.subTest(payload=payload):
                response = self._post(**payload)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_analysis_is_a_404(self):
        response = self._post(
            analysis_id=999999, suggestion_text=SUGGESTION, vote="up"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_vote_on_another_users_analysis(self):
        stranger = User.objects.create_user(username="stranger", password="password123")
        theirs = make_analysis(stranger)

        response = self._post(analysis_id=theirs.pk, suggestion_text=SUGGESTION, vote="up")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(SuggestionFeedback.objects.count(), 0)

    def test_non_numeric_analysis_id_does_not_raise(self):
        response = self._post(
            analysis_id="not-an-id", suggestion_text=SUGGESTION, vote="up"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_returns_the_callers_votes_for_one_analysis(self):
        self._post(analysis_id=self.analysis.pk, suggestion_text=SUGGESTION, vote="up")
        self._post(
            analysis_id=self.analysis.pk, suggestion_text=OTHER_SUGGESTION, vote="down"
        )

        response = self.client.get(
            f"/api/suggestion-feedback/?analysis_id={self.analysis.pk}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        votes = {row["suggestion_text"]: row["vote"] for row in response.data["results"]}
        self.assertEqual(votes, {SUGGESTION: "up", OTHER_SUGGESTION: "down"})

    def test_get_does_not_leak_another_users_votes(self):
        stranger = User.objects.create_user(username="stranger", password="password123")
        theirs = make_analysis(stranger)
        SuggestionFeedback.objects.create(
            user=stranger, analysis=theirs, suggestion_text=SUGGESTION, vote="up"
        )

        response = self.client.get(f"/api/suggestion-feedback/?analysis_id={theirs.pk}")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_withdraws_a_vote(self):
        self._post(analysis_id=self.analysis.pk, suggestion_text=SUGGESTION, vote="up")

        response = self.client.delete(
            "/api/suggestion-feedback/",
            {"analysis_id": self.analysis.pk, "suggestion_text": SUGGESTION},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["removed"])
        self.assertEqual(SuggestionFeedback.objects.count(), 0)

    def test_delete_without_a_stored_vote_is_not_an_error(self):
        response = self.client.delete(
            "/api/suggestion-feedback/",
            {"analysis_id": self.analysis.pk, "suggestion_text": SUGGESTION},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["removed"])
