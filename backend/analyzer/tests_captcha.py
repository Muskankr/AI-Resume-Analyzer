"""Tests for the server-issued signup/login CAPTCHA.

The old check accepted any string starting with ``CAP-VERIFIED-`` — a string
the browser made up for itself — plus two hardcoded test tokens that were live
in production. These tests exist mostly to make sure that cannot come back: the
first few assert that the forgeries which used to work now fail.
"""

from django.contrib.auth.models import User
from django.core import signing
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.captcha import (
    CAPTCHA_SALT,
    CHALLENGE_MAX_AGE_SECONDS,
    issue_challenge,
    verify_challenge,
)


def solve(question):
    """Return the answer to a ``"3 + 4"`` style question."""
    left, right = question.split("+")
    return int(left.strip()) + int(right.strip())


def fresh_challenge():
    """Return ``(token, answer)`` for a newly issued challenge."""
    question, token = issue_challenge()
    return token, solve(question)


class ForgedTokenTests(TestCase):
    """The exact bypasses the old implementation allowed."""

    def setUp(self):
        cache.clear()

    def test_rejects_the_old_client_generated_token(self):
        """`CAP-VERIFIED-<ts>-<rand>` was minted in the browser and trusted."""
        self.assertFalse(verify_challenge("CAP-VERIFIED-1699999999999-abc12345", 7))
        self.assertFalse(verify_challenge("CAP-VERIFIED-0000000000000000000", 7))

    def test_rejects_the_hardcoded_test_tokens(self):
        """These were accepted in production, not just under DEBUG."""
        for token in ("PASSED_CAPTCHA_TOKEN_FOR_TESTING", "test-captcha-token"):
            with self.subTest(token=token):
                self.assertFalse(verify_challenge(token, 7))

    def test_rejects_empty_and_non_string_tokens(self):
        for token in ("", None, 12345, []):
            with self.subTest(token=token):
                self.assertFalse(verify_challenge(token, 7))


class VerifyChallengeTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_accepts_the_right_answer(self):
        token, answer = fresh_challenge()
        self.assertTrue(verify_challenge(token, answer))

    def test_accepts_the_answer_as_a_string(self):
        """The input is `type="number"`, so the value arrives as text."""
        token, answer = fresh_challenge()
        self.assertTrue(verify_challenge(token, f"  {answer} "))

    def test_rejects_the_wrong_answer(self):
        token, answer = fresh_challenge()
        self.assertFalse(verify_challenge(token, answer + 1))

    def test_rejects_a_missing_answer(self):
        """A token alone proves nothing — that was the whole original bug."""
        token, _ = fresh_challenge()
        self.assertFalse(verify_challenge(token, None))
        self.assertFalse(verify_challenge(token, ""))

    def test_rejects_a_non_numeric_answer(self):
        token, _ = fresh_challenge()
        for answer in ("seven", "7.5", "0x7", True):
            with self.subTest(answer=answer):
                self.assertFalse(verify_challenge(token, answer))

    def test_rejects_a_tampered_token(self):
        token, answer = fresh_challenge()
        tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
        self.assertFalse(verify_challenge(tampered, answer))

    def test_rejects_a_token_signed_with_a_different_salt(self):
        """A token from elsewhere in the project must not work here."""
        foreign = signing.dumps({"a": 7, "n": "abc"}, salt="analyzer.digest.unsubscribe")
        self.assertFalse(verify_challenge(foreign, 7))

    def test_rejects_an_expired_token(self):
        """A stockpile of pre-solved challenges must go stale."""
        token, answer = fresh_challenge()
        self.assertFalse(_verify_expired(token, answer))

    def test_rejects_a_payload_without_an_answer(self):
        """Well-signed but wrong shape — must not be trusted."""
        empty = signing.dumps({"n": "abc"}, salt=CAPTCHA_SALT)
        self.assertFalse(verify_challenge(empty, 7))

        no_nonce = signing.dumps({"a": 7}, salt=CAPTCHA_SALT)
        self.assertFalse(verify_challenge(no_nonce, 7))

    def test_a_solved_token_cannot_be_reused(self):
        """One human solve must not authorise a batch of signups."""
        token, answer = fresh_challenge()
        self.assertTrue(verify_challenge(token, answer))
        self.assertFalse(verify_challenge(token, answer))
        self.assertFalse(verify_challenge(token, answer))

    def test_checking_without_consuming_leaves_the_token_usable(self):
        token, answer = fresh_challenge()
        self.assertTrue(verify_challenge(token, answer, consume=False))
        self.assertTrue(verify_challenge(token, answer))

    def test_a_wrong_answer_does_not_burn_the_token(self):
        """A typo should not cost the user a fresh puzzle."""
        token, answer = fresh_challenge()
        self.assertFalse(verify_challenge(token, answer + 1))
        self.assertTrue(verify_challenge(token, answer))

    def test_each_challenge_gets_its_own_nonce(self):
        first_token, first_answer = fresh_challenge()
        second_token, second_answer = fresh_challenge()

        self.assertNotEqual(first_token, second_token)
        self.assertTrue(verify_challenge(first_token, first_answer))
        # Burning the first must not affect the second.
        self.assertTrue(verify_challenge(second_token, second_answer))


def _verify_expired(token, answer):
    """Verify ``token`` as though its whole lifetime had already elapsed."""
    from unittest.mock import patch

    real_loads = signing.loads

    def aged_loads(value, **kwargs):
        kwargs["max_age"] = -1
        return real_loads(value, **kwargs)

    with patch("analyzer.captcha.signing.loads", side_effect=aged_loads):
        return verify_challenge(token, answer)


