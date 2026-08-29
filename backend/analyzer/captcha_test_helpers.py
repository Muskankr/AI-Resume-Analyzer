"""Helpers for tests that need to get *past* the CAPTCHA.

Not a test module — the name deliberately does not start with ``test`` so the
runner does not collect it.

Before #584, ``verify_captcha_token`` accepted the literal string
``"test-captcha-token"`` unconditionally, in production as much as under test.
Eight tests across four modules came to depend on that, which is a fair
illustration of why a convenience backdoor is hard to remove later: by the time
anyone looks, things are resting on it.

There is no replacement backdoor. A test that needs to authenticate solves a
real challenge, the same way a browser does.
"""

from .captcha import issue_challenge


def solve_question(question: str) -> int:
    """Answer a ``"3 + 4"`` style challenge."""
    left, right = question.split("+")
    return int(left.strip()) + int(right.strip())


def solved_captcha() -> dict:
    """Request-body fields carrying a freshly solved challenge.

    Spread into a POST body::

        self.client.post(
            "/api/auth/login/",
            {"username": "u", "password": "p", **solved_captcha()},
        )

    Each call issues its own challenge, because challenges are single-use — two
    requests cannot share one, and a test that reuses a token is testing the
    replay guard rather than whatever it meant to test.
    """
    question, token = issue_challenge()
    return {"captcha_token": token, "captcha_answer": solve_question(question)}
