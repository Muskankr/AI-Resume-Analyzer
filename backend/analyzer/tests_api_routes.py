"""A contract test over the API paths the frontend actually requests.

Two shipped features were calling URLs Django does not serve. `profile_avatar_view`
was written, imported into ``urls.py`` and then never given a ``path()``, so every
avatar upload 404'd; and ``SharedResultView`` asked for ``/api/analyzer/shared/<id>/``
when the route is ``/api/shared/<id>/``, so every share link rendered "Result Not
Found". Both failure modes look exactly like an ordinary server error from the
UI, which is why neither was reported as a routing problem.

Individual view tests cannot catch this. They exercise the view — often by
calling it directly, or by hitting a path the same test file made up — and stay
green whether or not the URL a browser would use resolves to anything.

So this file asserts the opposite direction: for each path the frontend is known
to request, *something* resolves. It deliberately checks routing only, not
behaviour. Every entry carries the frontend file that calls it, so a route that
is deleted on purpose fails here with a pointer to what still depends on it.

When you add an endpoint the frontend calls, add it to ROUTES below.
"""

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import Resolver404, resolve
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import UserProfile

#: (path, the frontend source that requests it)
#:
#: Paths with parameters use a representative value; the resolver only cares
#: that the pattern matches.
ROUTES = [
    ("/api/upload/", "App.tsx"),
    ("/api/batch-upload/", "pages/Recruiter/DragDropBatchZone.tsx"),
    ("/api/status/abc-123/", "App.tsx"),
    ("/api/batch-status/abc-123/", "pages/Recruiter/BatchProgressPanel.tsx"),
    ("/api/history/", "App.tsx, hooks/useAnalysisHistory.ts"),
    ("/api/history/1/", "HistorySidebar.tsx"),
    ("/api/history/clear/", "HistorySidebar.tsx"),
    ("/api/compare/", "hooks/useCompareVersions.ts"),
    ("/api/compare-uploads/", "components/CompareVersions/CompareUploads.tsx"),
    ("/api/compare-bulk-jds/", "components/CompareVersions/CompareBulkJds.tsx"),
    ("/api/suggestion-feedback/", "App.tsx"),
    ("/api/analyze-jd/", "components/JdVisualizerPanel.tsx"),
    ("/api/skills-leaderboard/", "components/SkillsLeaderboard.tsx"),
    ("/api/mock-interview/", "components/InterviewQuestionsPanel.tsx"),
    ("/api/contact/", "pages/ContactPage.tsx"),
    ("/api/unsubscribe/", "pages/UnsubscribePage.tsx"),
    ("/api/account/export/", "hooks/useAuth.ts"),
    ("/api/admin/stats/", "components/AdminDashboard.tsx"),
    ("/api/profile/", "components/ProfilePage.tsx"),
    # Regressions this file was written for.
    ("/api/profile/avatar/", "components/ProfileModal.tsx"),
    (
        "/api/shared/2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33/",
        "SharedResultView.tsx",
    ),
    ("/api/auth/signup/", "hooks/useAuth.ts"),
    ("/api/auth/login/", "hooks/useAuth.ts"),
    ("/api/auth/oauth/", "hooks/useAuth.ts"),
    ("/api/auth/refresh/", "api/client.ts"),
    ("/api/password-reset/", "AuthModal.tsx"),
    ("/api/password-reset-confirm/", "components/ResetPasswordConfirmPage.tsx"),
    # Six features whose views, serializers and engines were all written and
    # then never given a path. Every one of them 404'd from the day it shipped.
    ("/api/analyzer/optimize-bullets/", "services/bulletOptimizationService.ts"),
    ("/api/analyzer/semantic-diff/", "components/ResumeDiffViewer.tsx"),
    (
        "/api/analyzer/generate-interview-questions/",
        "hooks/useInterviewQuestions.ts",
    ),
    ("/api/analyzer/detect-language/", "services/translationService.ts"),
    ("/api/analyzer/translate/", "services/translationService.ts"),
    # Not called from the frontend yet. Routed in the same pass rather than
    # left as the next 404.
    ("/api/analyzer/layout-analysis/", "components/LayoutAnalysisReport.tsx"),
    # And again, for the five features merged in #929-#933. Seven more view
    # classes written, tested and never given a path. The React components
    # below were merged calling these exact URLs.
    ("/api/ab-testing-stats/", "components/ResumeABTesting.tsx"),
    ("/api/log-application/", "components/ResumeABTesting.tsx"),
    ("/api/check-accessibility/", "components/AccessibilityReport.tsx"),
    ("/api/detect-cliches/", "components/ClicheDetector.tsx"),
    ("/api/optimize-linkedin/", "components/LinkedInOptimizer.tsx"),
    ("/api/file-metadata/", "components/PrivacyScrubber.tsx"),
    ("/api/sanitize-resume/", "components/PrivacyScrubber.tsx"),
]

