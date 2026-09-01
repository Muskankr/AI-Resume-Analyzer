"""
Tests for the Career Path Recommendation Engine.

Covers:
    - Engine logic (generate_career_path)
    - Phase construction and action prioritisation
    - Score projection with diminishing returns
    - API endpoint (POST /api/career-path/)
    - Error handling for invalid inputs
"""

import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.client import RequestFactory
from rest_framework import status
from rest_framework.test import APIClient

from .career_path import (
    SKILL_CATALOG,
    CareerPathPlan,
    RoadmapAction,
    RoadmapPhase,
    _compute_projected_score,
    _estimate_score_impact,
    _lookup_skill,
    _make_skill_action,
    _priority_for_impact,
    generate_career_path,
)
from .career_path_serializers import (
    CareerPathPlanSerializer,
    CareerPathRequestSerializer,
)
from .models import ResumeAnalysis

User = get_user_model()


# ── Unit tests: skill catalog ─────────────────────────────────────────────


class SkillCatalogTests(TestCase):
    """Verify the skill metadata catalog is well-formed."""

    def test_all_skills_have_valid_tiers(self):
        valid_tiers = {"junior", "mid", "senior"}
        for name, meta in SKILL_CATALOG.items():
            self.assertIn(
                meta.tier, valid_tiers,
                f"Skill '{name}' has invalid tier '{meta.tier}'",
            )

    def test_all_skills_have_positive_weights(self):
        for name, meta in SKILL_CATALOG.items():
            self.assertGreater(
                meta.impact_weight, 0,
                f"Skill '{name}' has zero impact weight",
            )

    def test_lookup_is_case_insensitive(self):
        meta = _lookup_skill("Python")
        self.assertIsNotNone(meta)
        self.assertEqual(meta.name, "Python")

    def test_lookup_returns_none_for_unknown(self):
        self.assertIsNone(_lookup_skill("QuantumFoobar"))


# ── Unit tests: priority mapping ──────────────────────────────────────────


class PriorityMappingTests(TestCase):
    def test_critical_when_high_impact_and_missing(self):
        self.assertEqual(_priority_for_impact(0.80, missing=True), "critical")

    def test_high_when_medium_impact_and_missing(self):
        self.assertEqual(_priority_for_impact(0.60, missing=True), "high")

    def test_medium_when_low_impact_and_missing(self):
        self.assertEqual(_priority_for_impact(0.30, missing=True), "medium")

    def test_low_when_not_missing(self):
        self.assertEqual(_priority_for_impact(0.90, missing=False), "low")


# ── Unit tests: score estimation ──────────────────────────────────────────


class ScoreEstimationTests(TestCase):
    def test_high_impact_senior_skill_at_junior_level(self):
        impact = _estimate_score_impact(0.85, "senior", "Junior")
        self.assertGreater(impact, 0)

    def test_low_impact_junior_skill(self):
        impact = _estimate_score_impact(0.20, "junior", "Mid-Level")
        self.assertGreaterEqual(impact, 1)

    def test_impact_always_positive(self):
        for tier in ("junior", "mid", "senior"):
            for level in ("Junior", "Mid-Level", "Senior"):
                self.assertGreater(
                    _estimate_score_impact(0.1, tier, level), 0
                )


# ── Unit tests: projected score ───────────────────────────────────────────


class ProjectedScoreTests(TestCase):
    def test_empty_actions_returns_current(self):
        self.assertEqual(_compute_projected_score(60, []), 60)

    def test_score_capped_at_100(self):
        actions = [
            RoadmapAction(
                title="t", description="d", action_type="skill",
                skill_name="x", priority="critical", estimated_weeks=4,
                estimated_score_impact=40, category="tool",
            )
            for _ in range(10)
        ]
        self.assertEqual(_compute_projected_score(80, actions), 100)

    def test_diminishing_returns(self):
        action = RoadmapAction(
            title="t", description="d", action_type="skill",
            skill_name="x", priority="critical", estimated_weeks=4,
            estimated_score_impact=10, category="tool",
        )
        one_action = _compute_projected_score(50, [action])
        two_actions = _compute_projected_score(50, [action, action])
        self.assertGreater(two_actions, one_action)
        # Second action contributes less than first (diminishing returns)
        self.assertLess(two_actions - one_action, 10)


# ── Integration tests: generate_career_path ──────────────────────────────


