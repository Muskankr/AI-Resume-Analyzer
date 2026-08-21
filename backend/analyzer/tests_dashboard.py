from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from .models import ResumeAnalysis

class DashboardStatsTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="testuser", password="testpassword")
        self.other_user = User.objects.create_user(username="otheruser", password="testpassword")
        self.url = reverse("dashboard_stats")

        # Create analyses for testuser
        ResumeAnalysis.objects.create(
            user=self.user,
            file_name="resume1.pdf",
            score=80,
            skills_found=["python", "django", "react"],
            missing_skills=["aws", "docker"],
            target_role="Backend Developer"
        )
        ResumeAnalysis.objects.create(
            user=self.user,
            file_name="resume2.pdf",
            score=90,
            skills_found=["python", "fastapi", "react"],
            missing_skills=["kubernetes"],
            target_role="Backend Developer"
        )
        ResumeAnalysis.objects.create(
            user=self.user,
            file_name="resume3.pdf",
            score=70,
            skills_found=["javascript", "react"],
            missing_skills=["typescript", "redux"],
            target_role="Frontend Developer"
        )
        
        # Create for other user
        ResumeAnalysis.objects.create(
            user=self.other_user,
            file_name="other.pdf",
            score=100,
            skills_found=["everything"],
            missing_skills=[],
            target_role="CTO"
        )

    def test_dashboard_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_dashboard_stats_success(self):
        # Authenticate via JWT for test
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(self.user)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token.access_token}'

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data["total_analyses"], 3)
        self.assertEqual(data["average_score"], 80.0) # (80+90+70)/3
        
        # Roles
        roles = data["scores_by_role"]
        self.assertEqual(len(roles), 2)
        backend = next(r for r in roles if r["role"] == "Backend Developer")
        self.assertEqual(backend["count"], 2)
        self.assertEqual(backend["average_score"], 85.0)

        # Top found skills
        top_found = {item["skill"]: item["count"] for item in data["top_skills_found"]}
        self.assertEqual(top_found["react"], 3)
        self.assertEqual(top_found["python"], 2)

        # Timeline
        timeline = data["recent_timeline"]
        self.assertEqual(len(timeline), 3)

    def test_dashboard_empty_stats(self):
        token = RefreshToken.for_user(self.user)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token.access_token}'
        ResumeAnalysis.objects.all().delete()
        
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data["total_analyses"], 0)
        self.assertEqual(data["average_score"], 0)
        self.assertEqual(data["scores_by_role"], [])