#: Endpoints that are open by default and therefore must declare a throttle.
#:
#: ``DEFAULT_PERMISSION_CLASSES`` is ``AllowAny``. A view that neither
#: overrides it nor sets ``throttle_classes`` is an unauthenticated endpoint
#: with no ceiling, which settings.py already states the project does not
#: ship. Asserting it here means the next such view fails the build instead of
#: reaching production, which is how all five of these got in.
THROTTLE_EXEMPT_VIEW_NAMES = frozenset(
    {
        # Authenticated: the user id is the natural bound.
        "ABTestingStatsView",
        "LogApplicationView",
        # --- Pre-existing, not introduced by this pass ---
        #
        # The list below is a baseline, not an endorsement. The assertion's
        # job is to stop the *next* unbounded open endpoint, and it can only
        # do that if it is green today. Each of these deserves its own look;
        # tightening them is a change to their own behaviour and belongs with
        # whoever owns them, not bundled into a routing fix.
        #
        # Third-party views this project does not define:
        "SpectacularAPIView",
        "SpectacularSwaggerView",
        "TokenRefreshView",
        "CustomTokenObtainPairView",
        # Project views that predate this check:
        "preview_experience_level_view",
        "resume_score_badge",
        "unsubscribe_digest_view",
    }
)


class FrontendRouteContractTests(TestCase):
    def test_every_path_the_frontend_calls_resolves(self):
        unresolved = []

        for path, caller in ROUTES:
            with self.subTest(path=path):
                try:
                    resolve(path)
                except Resolver404:
                    unresolved.append(f"{path}  (requested by {caller})")

        self.assertEqual(
            unresolved,
            [],
            "These paths are requested by the frontend but resolve to nothing:\n  "
            + "\n  ".join(unresolved),
        )

    def test_the_avatar_endpoint_is_routed(self):
        """The specific gap: a view that existed, was imported, and was never published."""
        self.assertEqual(
            resolve("/api/profile/avatar/").url_name, "profile_avatar")

    def test_the_share_endpoint_is_not_under_an_analyzer_prefix(self):
        """`analyzer.urls` is included under `api/`, so `api/analyzer/` is not a thing.

        Pinned as a negative assertion because the wrong path is a plausible
        guess — the app is called `analyzer`, so `/api/analyzer/...` reads as if
        it ought to work.
        """
        share_id = "2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33"
        self.assertIsNotNone(resolve(f"/api/shared/{share_id}/"))
        with self.assertRaises(Resolver404):
            resolve(f"/api/analyzer/shared/{share_id}/")

    def test_a_view_imported_into_urls_is_also_routed(self):
        """Catch the next `profile_avatar_view` automatically.

        Importing a view into ``urls.py`` and not routing it is a silent
        mistake: the module still imports, the checks still pass, and the only
        symptom is a 404 in production. Reading the names ``urls.py`` imports
        and comparing them against the callbacks it registers turns that into a
        test failure.
        """
        import ast
        import inspect

        from analyzer import urls as urls_module

        source = inspect.getsource(urls_module)
        tree = ast.parse(source)

        imported = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and (node.module or "").startswith(
                ("views", ".views", "analyzer.views")
            ):
                imported.update(
                    alias.asname or alias.name for alias in node.names)

        # `path(..., some_view)` and `path(..., SomeView.as_view())`.
        routed = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "path":
                for arg in node.args[1:2]:
                    if isinstance(arg, ast.Name):
                        routed.add(arg.id)
                    elif isinstance(arg, ast.Call) and isinstance(
                        arg.func, ast.Attribute
                    ):
                        target = arg.func.value
                        if isinstance(target, ast.Name):
                            routed.add(target.id)

        unrouted = sorted(imported - routed)
        self.assertEqual(
            unrouted,
            [],
            "These views are imported into analyzer/urls.py but never routed, "
            f"so nothing can reach them: {unrouted}",
        )


