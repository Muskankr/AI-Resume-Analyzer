"""
Unit tests validating the gap analysis logic and question generation consistency.
"""

from django.test import TestCase
from analyzer.interview_generator import InterviewGenerator, InterviewQuestion


class InterviewGeneratorTestCase(TestCase):
    def test_generate_questions_with_technical_gap(self):
        resume_text = "I have 3 years of experience in Python and Django."
        skills = ["Python", "Django"]
        job_description = "Looking for a senior developer with strong React, AWS, and Kubernetes skills."

        questions = InterviewGenerator.generate_questions(
            resume_text, skills, job_description
        )

        self.assertGreater(len(questions), 0)
        categories = [q.category for q in questions]
        self.assertIn("Gap-Focused", categories)
        self.assertIn("Technical", categories)

        # Check if missing skills are addressed
        gap_questions = [q for q in questions if q.category == "Gap-Focused"]
        self.assertTrue(
            any(
                "React" in q.question
                or "Aws" in q.question
                or "Kubernetes" in q.question
                for q in gap_questions
            )
        )

    def test_generate_questions_behavioral(self):
        resume_text = "I led a team of 5 engineers and collaborated with product managers to resolve critical bugs."
        skills = []
        job_description = "Standard job description for a software engineer."

        questions = InterviewGenerator.generate_questions(
            resume_text, skills, job_description
        )

        behavioral_qs = [q for q in questions if q.category == "Behavioral"]
        self.assertGreater(len(behavioral_qs), 0)
        # Should trigger the conflict/resolution question based on keywords
        self.assertTrue(
            any(
                "conflict" in q.question.lower() or "issue" in q.question.lower()
                for q in behavioral_qs
            )
        )

    def test_question_structure_and_difficulty(self):
        questions = InterviewGenerator.generate_questions(
            "resume text", [], "job description text"
        )
        for q in questions:
            self.assertIsInstance(q, InterviewQuestion)
            self.assertIn(q.category, ["Technical", "Behavioral", "Gap-Focused"])
            self.assertIn(q.difficulty, ["Easy", "Medium", "Hard"])
            self.assertTrue(len(q.guidelines) > 20)
            self.assertFalse(q.is_practiced)
            self.assertFalse(q.is_saved)
