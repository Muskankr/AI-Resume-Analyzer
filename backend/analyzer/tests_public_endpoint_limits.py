"""Rate limits and input handling on the unauthenticated endpoints.

Two problems, both on endpoints anyone can call without an account:

* nothing bounded how often they could be called. ``/api/contact/`` sends an
  email per request, and ``/api/analyze-jd/`` walks an unbounded body and then
  compares each of its top 30 words against the whole skill set.
* nothing bounded what could be sent. ``request.data.get(field, "")`` returns
  the *stored* value when the key is present, so a JSON ``null`` came back as
  ``None`` and the next ``[:2000]`` or ``.strip()`` raised ``TypeError``. In
  ``upload_resume`` that happens above the ``try:``, so it was a 500.

Throttle tests clear the cache in ``setUp``: DRF's throttles keep their
counters there, so without it whichever test ran first would leave the bucket
part-used and the rest would be order-dependent.
"""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from rest_framework.throttling import SimpleRateThrottle

from analyzer.request_input import (
    MAX_CONTACT_MESSAGE_LENGTH,
    MAX_JOB_DESCRIPTION_LENGTH,
    MAX_STORED_JOB_DESCRIPTION_LENGTH,
    clean_text,
    is_probably_an_email,
)


def throttled_at(scope, rate):
    """Temporarily set the rate for one throttle scope.

    `override_settings(REST_FRAMEWORK=...)` does not work for this.
    `SimpleRateThrottle.THROTTLE_RATES` is a *class* attribute bound to
    `api_settings.DEFAULT_THROTTLE_RATES` when the module is imported, so
    changing the setting afterwards leaves the class holding the original dict.
    Patching the dict itself is what actually takes effect — and it is shared by
    every throttle class, which is why one helper covers all the scopes.
    """
    return patch.dict(SimpleRateThrottle.THROTTLE_RATES, {scope: rate})


class CleanTextTests(TestCase):
    """The helper the null-crash fix rests on."""

    def test_a_string_passes_through_trimmed(self):
        self.assertEqual(clean_text("  hello  "), "hello")

    def test_none_becomes_an_empty_string(self):
        # The actual reported crash: `{"job_description": null}`.
        self.assertEqual(clean_text(None), "")

    def test_non_strings_become_an_empty_string(self):
        for value in (123, 4.5, True, ["a", "b"], {"a": 1}, object()):
            with self.subTest(value=value):
                self.assertEqual(clean_text(value), "")

    def test_a_list_is_not_stringified(self):
        """`str(value)` would store the literal text "['a', 'b']"."""
        self.assertEqual(clean_text(["a", "b"]), "")

    def test_max_length_truncates(self):
        self.assertEqual(clean_text("abcdef", max_length=3), "abc")

    def test_truncation_does_not_leave_trailing_whitespace(self):
        self.assertEqual(clean_text("ab      cd", max_length=4), "ab")

    def test_no_max_length_means_no_limit(self):
        self.assertEqual(len(clean_text("x" * 100_000)), 100_000)

    def test_strip_can_be_turned_off(self):
        self.assertEqual(clean_text("  x  ", strip=False), "  x  ")


