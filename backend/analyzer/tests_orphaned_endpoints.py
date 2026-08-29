"""Behaviour of the five endpoints routed in #1006.

``tests_api_routes`` asserts that a path resolves. That is deliberately all it
asserts, so it cannot tell the difference between a route that works and a route
that resolves to a view which 500s on every call. These five had never been
reached by a request at all -- the view classes shipped with unit tests for the
engine behind them and no test that went through the URL -- so this file drives
each one end to end.

What it checks, per endpoint:

  - a valid body returns 200 and the shape the response serializer declares
  - an invalid body returns 400 rather than a traceback
  - failures do not put the exception string in the response
  - the throttle is declared and its scope resolves to a real rate
"""

from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle


def throttled_at(scope, rate):
    """Temporarily set the rate for one throttle scope.

    Same reasoning as ``tests_public_endpoint_limits.throttled_at``:
    ``SimpleRateThrottle.THROTTLE_RATES`` is a class attribute bound at import
    time, so ``override_settings`` does not reach it.
    """
    return patch.dict(SimpleRateThrottle.THROTTLE_RATES, {scope: rate})


RESUME = (
    "Senior Engineer with 8+ years of experience in Python. "
    "Architected a payments platform serving 10k users, "
    "reducing checkout latency by 30%. "
    "Projects\n"
    "Billing Rewrite: Built a React dashboard adopted by 40 teams."
)


class EndpointContractTests(TestCase):
    """Each newly routed endpoint answers a well-formed request."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_tone_analysis_returns_the_declared_shape(self):
        resp = self.client.post(
            "/api/analyze-tone/", {"resume_text": RESUME}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for field in (
            "confidence_score",
            "collaboration_score",
            "clarity_score",
            "overall_tone",
            "pronoun_dominance",
            "suggestions",
        ):
            self.assertIn(field, resp.data)

    def test_project_extraction_returns_the_declared_shape(self):
        resp = self.client.post(
            "/api/analyze-projects/", {"resume_text": RESUME}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("total_projects_found", resp.data)
        self.assertIn("average_impact_score", resp.data)
        self.assertIn("projects", resp.data)

    def test_proficiency_estimation_returns_the_declared_shape(self):
        resp = self.client.post(
            "/api/estimate-proficiency/",
            {"resume_text": RESUME, "skills": ["Python", "React"]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total_skills_analyzed"], 2)
        self.assertIn("high_risk_claims_count", resp.data)

    def test_market_value_returns_the_declared_shape(self):
        resp = self.client.post(
            "/api/estimate-market-value/",
            {
                "target_role": "Software Engineer",
                "experience_level": "Senior",
                "skills": ["AWS", "Kubernetes"],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("salary_range", resp.data)
        self.assertIn("negotiation_talking_points", resp.data)
        self.assertLess(
            resp.data["salary_range"]["min"], resp.data["salary_range"]["max"]
        )

    def test_gap_narrative_returns_the_declared_shape(self):
        """Includes total_narratives_generated.

        ``GapNarrativeResponseSerializer`` declares that field as required and
        the view never built it, so ``is_valid(raise_exception=True)`` threw and
        the except block below it turned every *successful* analysis into a 500.
        """
        resp = self.client.post(
            "/api/generate-gap-narrative/",
            {
                "timeline_data": [
                    {
                        "role": "Engineer",
                        "start_date": "Jan 2020",
                        "end_date": "Present",
                    }
                ],
                "context": {"skills": "Python"},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("total_gaps_detected", resp.data)
        self.assertIn("total_narratives_generated", resp.data)
        self.assertIn("gaps", resp.data)


class EndpointValidationTests(TestCase):
    """A malformed body is a 400, not a traceback."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_missing_required_fields_are_rejected(self):
        for path, body in (
            ("/api/analyze-tone/", {}),
            ("/api/analyze-projects/", {}),
            ("/api/estimate-proficiency/", {"resume_text": RESUME}),
            ("/api/estimate-market-value/", {"target_role": "Engineer"}),
            ("/api/generate-gap-narrative/", {}),
        ):
            with self.subTest(path=path):
                resp = self.client.post(path, body, format="json")
                self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("errors", resp.data)

    def test_blank_resume_text_is_rejected(self):
        for path in ("/api/analyze-tone/", "/api/analyze-projects/"):
            with self.subTest(path=path):
                resp = self.client.post(
                    path, {"resume_text": ""}, format="json"
                )
                self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_is_not_allowed(self):
        for path in (
            "/api/analyze-tone/",
            "/api/analyze-projects/",
            "/api/estimate-proficiency/",
            "/api/estimate-market-value/",
            "/api/generate-gap-narrative/",
        ):
            with self.subTest(path=path):
                self.assertEqual(
                    self.client.get(path).status_code,
                    status.HTTP_405_METHOD_NOT_ALLOWED,
                )


