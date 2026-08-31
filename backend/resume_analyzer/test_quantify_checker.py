import pytest
from resume_analyzer.quantify_checker import flag_unquantified_bullets

SHOULD_FLAG = [
    "Improved application performance significantly",
    "Reduced server downtime and improved reliability",
    "Led cross-functional teams to deliver product features",
    "Developed RESTful APIs for the internal platform",
    "Automated deployment pipeline using GitHub Actions",
    "Managed the onboarding process for new developers",
    "Optimized database queries for better response times",
    "Built a real-time notification system for the app",
]

SHOULD_NOT_FLAG = [
    "Improved application performance by 40%",
    "Led a team of 8 engineers across 3 time zones",
    "Summary: Results-driven software engineer with 5 years",
    "Skills: Python, Django, React, PostgreSQL",
    "Bachelor of Engineering, University of Mumbai, 2023",
    "atharv@example.com | Mumbai, India",
    "",
]


class TestFlagUnquantifiedBullets:
    def test_flags_accomplishment_without_number(self):
        for bullet in SHOULD_FLAG:
            nudges = flag_unquantified_bullets([bullet])
            assert len(
                nudges) == 1, f"Expected flag for: '{bullet}', got {len(nudges)}"

    def test_does_not_flag_already_quantified(self):
        for bullet in SHOULD_NOT_FLAG:
            nudges = flag_unquantified_bullets([bullet])
            assert len(nudges) == 0, f"Should not flag: '{bullet}'"

    def test_correct_indices(self):
        bullets = [
            "Summary: Experienced engineer",
            "Improved performance significantly",
            "Increased revenue by 25%",
            "Automated CI/CD pipeline",
        ]
        nudges = flag_unquantified_bullets(bullets)
        assert len(nudges) == 2
        assert nudges[0]["line_index"] == 1
        assert nudges[1]["line_index"] == 3

    def test_empty_list(self):
        assert flag_unquantified_bullets([]) == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
