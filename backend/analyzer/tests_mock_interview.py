"""
Unit tests for the AI-Powered Mock Interview Chatbot Simulator.

Validates question generation, answer evaluation logic, and session management.
"""

from django.test import TestCase
from .mock_interview import generate_interview_questions, evaluate_answer


class MockInterviewTests(TestCase):
    """Test suite for mock interview logic."""

    def test_generate_interview_questions_returns_correct_count(self):
        """Test that the correct number of questions is generated."""
        resume = (
            "I am a software engineer with 5 years of experience in Python and React."
        )
        jd = "We are looking for a Senior Python Developer with AWS experience."
        role = "Senior Python Developer"

        questions = generate_interview_questions(resume, jd, role)
        self.assertEqual(len(questions), 3)

        categories = [q["category"] for q in questions]
        self.assertIn("technical", categories)
        self.assertIn("behavioral", categories)
        self.assertIn("role_specific", categories)

    def test_generate_interview_questions_customizes_role(self):
        """Test that role-specific questions are customized with skills and role."""
        resume = "I know Python."
        jd = "Looking for Python and AWS skills."
        role = "Cloud Engineer"

        questions = generate_interview_questions(resume, jd, role)
        role_q = next(q for q in questions if q["category"] == "role_specific")

        self.assertIn("Python", role_q["question"])
        self.assertIn("Cloud Engineer", role_q["question"])

    def test_evaluate_answer_short_answer(self):
        """Test evaluation of a very short, insufficient answer."""
        question = "Tell me about a challenge."
        answer = "It was hard but I fixed it."

        result = evaluate_answer(question, answer)
        self.assertEqual(result["score"], 0)
        self.assertIn("too brief", result["feedback"].lower())
        self.assertIn("STAR method", result["feedback"])

    def test_evaluate_answer_strong_answer(self):
        """Test evaluation of a strong, well-structured answer."""
        question = "Describe a time you improved a process."
        answer = "In my previous role, the situation was that our deployment took too long. I took the action to implement CI/CD pipelines using Jenkins. This resulted in a 40% reduction in deployment time and improved team productivity significantly."

        result = evaluate_answer(question, answer)
        self.assertGreater(result["score"], 70)
        self.assertTrue(any("action-oriented" in s for s in result["strengths"]))
        self.assertTrue(any("quantifiable results" in s for s in result["strengths"]))

    def test_evaluate_answer_weak_language(self):
        """Test evaluation of an answer with uncertain language."""
        question = "What is your experience with React?"
        answer = "I think I kind of know React. I maybe built a few components, but I'm not sure if it was good."

        result = evaluate_answer(question, answer)
        self.assertLess(result["score"], 50)
        self.assertTrue(
            any("uncertain language" in imp for imp in result["areas_for_improvement"])
        )

    def test_evaluate_answer_length_warnings(self):
        """Test that length warnings are triggered appropriately."""
        question = "Tell me about yourself."

        # Too short
        short_result = evaluate_answer(question, "I am a developer.")
        self.assertTrue(
            any("bit short" in imp for imp in short_result["areas_for_improvement"])
        )

        # Too long (mocked with repeated words)
        long_answer = "I am a developer. " * 50
        long_result = evaluate_answer(question, long_answer)
        self.assertTrue(
            any("quite long" in imp for imp in long_result["areas_for_improvement"])
        )