class GenerateCareerPathTests(TestCase):
    """Test the full career path generation pipeline."""

    def test_basic_plan_generation(self):
        plan = generate_career_path(
            target_role="Frontend Developer",
            experience_level="Mid-Level",
            current_score=55,
            matched_skills=["html", "css", "javascript"],
            missing_skills=["react", "typescript", "git"],
            detected_skills=["html", "css", "javascript"],
        )
        self.assertIsInstance(plan, CareerPathPlan)
        self.assertEqual(plan.target_role, "Frontend Developer")
        self.assertEqual(plan.experience_level, "Mid-Level")
        self.assertEqual(plan.current_score, 55)
        self.assertGreater(plan.projected_score, 55)
        self.assertEqual(len(plan.missing_skills), 3)

    def test_plan_has_four_phases(self):
        plan = generate_career_path(
            target_role="Backend Developer",
            experience_level="Senior",
            current_score=40,
            matched_skills=["python", "sql"],
            missing_skills=["docker", "kubernetes", "system design", "redis"],
        )
        self.assertEqual(len(plan.phases), 4)
        phase_keys = [p.phase_key for p in plan.phases]
        self.assertEqual(
            phase_keys, ["foundation", "growth", "mastery", "showcase"]
        )

    def test_quick_wins_are_short_actions(self):
        plan = generate_career_path(
            target_role="Data Analyst",
            experience_level="Junior",
            current_score=30,
            matched_skills=["python"],
            missing_skills=["sql", "excel", "git", "pandas"],
        )
        for action in plan.quick_wins:
            self.assertLessEqual(action.estimated_weeks, 3)
            self.assertGreaterEqual(action.estimated_score_impact, 3)

    def test_no_missing_skills(self):
        plan = generate_career_path(
            target_role="Frontend Developer",
            experience_level="Junior",
            current_score=90,
            matched_skills=["html", "css", "javascript", "react", "git"],
            missing_skills=[],
        )
        self.assertEqual(plan.projected_score, 90)
        self.assertEqual(plan.missing_skills, [])
        self.assertIn("No critical skill gaps", plan.summary)

    def test_unknown_skill_gets_generic_action(self):
        plan = generate_career_path(
            target_role="ML Engineer",
            experience_level="Mid-Level",
            current_score=35,
            matched_skills=["python"],
            missing_skills=["quantum-foobars"],
        )
        self.assertEqual(len(plan.missing_skills), 1)
        # The plan should have at least one action for the unknown skill
        all_action_titles = []
        for phase in plan.phases:
            all_action_titles.extend(a.title for a in phase.actions)
        self.assertTrue(
            any("quantum-foobars" in t for t in all_action_titles),
            "Unknown skill should produce a generic learning action",
        )

    def test_long_term_goals_from_matched_skills(self):
        plan = generate_career_path(
            target_role="Backend Developer",
            experience_level="Mid-Level",
            current_score=60,
            matched_skills=["python", "django", "sql"],
            missing_skills=["docker", "kubernetes"],
        )
        self.assertGreater(len(plan.long_term_goals), 0)

    def test_as_dict_roundtrip(self):
        plan = generate_career_path(
            target_role="Frontend Developer",
            experience_level="Junior",
            current_score=50,
            matched_skills=["html", "css"],
            missing_skills=["javascript", "react"],
        )
        d = plan.as_dict()
        self.assertIn("phases", d)
        self.assertIn("quick_wins", d)
        self.assertEqual(d["target_role"], "Frontend Developer")
        self.assertIsInstance(d["phases"], list)


# ── Serializer tests ──────────────────────────────────────────────────────


class SerializerTests(TestCase):
    def test_request_serializer_valid(self):
        data = {
            "matched_skills": ["python"],
            "missing_skills": ["docker"],
            "current_score": 50,
            "target_role": "Backend Developer",
            "experience_level": "Mid-Level",
        }
        s = CareerPathRequestSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)

    def test_request_serializer_defaults(self):
        s = CareerPathRequestSerializer(data={})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["experience_level"], "Mid-Level")

    def test_plan_serializer_roundtrip(self):
        plan = generate_career_path(
            target_role="Frontend Developer",
            experience_level="Junior",
            current_score=50,
            matched_skills=["html", "css"],
            missing_skills=["javascript"],
        )
        s = CareerPathPlanSerializer(plan.as_dict())
        self.assertTrue(s.is_valid(), s.errors)


# ── API endpoint tests ────────────────────────────────────────────────────


