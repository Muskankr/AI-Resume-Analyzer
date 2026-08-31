"""Tests for the analysis history endpoints.

Covers the payload slimming, pagination, explicit ordering, the new detail
endpoint, and the 204-with-a-body fix on clear.
"""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import ResumeAnalysis
from analyzer.views import HISTORY_DEFAULT_PAGE_SIZE, HISTORY_MAX_PAGE_SIZE

LONG_RESUME_TEXT = "Python developer with Django experience. " * 200


def make_analysis(user, index=0, **overrides):
    defaults = dict(
        file_name=f"resume-{index}.pdf",
        score=50 + index,
        skills_found=["python", "sql"],
        suggestions=["Add projects or experience with React"],
        matched_skills=["python"],
        missing_skills=["react"],
        target_role="Backend Developer",
        resume_text=LONG_RESUME_TEXT,
        cover_letter_text="Dear hiring team, I am excited to apply.",
        cover_letter_feedback={"word_count": 8},
        interview_questions=["Explain the GIL."],
    )
    defaults.update(overrides)
    return ResumeAnalysis.objects.create(user=user, **defaults)


class HistoryListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="lister", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        response = APIClient().get("/api/history/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_a_bare_array_when_no_pagination_is_requested(self):
        make_analysis(self.user)
        response = self.client.get("/api/history/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)

    def test_list_payload_omits_the_heavy_fields(self):
        make_analysis(self.user)
        row = self.client.get("/api/history/").data[0]

        for heavy in ("resume_text", "cover_letter_text", "cover_letter_feedback", "interview_questions"):
            with self.subTest(field=heavy):
                self.assertNotIn(heavy, row)

    def test_list_payload_keeps_what_the_sidebar_renders(self):
        make_analysis(self.user)
        row = self.client.get("/api/history/").data[0]

        for field in (
            "id", "share_id", "file_name", "score", "skills_found", "suggestions",
            "matched_skills", "missing_skills", "target_role", "created_at",
        ):
            with self.subTest(field=field):
                self.assertIn(field, row)

    def test_only_returns_the_requesting_users_analyses(self):
        make_analysis(self.user)
        other = User.objects.create_user(
            username="someone-else", password="password123")
        make_analysis(other, index=99)

        response = self.client.get("/api/history/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["file_name"], "resume-0.pdf")

    def test_newest_first(self):
        for index in range(3):
            make_analysis(self.user, index=index)

        names = [row["file_name"]
                 for row in self.client.get("/api/history/").data]
        self.assertEqual(
            names, ["resume-2.pdf", "resume-1.pdf", "resume-0.pdf"])


class HistoryPaginationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="paginator", password="password123")
        self.client.force_authenticate(user=self.user)
        for index in range(25):
            make_analysis(self.user, index=index)

    def test_page_param_returns_an_envelope(self):
        response = self.client.get("/api/history/?page=1")

        self.assertEqual(set(response.data), {
                         "count", "page", "page_size", "next", "previous", "results"})
        self.assertEqual(response.data["count"], 25)
        self.assertEqual(response.data["page_size"], HISTORY_DEFAULT_PAGE_SIZE)
        self.assertEqual(
            len(response.data["results"]), HISTORY_DEFAULT_PAGE_SIZE)

    def test_second_page_holds_the_remainder(self):
        response = self.client.get("/api/history/?page=2")

        self.assertEqual(
            len(response.data["results"]), 25 - HISTORY_DEFAULT_PAGE_SIZE)
        self.assertIsNone(response.data["next"])
        self.assertIn("page=1", response.data["previous"])

    def test_pages_do_not_overlap_or_skip(self):
        first = self.client.get(
            "/api/history/?page=1&page_size=10").data["results"]
        second = self.client.get(
            "/api/history/?page=2&page_size=10").data["results"]
        third = self.client.get(
            "/api/history/?page=3&page_size=10").data["results"]

        ids = [row["id"] for row in first + second + third]
        self.assertEqual(len(ids), 25)
        self.assertEqual(len(set(ids)), 25)

    def test_page_size_is_capped(self):
        response = self.client.get(
            f"/api/history/?page=1&page_size={HISTORY_MAX_PAGE_SIZE * 10}")
        self.assertEqual(response.data["page_size"], HISTORY_MAX_PAGE_SIZE)

    def test_page_size_alone_is_enough_to_paginate(self):
        response = self.client.get("/api/history/?page_size=5")
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(len(response.data["results"]), 5)

    def test_nonsense_params_fall_back_instead_of_erroring(self):
        for query in ("?page=abc", "?page=0", "?page=-3", "?page=1&page_size=nope"):
            with self.subTest(query=query):
                response = self.client.get(f"/api/history/{query}")
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data["page"], 1)

    def test_page_past_the_end_is_empty_rather_than_an_error(self):
        response = self.client.get("/api/history/?page=99")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])
        self.assertIsNone(response.data["next"])

    def test_next_link_carries_the_requested_page_size(self):
        response = self.client.get("/api/history/?page=1&page_size=10")
        self.assertIn("page_size=10", response.data["next"])
        self.assertIn("page=2", response.data["next"])


class HistoryDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="reader", password="password123")
        self.client.force_authenticate(user=self.user)
        self.analysis = make_analysis(self.user)

    def test_detail_returns_the_full_text(self):
        response = self.client.get(f"/api/history/{self.analysis.pk}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["resume_text"], LONG_RESUME_TEXT)
        self.assertEqual(response.data["interview_questions"], [
                         "Explain the GIL."])

    def test_detail_does_not_expose_another_users_analysis(self):
        other = User.objects.create_user(
            username="stranger", password="password123")
        theirs = make_analysis(other, index=7)

        response = self.client.get(f"/api/history/{theirs.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_still_works_on_the_same_route(self):
        response = self.client.delete(f"/api/history/{self.analysis.pk}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ResumeAnalysis.objects.filter(
            pk=self.analysis.pk).exists())

    def test_delete_does_not_touch_another_users_analysis(self):
        other = User.objects.create_user(
            username="stranger", password="password123")
        theirs = make_analysis(other, index=7)

        response = self.client.delete(f"/api/history/{theirs.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ResumeAnalysis.objects.filter(pk=theirs.pk).exists())


class ClearHistoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="clearer", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_clear_removes_only_the_callers_rows(self):
        make_analysis(self.user)
        other = User.objects.create_user(
            username="bystander", password="password123")
        make_analysis(other, index=3)

        self.client.delete("/api/history/clear/")

        self.assertFalse(ResumeAnalysis.objects.filter(
            user=self.user).exists())
        self.assertTrue(ResumeAnalysis.objects.filter(user=other).exists())

    def test_204_response_has_no_body(self):
        """A 204 must not carry content; the old response sent a JSON message."""
        response = self.client.delete("/api/history/clear/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.content, b"")
