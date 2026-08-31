"""
Unit tests for the LinkedIn Profile Optimization module.

Covers character limit enforcement, section mapping accuracy,
and edge cases for missing or malformed data.
"""

from django.test import TestCase
from .linkedin_optimizer import (
    clean_and_format_text,
    optimize_headline,
    optimize_about_section,
    optimize_experience,
    optimize_skills,
    generate_linkedin_profile,
    LINKEDIN_LIMITS,
)


class LinkedInOptimizerTests(TestCase):
    """Test suite for LinkedIn optimization logic."""

    def test_clean_and_format_text_empty(self):
        """Test that empty or None inputs return empty strings."""
        self.assertEqual(clean_and_format_text(""), "")
        self.assertEqual(clean_and_format_text(None), "")
        self.assertEqual(clean_and_format_text("   \n\n  "), "")

    def test_clean_and_format_text_normalization(self):
        """Test that extra whitespace and newlines are normalized."""
        raw_text = "This   is  a   test.\n\n\nWith   multiple  spaces."
        expected = "This is a test.\n\nWith multiple spaces."
        self.assertEqual(clean_and_format_text(raw_text), expected)

    def test_optimize_headline_within_limits(self):
        """Test headline optimization stays within character limits."""
        headline = optimize_headline(
            "Software Engineer", "Software Engineer", ["Python", "Django", "React"]
        )
        self.assertLessEqual(len(headline), LINKEDIN_LIMITS["headline"])
        self.assertIn("Software Engineer", headline)

    def test_optimize_headline_truncation(self):
        """Test that excessively long headlines are truncated properly."""
        long_role = "A" * 300
        headline = optimize_headline("", long_role, ["Skill1", "Skill2", "Skill3"])
        self.assertEqual(len(headline), LINKEDIN_LIMITS["headline"])
        self.assertTrue(headline.endswith("..."))

    def test_optimize_about_section_weak_phrase_replacement(self):
        """Test that weak phrases are replaced with strong action verbs."""
        about = "I was responsible for managing a team and helped with development."
        optimized = optimize_about_section(about, "Manager", ["Leadership"])
        self.assertNotIn("responsible for", optimized.lower())
        self.assertNotIn("helped with", optimized.lower())
        self.assertIn("spearheaded", optimized.lower())

    def test_optimize_about_section_limit(self):
        """Test that the about section respects the 2600 character limit."""
        long_about = "A" * 3000
        optimized = optimize_about_section(long_about, "Developer", ["Python"])
        self.assertLessEqual(len(optimized), LINKEDIN_LIMITS["about"])
        self.assertTrue(optimized.endswith("..."))

    def test_optimize_experience_enhancement(self):
        """Test that experience descriptions are enhanced with action verbs."""
        experiences = [
            {
                "title": "Developer",
                "company": "Tech Corp",
                "description": "worked on the backend api.",
            }
        ]
        optimized = optimize_experience(experiences)
        self.assertEqual(len(optimized), 1)
        self.assertIn("Spearheaded", optimized[0]["description"])
        self.assertEqual(
            optimized[0]["original_description"], "worked on the backend api."
        )

    def test_optimize_experience_limit(self):
        """Test that experience descriptions are truncated if too long."""
        experiences = [{"title": "Dev", "company": "Corp", "description": "A" * 2500}]
        optimized = optimize_experience(experiences)
        self.assertLessEqual(
            len(optimized[0]["description"]), LINKEDIN_LIMITS["experience_description"]
        )

    def test_optimize_skills_deduplication_and_limit(self):
        """Test that skills are deduplicated, cleaned, and limited to 50."""
        skills = ["python", "Python", " django ", "react"] + [
            "Skill" + str(i) for i in range(60)
        ]
        optimized = optimize_skills(skills)

        # Check deduplication (python and Python should be one)
        self.assertEqual(optimized.count("Python"), 1)
        self.assertEqual(optimized.count("Django"), 1)

        # Check limit
        self.assertLessEqual(len(optimized), LINKEDIN_LIMITS["skills"])

        # Check sorting
        self.assertEqual(optimized, sorted(optimized))

    def test_generate_linkedin_profile_full_flow(self):
        """Test the main generation function with comprehensive data."""
        resume_data = {
            "target_role": "Data Scientist",
            "skills": ["Python", "Machine Learning", "SQL", "Python"],
            "summary": "Tasked with building models.",
            "experiences": [
                {
                    "title": "Analyst",
                    "company": "Data Inc",
                    "description": "Handled data pipelines.",
                }
            ],
        }

        result = generate_linkedin_profile(resume_data)

        self.assertIn("headline", result)
        self.assertIn("about", result)
        self.assertIn("experiences", result)
        self.assertIn("skills", result)
        self.assertIn("limits", result)

        self.assertIn("Data Scientist", result["headline"])
        self.assertIn("spearheaded", result["about"].lower())
        self.assertEqual(len(result["skills"]), 3)  # Deduplicated


