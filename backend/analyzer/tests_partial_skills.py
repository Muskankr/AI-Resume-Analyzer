from django.test import TestCase
from analyzer.skill_matcher import match_skills_with_partial, is_explicit_non_match
from analyzer.scoring import score_keyword_match, compute_score_breakdown
from analyzer.services import analyze_resume


class PartialSkillsTestCase(TestCase):
    def test_near_match_detection(self):
        # Resume mentions React.js, target skill is React
        text = "Experienced developer proficient in React.js and PostgreSQL."
        required = ["React", "PostgreSQL", "Python"]

        matched, partial, missing = match_skills_with_partial(required, text)

        # React.js is a near match for React
        self.assertIn("PostgreSQL", matched)
        self.assertIn("Python", missing)

        partial_skills = [p["skill"] for p in partial]
        self.assertIn("React", partial_skills)
        self.assertEqual(partial[0]["matched_variant"].lower(), "react.js")

    def test_synonym_alias_near_match(self):
        text = "Skilled in Postgres and JS."
        required = ["PostgreSQL", "JavaScript"]

        matched, partial, missing = match_skills_with_partial(required, text)

        partial_skills = [p["skill"] for p in partial]
        self.assertIn("PostgreSQL", partial_skills)
        self.assertIn("JavaScript", partial_skills)

    def test_false_positive_prevention(self):
        # Java vs JavaScript should NEVER be a partial match
        text = "Java developer with basic HTML skills."
        required = ["JavaScript", "HTML"]

        matched, partial, missing = match_skills_with_partial(required, text)

        self.assertIn("HTML", matched)
        self.assertIn("JavaScript", missing)

        partial_skills = [p["skill"] for p in partial]
        self.assertNotIn("JavaScript", partial_skills)
        self.assertTrue(is_explicit_non_match("Java", "JavaScript"))

    def test_partial_credit_scoring(self):
        matched = ["PostgreSQL"]
        required = ["React", "PostgreSQL", "Python"]
        detected = ["postgresql", "react.js"]
        partial = [
            {"skill": "React", "matched_variant": "React.js", "note": "Near match"}]

        factor = score_keyword_match(
            matched, required, detected, partial_skills=partial)
        # 1 exact + 0.5 partial = 1.5 out of 3 = 50% coverage
        # 50% of weight 40 = 20 earned points
        self.assertEqual(factor.earned, 20)
        self.assertIn("plus 1 partial match", factor.detail)