class EmailValidationTests(TestCase):
    def test_accepts_ordinary_addresses(self):
        for value in ("a@b.com", "first.last+tag@sub.example.co.uk"):
            with self.subTest(value=value):
                self.assertTrue(is_probably_an_email(value))

    def test_rejects_things_that_are_not_addresses(self):
        for value in ("", "   ", None, 42, "not an email", "@example.com", "a@"):
            with self.subTest(value=value):
                self.assertFalse(is_probably_an_email(value))


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ContactEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        mail.outbox.clear()
        self.client = APIClient()

    def _payload(self, **overrides):
        payload = {
            "name": "Jane Doe",
            "email": "jane@example.com",
            "category": "Bug Report",
            "subject": "Parser issue",
            "message": "Found a bug uploading a resume.",
        }
        payload.update(overrides)
        return payload

    def test_a_valid_message_is_sent(self):
        resp = self.client.post("/api/contact/", self._payload())

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("jane@example.com", mail.outbox[0].body)

    def test_an_invalid_address_is_rejected_and_sends_nothing(self):
        resp = self.client.post("/api/contact/", self._payload(email="not-an-email"))

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("valid email", resp.data["error"])
        self.assertEqual(len(mail.outbox), 0)

    def test_null_fields_are_a_400_not_a_500(self):
        """`.get(f, "").strip()` raised TypeError on a JSON null."""
        resp = self.client.post(
            "/api/contact/",
            {"name": None, "email": None, "message": None},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_a_non_string_field_is_a_400_not_a_500(self):
        resp = self.client.post(
            "/api/contact/",
            {"name": ["Jane"], "email": 42, "message": {"text": "hi"}},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_an_overlong_message_is_truncated_rather_than_rejected(self):
        resp = self.client.post(
            "/api/contact/", self._payload(message="x" * (MAX_CONTACT_MESSAGE_LENGTH * 3))
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # The whole email body is bounded, not just the message field.
        self.assertLess(len(mail.outbox[0].body), MAX_CONTACT_MESSAGE_LENGTH + 1000)

    def test_an_unrecognised_category_is_filed_as_other(self):
        """Keeps caller-controlled text out of the subject header."""
        self.client.post(
            "/api/contact/", self._payload(category="X-Injected: yes")
        )

        self.assertEqual(mail.outbox[0].subject, "[Support - Other] Parser issue")

    def test_the_endpoint_is_rate_limited(self):
        with throttled_at("contact", "3/hour"):
            for attempt in range(3):
                resp = self.client.post("/api/contact/", self._payload())
                self.assertEqual(
                    resp.status_code, status.HTTP_200_OK, f"attempt {attempt}"
                )

            blocked = self.client.post("/api/contact/", self._payload())

        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        # The throttled request must not have sent anything.
        self.assertEqual(len(mail.outbox), 3)

    def test_a_mail_backend_failure_is_reported_rather_than_claimed_as_success(self):
        """It used to answer "your message has been received" either way."""
        with patch("analyzer.views.send_mail", side_effect=OSError("smtp down")):
            resp = self.client.post("/api/contact/", self._payload())

        self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("could not send", resp.data["error"])


class AnalyzeJdEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_a_normal_job_description_is_analysed(self):
        resp = self.client.post(
            "/api/analyze-jd/",
            {"job_description": "Looking for a Python and Django developer."},
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        keywords = {item["text"] for item in resp.data["keywords"]}
        self.assertIn("python", keywords)

    def test_an_empty_description_is_a_400(self):
        resp = self.client.post("/api/analyze-jd/", {"job_description": "   "})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_null_description_is_a_400_not_a_500(self):
        resp = self.client.post(
            "/api/analyze-jd/", {"job_description": None}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_missing_description_is_a_400(self):
        resp = self.client.post("/api/analyze-jd/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_an_enormous_body_is_capped_rather_than_processed_whole(self):
        with patch("analyzer.views.re.findall", wraps=None) as spy:
            spy.side_effect = lambda pattern, text: []
            self.client.post(
                "/api/analyze-jd/",
                {"job_description": "python " * 200_000},
            )

        # Whatever reached the tokeniser was capped, not the full body.
        analysed = spy.call_args[0][1]
        self.assertLessEqual(len(analysed), MAX_JOB_DESCRIPTION_LENGTH)

    def test_the_endpoint_is_rate_limited(self):
        body = {"job_description": "Python developer"}

        with throttled_at("analyze_jd", "2/hour"):
            self.assertEqual(
                self.client.post("/api/analyze-jd/", body).status_code,
                status.HTTP_200_OK,
            )
            self.assertEqual(
                self.client.post("/api/analyze-jd/", body).status_code,
                status.HTTP_200_OK,
            )
            self.assertEqual(
                self.client.post("/api/analyze-jd/", body).status_code,
                status.HTTP_429_TOO_MANY_REQUESTS,
            )


class MockInterviewEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_a_normal_answer_gets_feedback(self):
        resp = self.client.post(
            "/api/mock-interview/",
            {"question": "Explain closures.", "answer": "A closure is " + "words " * 40},
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("feedback", resp.data)

    def test_null_fields_are_a_400_not_a_500(self):
        resp = self.client.post(
            "/api/mock-interview/",
            {"question": None, "answer": None},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_the_endpoint_is_rate_limited(self):
        body = {"question": "Explain closures.", "answer": "A closure is a function."}

        with throttled_at("mock_interview", "1/hour"):
            self.assertEqual(
                self.client.post("/api/mock-interview/", body).status_code,
                status.HTTP_200_OK,
            )
            self.assertEqual(
                self.client.post("/api/mock-interview/", body).status_code,
                status.HTTP_429_TOO_MANY_REQUESTS,
            )


class SignupThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_account_creation_is_rate_limited(self):
        def register(index):
            return self.client.post(
                "/api/auth/signup/",
                {
                    "username": f"person{index}",
                    "password": "correct horse battery staple",
                    "captcha_token": "test-captcha-token",
                },
            )

        with throttled_at("signup", "2/hour"):
            self.assertEqual(register(1).status_code, status.HTTP_201_CREATED)
            self.assertEqual(register(2).status_code, status.HTTP_201_CREATED)
            self.assertEqual(register(3).status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        self.assertEqual(User.objects.filter(username__startswith="person").count(), 2)


class UploadInputTests(TestCase):
    """The reported 500: the slice sits above upload_resume's try/except."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_a_null_job_description_does_not_500(self):
        resp = self.client.post(
            "/api/upload/",
            {"job_description": None, "role": None},
            format="json",
        )

        # No file and no URL, so a 400 is the right answer. The point is that it
        # is a 400 and not a TypeError traceback.
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_compare_uploads_reads_its_fields_the_same_way(self):
        """`compare_uploads` had the identical `.get(f, "")[:2000]` line.

        It is not reachable there in the same way: that view declares only
        MultiPartParser and FormParser, so a JSON body is refused with a 415
        before any of it runs and a form field is always a string. The read is
        still routed through the helper so the two views cannot drift, but the
        crash only ever affected the JSON-parsing endpoints.
        """
        json_attempt = self.client.post(
            "/api/compare-uploads/", {"job_description": None}, format="json"
        )
        self.assertEqual(
            json_attempt.status_code, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        )

        form_attempt = self.client.post("/api/compare-uploads/", {})
        self.assertEqual(form_attempt.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", form_attempt.data)

    def test_the_stored_job_description_is_still_capped_at_2000(self):
        """The column's limit has not changed, only how it is applied."""
        self.assertEqual(MAX_STORED_JOB_DESCRIPTION_LENGTH, 2_000)
        self.assertEqual(
            len(clean_text("x" * 5_000, max_length=MAX_STORED_JOB_DESCRIPTION_LENGTH)),
            2_000,
        )