@override_settings(MEDIA_ROOT="/tmp/ai-resume-analyzer-test-media")
class ProfileAvatarEndpointTests(TestCase):
    """The avatar endpoint's behaviour, now that it is reachable.

    `force_authenticate` rather than a real login, so these stay about the
    avatar endpoint and do not also depend on the CAPTCHA flow.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="avatarowner", password="password123"
        )
        self.client.force_authenticate(user=self.user)

    def _png(self, name="avatar.png", size=32):
        # A real PNG signature, so this keeps working if content validation is
        # tightened later.
        content = b"\x89PNG\r\n\x1a\n" + b"\x00" * size
        return SimpleUploadedFile(name, content, content_type="image/png")

    def test_upload_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post("/api/profile/avatar/",
                                {"avatar": self._png()})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_returns_a_url_and_persists_it(self):
        resp = self.client.post("/api/profile/avatar/",
                                {"avatar": self._png()})

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data["avatar_url"])

        profile = UserProfile.objects.get(user=self.user)
        self.assertTrue(profile.avatar)

    def test_upload_without_a_file_is_a_400(self):
        resp = self.client.post("/api/profile/avatar/", {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_a_disallowed_extension_is_rejected(self):
        bad = SimpleUploadedFile(
            "avatar.txt", b"not an image", content_type="text/plain")
        resp = self.client.post("/api/profile/avatar/", {"avatar": bad})

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_a_renamed_non_image_is_rejected(self):
        renamed = SimpleUploadedFile(
            "avatar.png", b"this is not image data", content_type="image/png"
        )
        resp = self.client.post("/api/profile/avatar/", {"avatar": renamed})

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not look like a valid", resp.data["error"])

    def test_an_image_signature_must_match_its_extension(self):
        jpeg_named_as_png = SimpleUploadedFile(
            "avatar.png", b"\xff\xd8\xff\xe0" + b"\x00" * 32, content_type="image/png"
        )
        resp = self.client.post(
            "/api/profile/avatar/", {"avatar": jpeg_named_as_png}
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not look like a valid", resp.data["error"])

    def test_an_oversized_image_is_rejected(self):
        huge = SimpleUploadedFile(
            "avatar.png", b"\x89PNG\r\n\x1a\n" + b"x" * (2 * 1024 * 1024),
            content_type="image/png",
        )
        resp = self.client.post("/api/profile/avatar/", {"avatar": huge})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_removes_the_avatar(self):
        self.client.post("/api/profile/avatar/", {"avatar": self._png()})

        resp = self.client.delete("/api/profile/avatar/")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        profile = UserProfile.objects.get(user=self.user)
        self.assertFalse(profile.avatar)

    def test_delete_with_no_avatar_set_is_not_an_error(self):
        resp = self.client.delete("/api/profile/avatar/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_one_user_cannot_touch_another_users_avatar(self):
        """There is no id in the path, so this is really a check that the view
        keys off request.user rather than anything the caller supplies."""
        other = User.objects.create_user(
            username="someoneelse", password="password123")
        UserProfile.objects.get_or_create(user=other)

        self.client.post("/api/profile/avatar/", {"avatar": self._png()})

        self.assertFalse(UserProfile.objects.get(user=other).avatar)
        self.assertTrue(UserProfile.objects.get(user=self.user).avatar)


class SharedResultEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="sharer", password="password123")

    def _analysis(self, shared=True):
        """Create an analysis, published by default.

        Sharing became opt-in in #705 — an analysis is no longer readable by id
        just because it exists — so these routing tests, which are about the URL
        resolving, have to publish first. The lifecycle itself is covered in
        ``tests_share_privacy``.
        """
        from analyzer.models import ResumeAnalysis

        analysis = ResumeAnalysis.objects.create(
            user=self.user,
            file_name="resume.pdf",
            score=72,
            skills_found=["python"],
            suggestions=[],
            matched_skills=["python"],
            missing_skills=["docker"],
            target_role="Backend Developer",
        )
        if shared:
            analysis.enable_sharing(lifetime_days=30)
        return analysis

    def test_a_share_link_resolves_and_returns_the_analysis(self):
        analysis = self._analysis()
        resp = self.client.get(f"/api/shared/{analysis.share_id}/")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["score"], 72)

    def test_a_share_link_needs_no_authentication(self):
        analysis = self._analysis()
        self.client.force_authenticate(user=None)

        resp = self.client.get(f"/api/shared/{analysis.share_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_an_unshared_analysis_is_not_reachable_by_id(self):
        analysis = self._analysis(shared=False)

        resp = self.client.get(f"/api/shared/{analysis.share_id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_an_unknown_share_id_is_a_404(self):
        resp = self.client.get(
            "/api/shared/2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class ViewModuleRoutingTests(TestCase):
    """Every view class in the app must be reachable from a URL.

    ``test_a_view_imported_into_urls_is_also_routed`` above catches a view that
    ``urls.py`` imports and forgets to route. It cannot catch the larger
    mistake: a whole feature module that ``urls.py`` never imports at all.

    That is how six endpoints shipped dead. ``bullet_views.py``,
    ``diff_views.py``, ``interview_views.py``, ``layout_views.py`` and
    ``multilingual_views.py`` each had a view, a serializer, a throttle class
    and a docstring describing the endpoint — and no ``path()`` anywhere. The
    app imported cleanly, the checks passed, and the only symptom was a 404
    that looks identical to a signed-out session from the browser.

    So this walks the app for view modules and asserts each view class in them
    is registered, without ``urls.py`` getting a say in which modules count.
    """

    #: Modules whose views are deliberately not routed here.
    #:
    #: ``views.py`` holds the function-based views plus a handful of DRF
    #: generic base classes; it is already covered by the import/route check
    #: above, and walking it would flag the bases.
    EXEMPT_MODULES = {"views"}

    @staticmethod
    def _view_modules():
        """Every ``*_views.py`` module in the app, imported."""
        import importlib
        from pathlib import Path

        app_dir = Path(__file__).resolve().parent
        for path in sorted(app_dir.glob("*_views.py")):
            if path.stem in ViewModuleRoutingTests.EXEMPT_MODULES:
                continue
            yield importlib.import_module(f"analyzer.{path.stem}")

    @staticmethod
    def _view_classes(module):
        """APIView subclasses *defined in* ``module``.

        Defined in, not merely visible from: ``APIView`` itself and any base
        imported for subclassing would otherwise be reported as unrouted.
        """
        import inspect

        from rest_framework.views import APIView

        for _, obj in inspect.getmembers(module, inspect.isclass):
            if not issubclass(obj, APIView) or obj is APIView:
                continue
            if obj.__module__ != module.__name__:
                continue
            yield obj

    @staticmethod
    def _routed_view_classes():
        """Every view class registered in the project's URL configuration."""
        from django.urls import get_resolver

        routed = set()

        def walk(patterns):
            for pattern in patterns:
                sub = getattr(pattern, "url_patterns", None)
                if sub is not None:
                    walk(sub)
                    continue
                callback = getattr(pattern, "callback", None)
                # `as_view()` hangs the class off the callback as `cls`; this
                # is the documented way back from a route to its view class.
                view_class = getattr(callback, "cls", None) or getattr(
                    callback, "view_class", None
                )
                if view_class is not None:
                    routed.add(view_class)

        walk(get_resolver().url_patterns)
        return routed

    def test_every_view_class_in_a_view_module_is_routed(self):
        routed = self._routed_view_classes()

        unrouted = []
        for module in self._view_modules():
            for view_class in self._view_classes(module):
                if view_class not in routed:
                    unrouted.append(f"{module.__name__}.{view_class.__name__}")

        self.assertEqual(
            sorted(unrouted),
            [],
            "These view classes are defined but no URL reaches them, so the "
            "features they implement are dead on arrival:\n  "
            + "\n  ".join(sorted(unrouted)),
        )

    def test_the_walk_actually_finds_view_modules(self):
        """Guards the guard: an empty walk would pass the assertion above."""
        modules = list(self._view_modules())
        self.assertGreaterEqual(
            len(modules),
            5,
            f"Expected the app to hold several *_views.py modules, found {len(modules)}.",
        )