class CareerPathAPITests(TestCase):
    """POST /api/career-path/"""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/career-path/"

    def test_raw_fields_success(self):
        resp = self.client.post(
            self.url,
            {
                "target_role": "Frontend Developer",
                "experience_level": "Mid-Level",
                "matched_skills": ["html", "css", "javascript"],
                "missing_skills": ["react", "typescript"],
                "current_score": 55,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("phases", resp.data)
        self.assertIn("quick_wins", resp.data)
        self.assertIn("summary", resp.data)
        self.assertEqual(resp.data["target_role"], "Frontend Developer")

    def test_analysis_id_success(self):
        user = User.objects.create_user(
            username="testuser", password="testpass123"
        )
        analysis = ResumeAnalysis.objects.create(
            user=user,
            file_name="resume.pdf",
            target_role="Backend Developer",
            experience_level="Senior",
            score=45,
            skills_found=["python", "sql"],
            matched_skills=["python", "sql"],
            missing_skills=["docker", "kubernetes", "system design"],
            suggestions=[],
            resume_text="Python developer with SQL experience.",
        )
        self.client.force_authenticate(user=user)
        resp = self.client.post(
            self.url,
            {"analysis_id": analysis.id},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["target_role"], "Backend Developer")
        self.assertEqual(resp.data["experience_level"], "Senior")
        self.assertEqual(resp.data["current_score"], 45)

    def test_analysis_id_not_found(self):
        user = User.objects.create_user(
            username="testuser2", password="testpass123"
        )
        self.client.force_authenticate(user=user)
        resp = self.client.post(
            self.url, {"analysis_id": 999999}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_analysis_id_other_user(self):
        owner = User.objects.create_user(
            username="owner", password="pass123"
        )
        other = User.objects.create_user(
            username="other", password="pass123"
        )
        analysis = ResumeAnalysis.objects.create(
            user=owner,
            file_name="resume.pdf",
            target_role="Data Analyst",
            experience_level="Junior",
            score=30,
            skills_found=[],
            matched_skills=[],
            missing_skills=["sql", "python"],
            suggestions=[],
            resume_text="",
        )
        self.client.force_authenticate(user=other)
        resp = self.client.post(
            self.url, {"analysis_id": analysis.id}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_no_skills_no_analysis_id_returns_400(self):
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_skills_returns_400(self):
        resp = self.client.post(
            self.url,
            {
                "target_role": "Frontend Developer",
                "matched_skills": [],
                "missing_skills": [],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_experience_level_accepted(self):
        """Invalid experience levels are accepted with a default."""
        resp = self.client.post(
            self.url,
            {
                "target_role": "Frontend Developer",
                "matched_skills": ["html"],
                "missing_skills": ["react"],
                "current_score": 40,
                "experience_level": "Principal",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_plan_phases_have_actions(self):
        resp = self.client.post(
            self.url,
            {
                "target_role": "Backend Developer",
                "matched_skills": ["python"],
                "missing_skills": ["docker", "redis", "postgresql", "git"],
                "current_score": 35,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        phases = resp.data["phases"]
        self.assertEqual(len(phases), 4)
        # At least one phase should have actions
        total_actions = sum(len(p["actions"]) for p in phases)
        self.assertGreater(total_actions, 0)


# ── RoadmapPhase and RoadmapAction data class tests ───────────────────────


class RoadmapActionTests(TestCase):
    def test_as_dict_keys(self):
        action = RoadmapAction(
            title="Learn React",
            description="Study React for frontend roles.",
            action_type="skill",
            skill_name="react",
            priority="high",
            estimated_weeks=6,
            estimated_score_impact=15,
            category="framework",
            resources=["Meta Front-End Developer"],
        )
        d = action.as_dict()
        expected_keys = {
            "title", "description", "action_type", "skill_name",
            "priority", "estimated_weeks", "estimated_score_impact",
            "category", "resources",
        }
        self.assertEqual(set(d.keys()), expected_keys)


class RoadmapPhaseTests(TestCase):
    def test_as_dict_includes_actions(self):
        action = RoadmapAction(
            title="t", description="d", action_type="skill",
            skill_name="x", priority="high", estimated_weeks=3,
            estimated_score_impact=5, category="tool",
        )
        phase = RoadmapPhase(
            phase_key="foundation",
            label="Foundation",
            week_start=1,
            week_end=4,
            actions=[action],
            phase_summary="Fill critical gaps.",
        )
        d = phase.as_dict()
        self.assertEqual(len(d["actions"]), 1)
        self.assertEqual(d["phase_key"], "foundation")