class CleanAndFormatTextTests(TestCase):
    """`\s` includes newlines, and the two substitutions ran in the wrong order.

    Collapsing on `\s+` first flattened every paragraph break into a space,
    which left the paragraph-normalising rule underneath it with nothing to
    match — it could never fire, for any input.
    """

    def test_paragraph_breaks_survive(self):
        self.assertEqual(
            clean_and_format_text("Para one.\n\n\nPara two.\n   \n\nPara three."),
            "Para one.\n\nPara two.\n\nPara three.",
        )

    def test_a_single_newline_is_not_promoted_to_a_paragraph_break(self):
        self.assertEqual(
            clean_and_format_text("Line one.\nLine two."), "Line one.\nLine two."
        )

    def test_horizontal_whitespace_still_collapses(self):
        self.assertEqual(clean_and_format_text("a \t  b"), "a b")

    def test_carriage_returns_are_normalised(self):
        self.assertEqual(
            clean_and_format_text("Para one.\r\n\r\nPara two."),
            "Para one.\n\nPara two.",
        )

    def test_spaces_around_a_break_are_trimmed(self):
        self.assertEqual(
            clean_and_format_text("Para one.   \n\n   Para two."),
            "Para one.\n\nPara two.",
        )

    def test_the_core_competencies_block_keeps_its_own_paragraph(self):
        """The end-to-end version of the bug.

        `optimize_about_section` appends "\n\nCore Competencies: ..." and then
        calls `clean_and_format_text`, so the flattening landed on the block
        it had just added.
        """
        about = optimize_about_section("A summary sentence.", "Engineer", ["Python"])
        self.assertIn("\n\nCore Competencies: Python.", about)


class SkillCasingTests(TestCase):
    """`.title()` produced "Javascript", "Ios", "Node.Js" and "Postgresql".

    These are copied onto a profile whose skill matching is string-based, so
    a mis-spelled skill is a skill that does not match.
    """

    def test_known_technical_skills_keep_their_real_spelling(self):
        optimized = optimize_skills(
            ["javascript", "ios", "node.js", "rest api", "postgresql", "graphql"]
        )
        self.assertEqual(
            optimized,
            ["GraphQL", "JavaScript", "Node.js", "PostgreSQL", "REST API", "iOS"],
        )

    def test_deliberate_internal_capitals_are_left_alone(self):
        """A skill that already carries a capital past its first character
        is spelled that way on purpose."""
        self.assertEqual(optimize_skills(["SQL", "PyTorch", "iOS"]), ["PyTorch", "SQL", "iOS"])

    def test_plain_lowercase_input_is_still_title_cased(self):
        self.assertEqual(
            optimize_skills(["project management", "django"]),
            ["Django", "Project Management"],
        )

    def test_symbols_survive(self):
        self.assertEqual(optimize_skills(["c++", "c#", ".net"]), [".NET", "C#", "C++"])

    def test_deduplication_is_case_insensitive(self):
        self.assertEqual(optimize_skills(["python", "PYTHON", "Python"]), ["Python"])

    def test_blank_and_non_string_entries_are_dropped(self):
        self.assertEqual(optimize_skills(["python", "", "   ", None, 7]), ["Python"])


class SkillTruncationTests(TestCase):
    """Sorting ran before the 50-skill cut, so the cut fell alphabetically."""

    def test_the_cut_falls_on_relevance_not_the_alphabet(self):
        # 51 skills, the most relevant one last in the alphabet.
        skills = ["Zebra Handling"] + [f"Skill{i:02d}" for i in range(50)]
        optimized = optimize_skills(skills)

        self.assertEqual(len(optimized), LINKEDIN_LIMITS["skills"])
        self.assertIn(
            "Zebra Handling",
            optimized,
            "The caller's first skill was dropped because it sorts last.",
        )
        self.assertNotIn("Skill49", optimized)

    def test_the_result_is_still_sorted_for_display(self):
        optimized = optimize_skills([f"Skill{i:02d}" for i in range(60)])
        self.assertEqual(optimized, sorted(optimized))


