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
    ("/api/status/abc-123/", "App.tsx"),
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
    ("/api/auth/refresh/", "api/client.ts"),
    ("/api/password-reset/", "AuthModal.tsx"),
    ("/api/password-reset-confirm/", "components/ResetPasswordConfirmPage.tsx"),
]


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
        self.assertEqual(resolve("/api/profile/avatar/").url_name, "profile_avatar")

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
                imported.update(alias.asname or alias.name for alias in node.names)

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
        resp = self.client.post("/api/profile/avatar/", {"avatar": self._png()})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_returns_a_url_and_persists_it(self):
        resp = self.client.post("/api/profile/avatar/", {"avatar": self._png()})

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data["avatar_url"])

        profile = UserProfile.objects.get(user=self.user)
        self.assertTrue(profile.avatar)

    def test_upload_without_a_file_is_a_400(self):
        resp = self.client.post("/api/profile/avatar/", {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_a_disallowed_extension_is_rejected(self):
        bad = SimpleUploadedFile("avatar.txt", b"not an image", content_type="text/plain")
        resp = self.client.post("/api/profile/avatar/", {"avatar": bad})

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

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
        other = User.objects.create_user(username="someoneelse", password="password123")
        UserProfile.objects.get_or_create(user=other)

        self.client.post("/api/profile/avatar/", {"avatar": self._png()})

        self.assertFalse(UserProfile.objects.get(user=other).avatar)
        self.assertTrue(UserProfile.objects.get(user=self.user).avatar)


class SharedResultEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="sharer", password="password123")

    def _analysis(self):
        from analyzer.models import ResumeAnalysis

        return ResumeAnalysis.objects.create(
            user=self.user,
            file_name="resume.pdf",
            score=72,
            skills_found=["python"],
            suggestions=[],
            matched_skills=["python"],
            missing_skills=["docker"],
            target_role="Backend Developer",
        )

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

    def test_an_unknown_share_id_is_a_404(self):
        resp = self.client.get("/api/shared/2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