class CaptchaEndpointTests(TestCase):
    """`GET /api/captcha/` hands out a solvable challenge."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_returns_a_question_and_token(self):
        resp = self.client.get("/api/captcha/")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("question", resp.data)
        self.assertIn("captcha_token", resp.data)

    def test_the_issued_challenge_verifies(self):
        resp = self.client.get("/api/captcha/")
        token = resp.data["captcha_token"]
        answer = solve(resp.data["question"])

        self.assertTrue(verify_challenge(token, answer))

    def test_the_token_does_not_reveal_the_answer_in_the_clear(self):
        """It is signed, not encrypted — but it must not be plainly readable."""
        resp = self.client.get("/api/captcha/")
        question = resp.data["question"]
        answer = str(solve(question))

        # The signed payload is base64, so the bare digits should not appear as
        # a readable substring the way `"answer": 7` would.
        self.assertNotIn(f'"a": {answer}', resp.data["captcha_token"])

    def test_needs_no_authentication(self):
        resp = self.client.get("/api/captcha/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class SignupCaptchaTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _signup(self, **overrides):
        token, answer = fresh_challenge()
        body = {
            "username": "newperson",
            "password": "a-long-enough-password",
            "captcha_token": token,
            "captcha_answer": answer,
        }
        body.update(overrides)
        return self.client.post("/api/auth/signup/", body, format="json")

    def test_creates_the_account_with_a_solved_challenge(self):
        resp = self._signup()

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newperson").exists())

    def test_returns_tokens_so_no_second_captcha_is_needed(self):
        """Signup used to auto-login with the same token, which is now spent."""
        resp = self._signup()

        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)

    def test_rejects_the_old_forged_token(self):
        resp = self._signup(captcha_token="CAP-VERIFIED-1699999999999-abc12345")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("captcha_token", resp.data)
        self.assertFalse(User.objects.filter(username="newperson").exists())

    def test_rejects_a_token_with_no_answer(self):
        resp = self._signup(captcha_answer=None)

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="newperson").exists())

    def test_rejects_a_wrong_answer(self):
        token, answer = fresh_challenge()
        resp = self.client.post(
            "/api/auth/signup/",
            {
                "username": "newperson",
                "password": "a-long-enough-password",
                "captcha_token": token,
                "captcha_answer": answer + 3,
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="newperson").exists())

    def test_a_solved_challenge_cannot_create_two_accounts(self):
        token, answer = fresh_challenge()

        first = self.client.post(
            "/api/auth/signup/",
            {
                "username": "first",
                "password": "a-long-enough-password",
                "captcha_token": token,
                "captcha_answer": answer,
            },
            format="json",
        )
        second = self.client.post(
            "/api/auth/signup/",
            {
                "username": "second",
                "password": "a-long-enough-password",
                "captcha_token": token,
                "captcha_answer": answer,
            },
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="second").exists())

    def test_cannot_probe_for_taken_usernames_without_solving(self):
        """An unsolved request must not reveal whether an account exists."""
        User.objects.create_user(username="taken", password="x-long-password")

        resp = self.client.post(
            "/api/auth/signup/",
            {
                "username": "taken",
                "password": "a-long-enough-password",
                "captcha_token": "CAP-VERIFIED-1699999999999-abc12345",
                "captcha_answer": 7,
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # The CAPTCHA is what failed, so the reply says nothing about the name.
        self.assertIn("captcha_token", resp.data)
        self.assertNotIn("username", resp.data)

    def test_an_invalid_username_does_not_spend_the_challenge(self):
        """Fixing a taken username should not cost a fresh puzzle."""
        User.objects.create_user(username="taken", password="x-long-password")
        token, answer = fresh_challenge()

        clash = self.client.post(
            "/api/auth/signup/",
            {
                "username": "taken",
                "password": "a-long-enough-password",
                "captcha_token": token,
                "captcha_answer": answer,
            },
            format="json",
        )
        self.assertEqual(clash.status_code, status.HTTP_400_BAD_REQUEST)

        retry = self.client.post(
            "/api/auth/signup/",
            {
                "username": "available",
                "password": "a-long-enough-password",
                "captcha_token": token,
                "captcha_answer": answer,
            },
            format="json",
        )
        self.assertEqual(retry.status_code, status.HTTP_201_CREATED)


class LoginCaptchaTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="returning", password="a-long-enough-password"
        )

    def test_logs_in_with_a_solved_challenge(self):
        token, answer = fresh_challenge()
        resp = self.client.post(
            "/api/auth/login/",
            {
                "username": "returning",
                "password": "a-long-enough-password",
                "captcha_token": token,
                "captcha_answer": answer,
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)

    def test_rejects_the_old_forged_token(self):
        """Login is the endpoint with no throttle, so this one matters most."""
        resp = self.client.post(
            "/api/auth/login/",
            {
                "username": "returning",
                "password": "a-long-enough-password",
                "captcha_token": "CAP-VERIFIED-1699999999999-abc12345",
                "captcha_answer": 7,
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("access", resp.data)

    def test_rejects_a_missing_challenge(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "returning", "password": "a-long-enough-password"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_challenge_lifetime_is_not_open_ended(self):
        """Guards against the TTL being widened to something meaningless."""
        self.assertLessEqual(CHALLENGE_MAX_AGE_SECONDS, 30 * 60)
