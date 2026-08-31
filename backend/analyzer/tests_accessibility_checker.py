"""
Unit tests for the Accessibility Checker module.

Covers various structural failure scenarios and valid accessible resumes.
"""

from django.test import TestCase
from .accessibility_checker import (
    BULLET_CHARS,
    EXCESSIVE_CAPS_THRESHOLD,
    calculate_accessibility_score,
    check_accessibility,
    get_recommendation,
)


class AccessibilityCheckerTests(TestCase):
    """Test suite for accessibility checking logic."""

    def test_check_accessibility_valid_resume(self):
        """Test that a well-formatted resume passes with no findings."""
        valid_resume = """
        Contact: john.doe@email.com | (555) 123-4567
        
        Professional Experience
        - Developed backend services using Python.
        - Led a team of 5 engineers.
        
        Education
        - B.S. Computer Science
        """
        findings = check_accessibility(valid_resume)
        self.assertEqual(len(findings), 0)

    def test_check_accessibility_missing_contact(self):
        """Test detection of missing contact information."""
        bad_resume = "I am a software engineer with 5 years of experience."
        findings = check_accessibility(bad_resume)

        missing_contact = [f for f in findings if f["rule"] == "missing_contact_header"]
        self.assertEqual(len(missing_contact), 1)
        self.assertEqual(missing_contact[0]["severity"], "critical")

    def test_check_accessibility_no_bullets(self):
        """Test detection of missing bullet points."""
        bad_resume = "Contact: test@test.com\nExperience\nI did many things and worked on projects."
        findings = check_accessibility(bad_resume)

        no_bullets = [f for f in findings if f["rule"] == "no_bullet_points"]
        self.assertEqual(len(no_bullets), 1)
        self.assertEqual(no_bullets[0]["severity"], "warning")

    def test_check_accessibility_excessive_caps(self):
        """Test detection of excessive ALL CAPS usage."""
        bad_resume = "Contact: test@test.com\nEXPERIENCE\nSOFTWARE ENGINEER\nMANAGER\nDIRECTOR\nVP\nCTO"
        findings = check_accessibility(bad_resume)

        caps_issue = [f for f in findings if f["rule"] == "excessive_caps"]
        self.assertEqual(len(caps_issue), 1)

    def test_calculate_accessibility_score_perfect(self):
        """Test that a resume with no findings scores 100."""
        score = calculate_accessibility_score([])
        self.assertEqual(score, 100)

    def test_calculate_accessibility_score_penalties(self):
        """Test that the score decreases correctly based on severity."""
        findings = [
            {"severity": "critical"},
            {"severity": "warning"},
            {"severity": "info"},
        ]
        score = calculate_accessibility_score(findings)
        # 100 - 30 - 15 - 5 = 50
        self.assertEqual(score, 50)

    def test_calculate_accessibility_score_minimum(self):
        """Test that the score does not drop below 0."""
        findings = [
            {"severity": "critical"},
            {"severity": "critical"},
            {"severity": "critical"},
            {"severity": "critical"},
        ]
        score = calculate_accessibility_score(findings)
        self.assertEqual(score, 0)

    def test_get_recommendation_exists(self):
        """Test that recommendations are provided for known rules."""
        rec = get_recommendation("no_bullet_points")
        self.assertIn("bullet", rec.lower())

    def test_get_recommendation_fallback(self):
        """Test that a fallback recommendation is provided for unknown rules."""
        rec = get_recommendation("unknown_rule")
        self.assertIn("review", rec.lower())


def _rules(text):
    """The rule names a piece of text trips."""
    return {finding["rule"] for finding in check_accessibility(text)}


class BulletDetectionTests(TestCase):
    """The check was `"-" not in text and "*" not in text and "•" not in text`.

    A substring test over the whole document, so any hyphen anywhere switched
    the rule off — a date range, a phone number, a hyphenated word. On a real
    resume it could not fire.
    """

    def test_a_date_range_no_longer_hides_the_absence_of_bullets(self):
        resume = (
            "Jane Doe\njane@example.com\n\n"
            "Experience\n"
            "Senior Engineer, Acme Corp (2020-2023)\n"
            "Built payment flows and shipped the billing service.\n"
        )
        self.assertIn("no_bullet_points", _rules(resume))

    def test_a_hyphenated_word_does_not_count_as_a_bullet(self):
        resume = "Contact: a@b.com\nExperience\nWorked on a well-known e-commerce platform."
        self.assertIn("no_bullet_points", _rules(resume))

    def test_every_accepted_bullet_character_is_recognised(self):
        for char in BULLET_CHARS:
            with self.subTest(char=char):
                resume = f"Contact: a@b.com\nExperience\n{char} Led the team\n"
                self.assertNotIn("no_bullet_points", _rules(resume))

    def test_numbered_lists_count_as_lists(self):
        for marker in ("1.", "2)"):
            with self.subTest(marker=marker):
                resume = f"Contact: a@b.com\nExperience\n{marker} Led the team\n"
                self.assertNotIn("no_bullet_points", _rules(resume))

    def test_a_bullet_character_mid_sentence_is_not_a_list(self):
        resume = "Contact: a@b.com\nExperience\nRevenue rose 5% - twice over.\n"
        self.assertIn("no_bullet_points", _rules(resume))