class MultilingualEndpointTests(TestCase):
    """Behaviour of the two endpoints that had no view module at all.

    ``multilingual_serializers.py`` described this contract from the start.
    Nothing implemented it.
    """

    def setUp(self):
        # DRF keeps throttle history in the default cache, which persists
        # across tests in the same process. Without this, the endpoint tested
        # last inherits every earlier test's requests and 429s.
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="polyglot", password="password123"
        )
        self.client.force_authenticate(user=self.user)

    def test_detection_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post("/api/analyzer/detect-language/", {"text": "Hello"})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_detection_returns_the_documented_shape(self):
        resp = self.client.post(
            "/api/analyzer/detect-language/",
            {"text": "Experienced backend engineer working with Python and Django."},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            sorted(resp.data),
            ["confidence", "is_english", "language_code", "language_name", "method_used"],
        )

    def test_detection_flag_agrees_with_the_code_it_reports(self):
        """`is_english` is derived from the same result, so it cannot contradict it."""
        resp = self.client.post(
            "/api/analyzer/detect-language/",
            {"text": "Ingeniero de software con experiencia en sistemas distribuidos."},
            format="json",
        )

        self.assertEqual(
            resp.data["is_english"], resp.data["language_code"] == "en"
        )

    def test_detection_rejects_a_missing_text_field(self):
        resp = self.client.post("/api/analyzer/detect-language/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("text", resp.data)

    def test_translation_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post("/api/analyzer/translate/", {"text": "Hola"})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_translation_returns_the_documented_shape(self):
        resp = self.client.post(
            "/api/analyzer/translate/",
            {"text": "Bonjour, je suis ingenieur.", "source_language": "fr"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for field in (
            "original_text",
            "translated_text",
            "source_language",
            "target_language",
            "success",
        ):
            self.assertIn(field, resp.data)
        self.assertEqual(resp.data["target_language"], "en")

    def test_translation_detects_the_source_when_asked_to(self):
        """`auto` is the serializer's default, so the common call must work."""
        resp = self.client.post(
            "/api/analyzer/translate/",
            {"text": "Ingeniero de software con experiencia en sistemas."},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotEqual(resp.data["source_language"], "auto")

    def test_translation_to_a_language_other_than_english_is_refused(self):
        """The scoring engine reads English; translating away from it scores nothing."""
        resp = self.client.post(
            "/api/analyzer/translate/",
            {"text": "Hello there.", "target_language": "fr"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_translation_rejects_a_missing_text_field(self):
        resp = self.client.post("/api/analyzer/translate/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("text", resp.data)


class RoutedFeatureEndpointTests(TestCase):
    """The four modules that had a view but no path, now that they have one.

    Shallow on purpose. Each engine has its own test file; what was missing was
    any assertion that a request can reach one.
    """

    def setUp(self):
        # DRF keeps throttle history in the default cache, which persists
        # across tests in the same process. Without this, the endpoint tested
        # last inherits every earlier test's requests and 429s.
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="jobseeker", password="password123"
        )
        self.client.force_authenticate(user=self.user)

    def test_bullet_optimization_reaches_the_optimizer(self):
        resp = self.client.post(
            "/api/analyzer/optimize-bullets/",
            {"bullets": ["Managed a team of five engineers."]},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total_processed"], 1)
        self.assertEqual(len(resp.data["results"]), 1)

    def test_bullet_optimization_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(
            "/api/analyzer/optimize-bullets/", {"bullets": ["x"]}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_semantic_diff_reaches_the_differ(self):
        resp = self.client.post(
            "/api/analyzer/semantic-diff/",
            {
                "text_v1": "Skills\nPython, Django",
                "text_v2": "Skills\nPython, Django, AWS",
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("summary", resp.data)
        self.assertIn("changes", resp.data)

    def test_interview_generation_reaches_the_generator(self):
        resp = self.client.post(
            "/api/analyzer/generate-interview-questions/",
            {
                "resume_text": "Backend engineer. Led a team. Built services in Python.",
                "skills": ["python", "django"],
                "job_description": "We need someone strong in Kubernetes and AWS.",
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreater(resp.data["total_questions"], 0)
        self.assertEqual(len(resp.data["questions"]), resp.data["total_questions"])

    def test_layout_analysis_rejects_a_request_with_no_file(self):
        resp = self.client.post("/api/analyzer/layout-analysis/", {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_layout_analysis_rejects_a_non_pdf(self):
        upload = SimpleUploadedFile(
            "resume.txt", b"plain text resume", content_type="text/plain"
        )
        resp = self.client.post("/api/analyzer/layout-analysis/", {"file": upload})

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)


class OpenEndpointThrottleTests(TestCase):
    """Every routed view that is open to anonymous callers declares a ceiling.

    The five features merged in #929-#933 each shipped a view with no
    ``permission_classes`` and no ``throttle_classes``. Routing them without
    fixing that would have opened five unauthenticated endpoints with no
    limit, one of which writes its request body to disk.

    This walks what is actually routed rather than a hand-written list, so a
    new open endpoint is covered the day it is added.
    """

    @staticmethod
    def _routed_view_classes():
        from django.urls import get_resolver

        routed = {}

        def walk(patterns):
            for pattern in patterns:
                sub = getattr(pattern, "url_patterns", None)
                if sub is not None:
                    walk(sub)
                    continue
                callback = getattr(pattern, "callback", None)
                view_class = getattr(callback, "cls", None)
                if view_class is not None:
                    routed[view_class] = str(pattern.pattern)

        walk(get_resolver().url_patterns)
        return routed

    def test_every_open_routed_view_declares_a_throttle(self):
        from rest_framework.permissions import AllowAny

        unlimited = []

        for view_class, route in self._routed_view_classes().items():
            if view_class.__name__ in THROTTLE_EXEMPT_VIEW_NAMES:
                continue

            permissions = getattr(view_class, "permission_classes", [])
            is_open = not permissions or all(p is AllowAny for p in permissions)
            if not is_open:
                continue

            if not getattr(view_class, "throttle_classes", []):
                unlimited.append(f"{view_class.__name__}  ({route})")

        self.assertEqual(
            sorted(unlimited),
            [],
            "These views are reachable without authentication and declare no "
            "throttle, so they are unbounded:\n  " + "\n  ".join(sorted(unlimited)),
        )

    def test_every_declared_throttle_scope_has_a_rate(self):
        """A scope with no entry in DEFAULT_THROTTLE_RATES raises at request time.

        ``ScopedRateThrottle``/``AnonRateThrottle`` look the scope up in
        ``DEFAULT_THROTTLE_RATES`` and raise ``ImproperlyConfigured`` if it is
        missing — but only when a request arrives, so a typo in either half of
        the pair is invisible until the endpoint is called.
        """
        from django.conf import settings
        from rest_framework.throttling import SimpleRateThrottle

        rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
        missing = []

        for view_class in self._routed_view_classes():
            for throttle_class in getattr(view_class, "throttle_classes", []):
                scope = getattr(throttle_class, "scope", None)
                if scope is None:
                    continue
                # A throttle that hardcodes `rate`, or overrides `get_rate` to
                # read a setting of its own (UploadRateThrottle, and the two
                # in views.py that size themselves), never consults
                # DEFAULT_THROTTLE_RATES and so cannot be missing from it.
                if getattr(throttle_class, "rate", None):
                    continue
                if throttle_class.get_rate is not SimpleRateThrottle.get_rate:
                    continue
                if scope not in rates:
                    missing.append(
                        f"{view_class.__name__} -> "
                        f"{throttle_class.__name__}(scope={scope!r})"
                    )

        self.assertEqual(
            sorted(missing),
            [],
            "These throttle scopes have no rate in DEFAULT_THROTTLE_RATES, so "
            "the endpoint raises ImproperlyConfigured on its first request:\n  "
            + "\n  ".join(sorted(missing)),
        )
