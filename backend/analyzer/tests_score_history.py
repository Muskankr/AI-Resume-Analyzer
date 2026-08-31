"""
Tests for the Resume Score History & Trend Analysis engine.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import ResumeAnalysis
from .score_history import (
    ScoreHistoryResult,
    _compute_improvement_metrics,
    _compute_moving_average,
    _compute_skill_progression,
    _compute_trend_stats,
    analyse_score_history,
)

User = get_user_model()


class MovingAverageTests(TestCase):
    def test_basic(self):
        result = _compute_moving_average([50, 60, 70], window=3)
        self.assertEqual(result, [50.0, 55.0, 60.0])

    def test_single_value(self):
        result = _compute_moving_average([80])
        self.assertEqual(result, [80.0])

    def test_empty(self):
        result = _compute_moving_average([])
        self.assertEqual(result, [])


class TrendStatsTests(TestCase):
    def test_basic(self):
        stats = _compute_trend_stats([40, 60, 80])
        self.assertEqual(stats.current_score, 80)
        self.assertEqual(stats.highest_score, 80)
        self.assertEqual(stats.lowest_score, 40)
        self.assertEqual(stats.average_score, 60.0)
        self.assertEqual(stats.total_analyses, 3)

    def test_empty(self):
        stats = _compute_trend_stats([])
        self.assertEqual(stats.total_analyses, 0)

    def test_single(self):
        stats = _compute_trend_stats([75])
        self.assertEqual(stats.current_score, 75)
        self.assertEqual(stats.score_range, 0)


class ImprovementMetricsTests(TestCase):
    def test_improvement(self):
        m = _compute_improvement_metrics([40, 50, 70])
        self.assertEqual(m.total_improvement, 30)
        self.assertEqual(m.analyses_with_improvement, 2)
        self.assertEqual(m.analyses_with_decline, 0)

    def test_decline(self):
        m = _compute_improvement_metrics([80, 70, 60])
        self.assertEqual(m.total_improvement, -20)
        self.assertEqual(m.analyses_with_decline, 2)

    def test_single(self):
        m = _compute_improvement_metrics([50])
        self.assertEqual(m.total_improvement, 0)
        self.assertEqual(m.analyses_unchanged, 1)

    def test_streak(self):
        m = _compute_improvement_metrics([30, 40, 50, 60])
        self.assertEqual(m.improvement_streak, 3)
        self.assertEqual(m.longest_streak, 3)


class SkillProgressionTests(TestCase):
    def test_new_skills(self):
        analyses = [
            {"matched_skills": ["python", "sql"]},
            {"matched_skills": ["python", "sql", "docker"]},
        ]
        sp = _compute_skill_progression(analyses)
        self.assertIn("docker", sp.newly_acquired)

    def test_lost_skills(self):
        analyses = [
            {"matched_skills": ["python", "react"]},
            {"matched_skills": ["python", "vue"]},
        ]
        sp = _compute_skill_progression(analyses)
        self.assertIn("react", sp.lost_skills)
        self.assertIn("vue", sp.newly_acquired)

    def test_empty(self):
        sp = _compute_skill_progression([])
        self.assertEqual(sp.total_unique_skills, 0)


class AnalyseScoreHistoryTests(TestCase):
    def test_basic(self):
        analyses = ResumeAnalysis.objects.filter(pk__in=[])
        result = analyse_score_history(analyses)
        self.assertIsInstance(result, ScoreHistoryResult)
        self.assertEqual(len(result.timeline), 0)

    def test_as_dict(self):
        analyses = ResumeAnalysis.objects.filter(pk__in=[])
        result = analyse_score_history(analyses)
        d = result.as_dict()
        self.assertIn("timeline", d)
        self.assertIn("trend_stats", d)
        self.assertIn("summary", d)


class ScoreHistoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/score-history/"

    def test_unauthenticated(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_history(self):
        user = User.objects.create_user(username="testuser", password="pass123")
        self.client.force_authenticate(user=user)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("timeline", resp.data)
        self.assertEqual(len(resp.data["timeline"]), 0)

    def test_with_history(self):
        user = User.objects.create_user(username="testuser2", password="pass123")
        ResumeAnalysis.objects.create(
            user=user, file_name="r1.pdf", target_role="Frontend Developer",
            score=50, skills_found=[], matched_skills=["html"],
            missing_skills=["react"], suggestions=[], resume_text="",
        )
        ResumeAnalysis.objects.create(
            user=user, file_name="r2.pdf", target_role="Frontend Developer",
            score=70, skills_found=[], matched_skills=["html", "react"],
            missing_skills=[], suggestions=[], resume_text="",
        )
        self.client.force_authenticate(user=user)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["timeline"]), 2)
        self.assertEqual(resp.data["trend_stats"]["current_score"], 70)

    def test_other_user_history_not_visible(self):
        owner = User.objects.create_user(username="owner", password="pass123")
        other = User.objects.create_user(username="other", password="pass123")
        ResumeAnalysis.objects.create(
            user=owner, file_name="r.pdf", target_role="Backend",
            score=60, skills_found=[], matched_skills=[], missing_skills=[],
            suggestions=[], resume_text="",
        )
        self.client.force_authenticate(user=other)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["timeline"]), 0)