class SpecialCharacterTests(TestCase):
    """The rule was an allowlist so narrow it fired on almost every resume."""

    def test_the_bullet_character_the_other_rule_recommends_is_not_flagged(self):
        """`no_bullet_points` recommends "•"; `special_characters` flagged it.
        Following one recommendation tripped the other."""
        self.assertNotIn(
            "special_characters", _rules("Contact: a@b.com\nExperience\n• Led the team\n")
        )

    def test_ordinary_resume_punctuation_is_not_flagged(self):
        resume = (
            "Contact: jane@example.com | +1 (555) 010-4477\n"
            "Experience\n"
            "- Cut latency 30% and grew revenue 2x\n"
            "- Stack: C++, C#, R&D tooling & Node.js\n"
            "- Salary band: $120k-$150k\n"
        )
        self.assertNotIn("special_characters", _rules(resume))

    def test_accented_names_are_not_flagged(self):
        resume = "Contact: jose@example.com\nExperience\n- Worked with José Álvarez in Zürich\n"
        self.assertNotIn("special_characters", _rules(resume))

    def test_decorative_symbols_are_still_flagged(self):
        for symbol in ("→", "★", "✅", "▓", "🚀"):
            with self.subTest(symbol=symbol):
                resume = f"Contact: a@b.com\nExperience\n- Revenue {symbol} up 40%\n"
                self.assertIn("special_characters", _rules(resume))

    def test_private_use_glyphs_are_flagged(self):
        """Icon fonts put their glyphs in the Private Use Area, where a screen
        reader has nothing at all to say."""
        resume = "Contact: a@b.com\nExperience\n-  jane@example.com\n"
        self.assertIn("special_characters", _rules(resume))


class ExcessiveCapsTests(TestCase):
    """`\\b[A-Z]{4,}\\b` counted acronyms as caps-locked prose, and its
    threshold of `> 5` was one past its own fixture."""

    def test_a_technical_resume_is_not_flagged_for_its_acronyms(self):
        resume = (
            "Contact: jane@example.com\n"
            "Experience\n"
            "- Built REST APIs with SQL, AWS, JSON, HTML, CI/CD and OAUTH\n"
            "Education\n"
            "- B.S. Computer Science\n"
        )
        self.assertNotIn("excessive_caps", _rules(resume))

    def test_a_technical_resume_scores_100(self):
        """The end-to-end version: two rules firing on a well-formed resume
        cost it 20 points."""
        resume = (
            "Contact: jane@example.com | 555-0142\n"
            "Experience\n"
            "- Built REST APIs in Java using Spring; shipped HTTPS/OAuth flows\n"
            "- Increased conversion by 40% and cut latency 30%\n"
            "- Stack: C++, C#, R&D tooling\n"
            "Education\n"
            "- B.S. Computer Science\n"
        )
        self.assertEqual(check_accessibility(resume), [])
        self.assertEqual(calculate_accessibility_score(check_accessibility(resume)), 100)

    def test_caps_locked_prose_is_still_flagged(self):
        resume = (
            "Contact: a@b.com\nExperience\n"
            "- DELIVERED SEVERAL LARGE PROJECTS ACROSS MULTIPLE TEAMS\n"
        )
        self.assertIn("excessive_caps", _rules(resume))

    def test_short_acronyms_are_recognised_too(self):
        """`{4,}` could not see VP, CTO, QA or AI at all, so a fixture built
        from job titles counted 5 where it needed 6."""
        resume = "Contact: a@b.com\nExperience\n- VP, CTO, QA, AI, ML, UX and BI work\n"
        self.assertNotIn("excessive_caps", _rules(resume))

    def test_the_threshold_is_the_documented_one(self):
        pool = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF"]

        words = " ".join(pool[:EXCESSIVE_CAPS_THRESHOLD])
        resume = f"Contact: a@b.com\nExperience\n- {words}\n"
        self.assertIn("excessive_caps", _rules(resume))

        fewer = " ".join(pool[: EXCESSIVE_CAPS_THRESHOLD - 1])
        self.assertNotIn(
            "excessive_caps", _rules(f"Contact: a@b.com\nExperience\n- {fewer}\n")
        )


class ContactHeaderPositionTests(TestCase):
    """The description says "top-level"; the check searched the whole document."""

    def test_email_marketing_on_page_two_is_not_a_contact_block(self):
        resume = "Summary\n" + ("Delivered projects.\n" * 30) + "Ran email marketing.\n"
        self.assertIn("missing_contact_header", _rules(resume))

    def test_a_contact_block_at_the_top_passes(self):
        resume = "Jane Doe\njane@example.com\n\nExperience\n- Led the team\n"
        self.assertNotIn("missing_contact_header", _rules(resume))

    def test_a_bare_email_counts_without_the_word_email(self):
        resume = "Jane Doe\nj.doe@example.com\n\nExperience\n- Led the team\n"
        self.assertNotIn("missing_contact_header", _rules(resume))

    def test_a_bare_phone_number_counts(self):
        resume = "Jane Doe\n+1 (555) 010-4477\n\nExperience\n- Led the team\n"
        self.assertNotIn("missing_contact_header", _rules(resume))


class RuleConsistencyTests(TestCase):
    """The rules must not contradict each other."""

    def test_following_the_bullet_recommendation_does_not_trip_another_rule(self):
        resume = (
            "Jane Doe\njane@example.com\n\n"
            "Experience\n"
            "• Led a team of five engineers\n"
            "• Shipped the billing service\n"
            "Education\n"
            "• B.S. Computer Science\n"
        )
        self.assertEqual(check_accessibility(resume), [])

    def test_every_rule_has_a_recommendation(self):
        from .accessibility_checker import ACCESSIBILITY_RULES

        fallback = get_recommendation("definitely-not-a-rule")
        for rule_name in ACCESSIBILITY_RULES:
            with self.subTest(rule=rule_name):
                self.assertNotEqual(get_recommendation(rule_name), fallback)

    def test_non_string_input_is_handled(self):
        self.assertEqual(check_accessibility(None), [])
        self.assertEqual(check_accessibility(""), [])
        self.assertEqual(check_accessibility(123), [])