class ErrorDetailLeakTests(TestCase):
    """An unexpected failure must not return the exception string.

    All five views returned ``{"error": ..., "details": str(e)}``, which hands
    the caller file paths, SQL and library internals. ``accessibility_views``
    had already removed this pattern with a comment explaining why; these five
    still carried it, and routing them is what made it reachable.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def assert_no_leak(self, path, body, target):
        secret = "/srv/secret/path/credentials.db"
        with patch(target, side_effect=RuntimeError(secret)):
            resp = self.client.post(path, body, format="json")

        self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertNotIn("details", resp.data)
        self.assertNotIn(secret, str(resp.data))
        self.assertIn("error", resp.data)

    def test_tone_analysis_does_not_leak(self):
        self.assert_no_leak(
            "/api/analyze-tone/",
            {"resume_text": RESUME},
            "analyzer.tone_views.analyze_tone",
        )

    def test_project_extraction_does_not_leak(self):
        self.assert_no_leak(
            "/api/analyze-projects/",
            {"resume_text": RESUME},
            "analyzer.project_views.analyze_portfolio",
        )

    def test_proficiency_estimation_does_not_leak(self):
        self.assert_no_leak(
            "/api/estimate-proficiency/",
            {"resume_text": RESUME, "skills": ["Python"]},
            "analyzer.proficiency_views.estimate_all_proficiencies",
        )

    def test_market_value_does_not_leak(self):
        self.assert_no_leak(
            "/api/estimate-market-value/",
            {"target_role": "Engineer", "experience_level": "Senior"},
            "analyzer.market_views.calculate_salary_range",
        )

    def test_gap_narrative_does_not_leak(self):
        self.assert_no_leak(
            "/api/generate-gap-narrative/",
            {
                "timeline_data": [
                    {"role": "A", "start_date": "Jan 2020", "end_date": "Present"}
                ]
            },
            "analyzer.gap_views.detect_gaps",
        )


class EndpointThrottleTests(TestCase):
    """The ceilings actually engage.

    ``OpenEndpointThrottleTests`` asserts a throttle is *declared*. This asserts
    one of them is enforced, so a scope name that never resolves to a rate does
    not pass as protection.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_tone_analysis_is_capped(self):
        def call():
            return self.client.post(
                "/api/analyze-tone/", {"resume_text": RESUME}, format="json"
            )

        with throttled_at("tone_analysis", "2/hour"):
            self.assertEqual(call().status_code, status.HTTP_200_OK)
            self.assertEqual(call().status_code, status.HTTP_200_OK)
            self.assertEqual(
                call().status_code, status.HTTP_429_TOO_MANY_REQUESTS
            )

    def test_availability_check_is_capped(self):
        """The enumeration oracle. Open by design, unbounded by accident."""

        def call(name):
            return self.client.get(
                "/api/auth/check-availability/",
                {"field": "username", "value": name},
            )

        with throttled_at("availability_check", "2/hour"):
            self.assertEqual(call("alice").status_code, status.HTTP_200_OK)
            self.assertEqual(call("bob").status_code, status.HTTP_200_OK)
            self.assertEqual(
                call("carol").status_code, status.HTTP_429_TOO_MANY_REQUESTS
            )

    def test_each_new_scope_is_distinct(self):
        """One endpoint's traffic must not consume another's budget.

        Every AnonRateThrottle subclass inherits scope "anon" unless it sets
        one, which would have shared a single bucket across all five.
        """
        from .gap_views import GapNarrativeThrottle
        from .market_views import MarketValueThrottle
        from .proficiency_views import ProficiencyEstimationThrottle
        from .project_views import ProjectExtractionThrottle
        from .tone_views import ToneAnalysisThrottle

        scopes = [
            GapNarrativeThrottle.scope,
            MarketValueThrottle.scope,
            ProficiencyEstimationThrottle.scope,
            ProjectExtractionThrottle.scope,
            ToneAnalysisThrottle.scope,
        ]
        self.assertEqual(len(scopes), len(set(scopes)))
        self.assertNotIn("anon", scopes)


class ImportJdUrlRouteTests(TestCase):
    """The route dropped by a merge that kept the view.

    Added in ded2a8a (#777), absent from urls.py on main, with
    ``import_jd_url_view`` still defined in views.py -- the same
    conflict-residue shape as #872.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_route_reaches_the_view(self):
        resp = self.client.post("/api/import-jd-url/", {"url": ""}, format="json")
        # 400 from the view's own validation, not 404 from the resolver.
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_non_http_scheme_is_rejected_before_any_fetch(self):
        with patch("requests.get") as fetch:
            resp = self.client.post(
                "/api/import-jd-url/", {"url": "file:///etc/passwd"}, format="json"
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        fetch.assert_not_called()

    def test_outbound_fetching_is_capped(self):
        """Unthrottled this is a request forwarder pointed at any URL."""

        def call():
            return self.client.post(
                "/api/import-jd-url/", {"url": ""}, format="json"
            )

        with throttled_at("import_jd_url", "2/hour"):
            self.assertEqual(call().status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(call().status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                call().status_code, status.HTTP_429_TOO_MANY_REQUESTS
            )
