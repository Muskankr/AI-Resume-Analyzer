"""Tests for analysis-task authorisation (#706).

``/api/status/<task_id>/`` returned ``analyze_resume_task``'s whole return
value — ``resume_text`` included — to anyone who could name the task id, with no
ownership check, no throttle, and the worker's exception text on failure.

The Celery result backend is never started here. ``AsyncResult`` is patched, so
these tests are about who is allowed through the door and what comes back, not
about Celery.
"""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import signing
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory

from analyzer.task_claims import (
    ANONYMOUS_OWNER,
    CLAIM_HEADER,
    CLAIM_SALT,
    issue_claim,
    owner_of,
    verify_claim,
)

TASK_ID = "b3f1c2d4-1111-2222-3333-444455556666"

#: What the worker actually returns, trimmed. The resume text is the point.
TASK_RESULT = {
    "id": 1,
    "score": 72,
    "skills_found": ["python"],
    "resume_text": "JANE DOE\n42 Maple Street\njane.doe@example.com\n",
    "cover_letter_text": "Dear hiring team,",
}


class FakeAsyncResult:
    """Stand-in for ``celery.result.AsyncResult``."""

    def __init__(self, state="SUCCESS", result=None, info=None):
        self.state = state
        self.result = result
        self.info = info


def fake_async_result(**kwargs):
    """Return a patch target that yields the same fake for any task id."""
    return patch("analyzer.views.AsyncResult", return_value=FakeAsyncResult(**kwargs))