class HeadlineTests(TestCase):
    """`current_headline` was declared, documented, and never read."""

    def test_the_users_own_headline_leads_the_result(self):
        headline = optimize_headline(
            "Backend Engineer @ Acme | Payments infrastructure",
            "Software Engineer",
            ["python"],
        )
        self.assertTrue(
            headline.startswith("Backend Engineer @ Acme | Payments infrastructure"),
            headline,
        )

    def test_the_role_is_not_repeated_when_the_headline_already_says_it(self):
        headline = optimize_headline("Software Engineer", "Software Engineer", [])
        self.assertEqual(headline.lower().count("software engineer"), 1)

    def test_an_empty_headline_falls_back_to_the_role(self):
        self.assertTrue(optimize_headline("", "Data Scientist", []).startswith("Data Scientist"))

    def test_a_missing_role_falls_back_to_professional(self):
        self.assertIn("Professional", optimize_headline("", "", []))

    def test_headline_skills_are_canonically_cased(self):
        self.assertIn("iOS", optimize_headline("", "Engineer", ["ios"]))

    def test_truncation_does_not_cut_mid_word(self):
        headline = optimize_headline(
            "", "Senior Distributed Systems Reliability Engineer " * 8, []
        )
        self.assertLessEqual(len(headline), LINKEDIN_LIMITS["headline"])
        self.assertTrue(headline.endswith("..."))
        self.assertFalse(headline[:-3].endswith(" "))


class WeakPhraseReplacementTests(TestCase):
    """Replacing a weak phrase must not leave the sentence passive."""

    def test_a_leading_auxiliary_goes_with_the_phrase(self):
        optimized = optimize_about_section(
            "I was responsible for the rollout.", "Manager", []
        )
        self.assertIn("I spearheaded the rollout.", optimized)
        self.assertNotIn("was spearheaded", optimized)

    def test_sentence_case_is_preserved(self):
        optimized = optimize_about_section("Responsible for hiring.", "Manager", [])
        self.assertTrue(optimized.startswith("Spearheaded hiring."), optimized)

    def test_skills_already_named_are_not_appended_again(self):
        optimized = optimize_about_section(
            "Ten years of Python and SQL work.", "Engineer", ["python", "sql", "aws"]
        )
        self.assertIn("Core Competencies: AWS.", optimized)
        self.assertEqual(optimized.lower().count("python"), 1)


class ActionVerbDetectionTests(TestCase):
    """`"Led" in description` is a substring test, and "led" is inside
    "handled", "fulfilled", "called", "scheduled" and "modelled"."""

    def test_a_weak_description_is_not_mistaken_for_a_strong_one(self):
        optimized = optimize_experience(
            [
                {
                    "title": "Support Lead",
                    "company": "Acme",
                    "description": "Handled customer escalations and fulfilled orders.",
                }
            ]
        )
        self.assertTrue(optimized[0]["description"].startswith("Spearheaded"))

    def test_a_genuinely_strong_description_is_left_alone(self):
        description = "Led the migration to Kubernetes."
        optimized = optimize_experience(
            [{"title": "SRE", "company": "Acme", "description": description}]
        )
        self.assertEqual(optimized[0]["description"], description)

    def test_original_description_is_the_original(self):
        """The field exists for a before/after comparison and returned the
        "after", because `description` was reassigned before it was read."""
        original = "worked on the backend api."
        optimized = optimize_experience(
            [{"title": "Dev", "company": "Acme", "description": original}]
        )
        self.assertEqual(optimized[0]["original_description"], original)
        self.assertNotEqual(
            optimized[0]["original_description"], optimized[0]["description"]
        )

    def test_missing_keys_do_not_raise(self):
        optimized = optimize_experience([{}])
        self.assertEqual(optimized[0]["title"], "Professional")
        self.assertEqual(optimized[0]["company"], "Company")
        self.assertEqual(optimized[0]["original_description"], "")

    def test_none_experiences_is_treated_as_empty(self):
        self.assertEqual(optimize_experience(None), [])