class ClaimHelperTests(TestCase):
    """The signing layer, tested without HTTP in the way."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="jane", password="password123")

    def _request(self, claim=None, user=None):
        request = self.factory.get(
            f"/api/status/{TASK_ID}/", **({"HTTP_X_ANALYSIS_TOKEN": claim} if claim else {}))
        request.user = user or self.user
        # `verify_claim` reads `query_params` when no header is present, which
        # only DRF's request wrapper provides.
        request.query_params = {}
        return request

    def test_owner_of_names_a_signed_in_user(self):
        self.assertEqual(owner_of(self._request()), f"user:{self.user.id}")

    def test_a_fresh_claim_verifies(self):
        claim = issue_claim(TASK_ID, self._request())

        self.assertTrue(verify_claim(TASK_ID, self._request(claim=claim)))

    def test_a_claim_is_bound_to_one_task(self):
        """Otherwise owning one task would unlock every id the holder tries."""
        claim = issue_claim(TASK_ID, self._request())

        self.assertFalse(verify_claim(
            "some-other-task-id", self._request(claim=claim)))

    def test_a_claim_is_bound_to_one_user(self):
        other = User.objects.create_user(
            username="bob", password="password123")
        claim = issue_claim(TASK_ID, self._request())

        self.assertFalse(verify_claim(
            TASK_ID, self._request(claim=claim, user=other)))

    def test_a_tampered_claim_is_rejected(self):
        claim = issue_claim(TASK_ID, self._request())

        self.assertFalse(verify_claim(
            TASK_ID, self._request(claim=claim + "x")))

    def test_an_unsigned_payload_is_rejected(self):
        """Signing is the whole mechanism; a hand-built payload must not pass."""
        forged = signing.dumps(
            {"t": TASK_ID, "o": f"user:{self.user.id}"}, salt="not-our-salt")

        self.assertFalse(verify_claim(TASK_ID, self._request(claim=forged)))

    def test_an_expired_claim_is_rejected(self):
        claim = issue_claim(TASK_ID, self._request())

        with patch("analyzer.task_claims.CLAIM_MAX_AGE", -1):
            self.assertFalse(verify_claim(TASK_ID, self._request(claim=claim)))

    def test_a_missing_claim_is_rejected(self):
        self.assertFalse(verify_claim(TASK_ID, self._request()))

    def test_an_anonymous_claim_does_not_verify_as_a_user(self):
        anon = self._request()
        anon.user = None
        claim = issue_claim(TASK_ID, anon)

        self.assertEqual(ANONYMOUS_OWNER, "anon")
        self.assertFalse(verify_claim(TASK_ID, self._request(claim=claim)))


class TaskStatusAuthorizationTests(TestCase):
    """The endpoint itself."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner", password="password123")
        self.other = User.objects.create_user(
            username="other", password="password123")

    def _claim_for(self, user):
        factory = APIRequestFactory()
        request = factory.post("/api/upload/")
        request.user = user
        return issue_claim(TASK_ID, request)

    def _get(self, claim=None):
        headers = {CLAIM_HEADER: claim} if claim else {}
        return self.client.get(f"/api/status/{TASK_ID}/", headers=headers)

    def test_an_unclaimed_poll_gets_nothing(self):
        """The bug: the id alone used to be enough."""
        with fake_async_result(result=TASK_RESULT):
            response = self._get()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_no_resume_text_reaches_an_unclaimed_caller(self):
        with fake_async_result(result=TASK_RESULT):
            response = self._get()

        self.assertNotIn("Maple Street", response.content.decode())

    def test_the_owner_can_poll(self):
        self.client.force_authenticate(user=self.owner)

        with fake_async_result(result=TASK_RESULT):
            response = self._get(self._claim_for(self.owner))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["score"], 72)

    def test_another_signed_in_user_cannot_redeem_the_claim(self):
        """Requiring authentication alone would not have closed this."""
        self.client.force_authenticate(user=self.other)

        with fake_async_result(result=TASK_RESULT):
            response = self._get(self._claim_for(self.owner))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_an_anonymous_caller_cannot_redeem_a_users_claim(self):
        with fake_async_result(result=TASK_RESULT):
            response = self._get(self._claim_for(self.owner))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_an_anonymous_analysis_can_still_be_polled(self):
        """Anonymous upload is a supported flow and must keep working."""
        factory = APIRequestFactory()
        request = factory.post("/api/upload/")
        request.user = None
        claim = issue_claim(TASK_ID, request)

        with fake_async_result(result=TASK_RESULT):
            response = self._get(claim)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_a_claim_for_one_task_does_not_open_another(self):
        self.client.force_authenticate(user=self.owner)
        claim = self._claim_for(self.owner)

        with fake_async_result(result=TASK_RESULT):
            response = self.client.get(
                "/api/status/some-other-id/", headers={CLAIM_HEADER: claim}
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_refusal_and_unknown_task_are_indistinguishable(self):
        """A 403 for a refused poll would confirm the id is real."""
        self.client.force_authenticate(user=self.other)

        with fake_async_result(state="PENDING"):
            refused = self._get(self._claim_for(self.owner))
            unknown = self.client.get("/api/status/never-existed/")

        self.assertEqual(refused.status_code, unknown.status_code)
        self.assertEqual(refused.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(refused.data, unknown.data)

    def test_the_claim_is_accepted_from_a_query_parameter_too(self):
        """Documented fallback for clients that cannot set a header."""
        self.client.force_authenticate(user=self.owner)
        claim = self._claim_for(self.owner)

        with fake_async_result(result=TASK_RESULT):
            response = self.client.get(f"/api/status/{TASK_ID}/?token={claim}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @override_settings(ANALYSIS_CLAIM_REQUIRED=False)
    def test_enforcement_can_be_switched_off_for_a_staged_rollout(self):
        with fake_async_result(result=TASK_RESULT):
            response = self._get()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_enforcement_is_on_by_default(self):
        """A flag that defaults to the insecure setting is one nobody turns on."""
        from analyzer.task_claims import claims_are_enforced

        self.assertTrue(claims_are_enforced())


class TaskFailureDisclosureTests(TestCase):
    """What a failed task is allowed to say."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="jane", password="password123")
        self.client.force_authenticate(user=self.user)

        factory = APIRequestFactory()
        request = factory.post("/api/upload/")
        request.user = self.user
        self.claim = issue_claim(TASK_ID, request)

    def _get(self):
        return self.client.get(f"/api/status/{TASK_ID}/", headers={CLAIM_HEADER: self.claim})

    def test_the_workers_exception_is_not_returned(self):
        boom = Exception("/srv/app/backend/tmp/9f2c_resume.pdf: not a PDF")

        with fake_async_result(state="FAILURE", info=boom):
            response = self._get()

        body = response.content.decode()
        self.assertEqual(response.status_code,
                         status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertNotIn("/srv/app", body)
        self.assertNotIn("not a PDF", body)

    def test_a_usable_message_is_still_returned(self):
        with fake_async_result(state="FAILURE", info=Exception("boom")):
            response = self._get()

        self.assertIn("try again", response.data["error"].lower())

    def test_the_exception_is_logged_for_the_operator(self):
        with fake_async_result(state="FAILURE", info=Exception("disk full")):
            with self.assertLogs("analyzer.views", level="WARNING") as logs:
                self._get()

        self.assertTrue(any("disk full" in line for line in logs.output))

    def test_a_pending_task_reports_only_its_state(self):
        with fake_async_result(state="PENDING"):
            response = self._get()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"state": "PENDING"})


class UploadIssuesAClaimTests(TestCase):
    """The other half: a claim has to be handed out for any of this to work."""

    def setUp(self):
        self.client = APIClient()

    def test_upload_returns_a_claim_alongside_the_task_id(self):
        from io import BytesIO

        from django.core.files.uploadedfile import SimpleUploadedFile

        pdf = SimpleUploadedFile(
            "resume.pdf",
            b"%PDF-1.4\n" + BytesIO(b"x" * 400).read(),
            content_type="application/pdf",
        )

        with patch("analyzer.views.analyze_resume_task.delay") as delay:
            delay.return_value.id = TASK_ID
            response = self.client.post(
                "/api/upload/",
                {"file": pdf, "role": "Backend Developer"},
                format="multipart",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["task_id"], TASK_ID)
        self.assertIn("analysis_token", response.data)

    def test_the_issued_claim_actually_opens_the_task(self):
        """End to end through the two views, so the pair cannot drift apart."""
        from io import BytesIO

        from django.core.files.uploadedfile import SimpleUploadedFile

        pdf = SimpleUploadedFile(
            "resume.pdf",
            b"%PDF-1.4\n" + BytesIO(b"x" * 400).read(),
            content_type="application/pdf",
        )

        with patch("analyzer.views.analyze_resume_task.delay") as delay:
            delay.return_value.id = TASK_ID
            upload = self.client.post(
                "/api/upload/",
                {"file": pdf, "role": "Backend Developer"},
                format="multipart",
            )

        with fake_async_result(result=TASK_RESULT):
            poll = self.client.get(
                f"/api/status/{TASK_ID}/",
                headers={CLAIM_HEADER: upload.data["analysis_token"]},
            )

        self.assertEqual(poll.status_code, status.HTTP_200_OK)
        self.assertEqual(poll.data["result"]["score"], 72)
