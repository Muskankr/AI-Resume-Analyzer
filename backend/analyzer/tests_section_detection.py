"""Where a resume's sections start, and what the three callers do with it.

The case that matters most is the first one: a resume with no headings at all
used to score full marks for section coverage, because every module asked
``variant in text.lower()`` and got its answer from the middle of a sentence.
"""

from django.test import TestCase

from analyzer.formatting_checker import check_resume_formatting
from analyzer.scoring import WEIGHTS, score_sections
from analyzer.section_headings import (
    SECTION_KEYS,
    classify_line,
    find_headings,
    find_section_keys,
    has_section,
    missing_section_keys,
    section_body,
)
from analyzer.semantic_differ import SemanticDiffer

#: Prose that mentions every section word and carries no heading whatsoever.
#: Each line is the phrase that used to supply a section: "experience" from
#: "years of experience", "skills" from "improved my skills", and so on.
HEADINGLESS_RESUME = """Jane Doe
jane@example.com | +1 415 555 0132
I am a backend engineer. I have five years of experience building tools.
Built internal tools for the data team and improved my skills in Go.
I hold a degree from a good academic program and enjoy tutoring.
Worked on a profile page and a portfolio of small projects.
"""

STRUCTURED_RESUME = """Jane Doe
jane@example.com

Summary
Backend engineer with six years building payment systems.

PROFESSIONAL EXPERIENCE
Acme Corp, Senior Engineer
Built the billing service and cut invoice errors by 42%.

Education
B.S. Computer Science, State University

Technical Skills
Python, Django, PostgreSQL, Docker

Portfolio
An open-source rate limiter used by 400+ repositories.
"""


class HeadingClassificationTests(TestCase):
    def test_a_heading_on_its_own_line_is_a_heading(self):
        for line in (
            "Experience",
            "EXPERIENCE",
            "Work history",
            "Employment History",
            "PROFESSIONAL EXPERIENCE",
            "## Skills",
            "=== Education ===",
            "Skills:",
        ):
            with self.subTest(line=line):
                self.assertIsNotNone(classify_line(line), f"{line!r} is a heading")

    def test_a_sentence_that_mentions_a_section_is_not_a_heading(self):
        for line in (
            "I have five years of experience building tools.",
            "Built internal tools and improved my skills in Go.",
            "I hold a degree from a good academic program.",
            "Worked on a profile page and a portfolio of small projects.",
            "Experience building internal tools",
            "Skills in Python",
            "Delivered the education platform rewrite.",
        ):
            with self.subTest(line=line):
                self.assertIsNone(
                    classify_line(line),
                    f"{line!r} is prose, not a heading — counting it is how a "
                    "resume with no headings scored full marks",
                )

    def test_a_label_with_its_content_on_the_same_line(self):
        classified = classify_line("Skills: Python, Django, React")
        self.assertIsNotNone(classified)
        key, _, inline = classified
        self.assertEqual(key, "skills")
        self.assertEqual(inline, "Python, Django, React")

    def test_a_blank_line_is_not_a_heading(self):
        for line in ("", "   ", "\t"):
            self.assertIsNone(classify_line(line))


class FindHeadingsTests(TestCase):
    def test_a_resume_with_no_headings_reports_none(self):
        self.assertEqual(find_section_keys(HEADINGLESS_RESUME), [])

    def test_a_structured_resume_reports_its_sections_in_order(self):
        self.assertEqual(
            find_section_keys(STRUCTURED_RESUME),
            ["summary", "experience", "education", "skills", "projects"],
        )

    def test_a_repeated_heading_is_reported_once(self):
        """Some resumes repeat the heading across a page break."""
        text = "Experience\nAcme\n\nExperience (continued)\nBeta Corp"
        self.assertEqual(find_section_keys(text), ["experience"])

    def test_the_variant_that_matched_is_reported(self):
        headings = {h.key: h for h in find_headings(STRUCTURED_RESUME)}
        self.assertEqual(headings["experience"].detected_as, "professional experience")
        self.assertEqual(headings["skills"].detected_as, "technical skills")

    def test_has_section_and_missing_section_keys_agree(self):
        missing = missing_section_keys(HEADINGLESS_RESUME)
        self.assertEqual(missing, list(SECTION_KEYS))
        for key in SECTION_KEYS:
            self.assertFalse(has_section(HEADINGLESS_RESUME, key))

    def test_section_body_stops_at_the_next_heading(self):
        body = section_body(STRUCTURED_RESUME, "education")
        self.assertEqual(body, "B.S. Computer Science, State University")

    def test_section_body_includes_content_written_after_a_colon(self):
        self.assertEqual(
            section_body("Jane Doe\nSkills: Python, Django", "skills"),
            "Python, Django",
        )

    def test_section_body_of_an_absent_section_is_empty(self):
        self.assertEqual(section_body(HEADINGLESS_RESUME, "skills"), "")

    def test_the_last_section_runs_to_the_end_of_the_document(self):
        body = section_body(STRUCTURED_RESUME, "projects")
        self.assertIn("rate limiter", body)


class ScoreSectionsTests(TestCase):
    def test_a_headingless_resume_scores_nothing_for_sections(self):
        """The regression this was filed for.

        Full marks and "all four expected sections are present" for a document
        an ATS cannot segment — so the reader never added the headings.
        """
        factor = score_sections(HEADINGLESS_RESUME)

        self.assertEqual(factor.earned, 0)
        self.assertEqual(factor.status, "weak")
        for name in ("experience", "education", "skills", "projects"):
            self.assertIn(name, factor.detail)

    def test_a_structured_resume_scores_full_marks(self):
        self.assertEqual(
            score_sections(STRUCTURED_RESUME).earned, WEIGHTS["sections"]
        )

    def test_partial_coverage_scores_proportionally(self):
        factor = score_sections("Experience\nAcme Corp\n\nSkills\nPython")
        self.assertEqual(factor.earned, round(WEIGHTS["sections"] * 0.5))

    def test_the_detail_says_what_is_missing(self):
        factor = score_sections("Experience\nAcme Corp\n\nSkills\nPython")
        self.assertIn("education", factor.detail)
        self.assertIn("projects", factor.detail)


class FormattingCheckerSectionTests(TestCase):
    def test_a_headingless_resume_is_told_its_headings_are_missing(self):
        result = check_resume_formatting(HEADINGLESS_RESUME)

        self.assertEqual(result["found_sections"], [])
        self.assertIn("Work Experience", result["missing_sections"])
        self.assertIn(
            "Missing essential ATS section header(s)", result["tips"]["sections"][0]
        )

    def test_a_headingless_resume_does_not_score_as_structurally_sound(self):
        headingless = check_resume_formatting(HEADINGLESS_RESUME)["score"]
        structured = check_resume_formatting(STRUCTURED_RESUME)["score"]
        self.assertLess(headingless, structured)

    def test_a_structured_resume_finds_every_section(self):
        result = check_resume_formatting(STRUCTURED_RESUME)
        self.assertEqual(result["missing_sections"], [])

    def test_the_variant_reported_is_the_one_in_the_document(self):
        """`detected_as` used to name whichever variant matched a substring."""
        result = check_resume_formatting(STRUCTURED_RESUME)
        self.assertIn("Work Experience", result["found_sections"])


class SemanticDifferNormalizationTests(TestCase):
    def test_normalization_keeps_the_line_structure(self):
        normalized = SemanticDiffer._normalize_text("Jane Doe\n\nEXPERIENCE\nAcme")
        self.assertIn("\n", normalized)

    def test_normalization_still_collapses_runs_of_spaces(self):
        self.assertEqual(
            SemanticDiffer._normalize_text("Python    Django\t\tReact"),
            "Python Django React",
        )

    def test_normalization_still_collapses_runs_of_blank_lines(self):
        self.assertEqual(
            SemanticDiffer._normalize_text("Skills\n\n\n\nPython"),
            "Skills\n\nPython",
        )

    def test_a_section_after_the_first_line_is_found(self):
        """`^` could only match at offset zero, so every real resume had none."""
        text = SemanticDiffer._normalize_text(
            "Jane Doe\n\nEXPERIENCE\nBackend engineer at Acme\nBuilt billing\n\n"
            "EDUCATION\nBSc Computer Science"
        )

        self.assertEqual(
            SemanticDiffer._extract_section(text, "experience"),
            "Backend engineer at Acme\nBuilt billing",
        )
        self.assertEqual(
            SemanticDiffer._extract_section(text, "education"), "BSc Computer Science"
        )

    def test_skills_are_extracted_from_a_real_resume_shape(self):
        text = SemanticDiffer._normalize_text("Jane Doe\n\nSKILLS\nPython, Django, AWS")
        self.assertEqual(
            SemanticDiffer._extract_skills(text), {"python", "django", "aws"}
        )

    def test_the_label_colon_is_not_returned_as_a_skill(self):
        """`re.split` on "Skills: Python" left ": python" in the set."""
        text = SemanticDiffer._normalize_text("Skills: Python, Django, React")
        self.assertEqual(
            SemanticDiffer._extract_skills(text), {"python", "django", "react"}
        )

    def test_bullet_glyphs_are_not_returned_as_skills(self):
        text = SemanticDiffer._normalize_text("Skills\n- Python\n- Django\n- AWS")
        self.assertEqual(
            SemanticDiffer._extract_skills(text), {"python", "django", "aws"}
        )


class SemanticDifferComparisonTests(TestCase):
    """The endpoint returned an all-zero summary for every real resume."""

    V1 = (
        "Jane Doe\n\nExperience\nAcme Corp, engineer\nBuilt the billing service\n\n"
        "Skills\nPython, Django, React, SQL\n"
    )
    V2 = (
        "Jane Doe\n\nExperience\nAcme Corp, engineer\nBuilt the billing service\n"
        "Led the payments migration\nMentored two engineers\nOwned the on-call rota\n\n"
        "Skills\nPython, Django, React, AWS, Docker\n"
    )

    def test_added_and_removed_skills_are_reported(self):
        summary = SemanticDiffer.compare(self.V1, self.V2)["summary"]

        self.assertEqual(summary["skills_added"], 2)  # AWS, Docker
        self.assertEqual(summary["skills_removed"], 1)  # SQL

    def test_an_expanded_experience_section_is_reported(self):
        summary = SemanticDiffer.compare(self.V1, self.V2)["summary"]
        self.assertEqual(summary["experience_expanded"], 1)

    def test_an_added_education_section_is_reported(self):
        with_education = self.V1 + "\nEducation\nBSc Computer Science\n"
        changes = SemanticDiffer.compare(self.V1, with_education)["changes"]

        education = [c for c in changes if c["category"] == "education"]
        self.assertEqual(len(education), 1)
        self.assertEqual(education[0]["change_type"], "added")

    def test_comparing_a_resume_with_itself_reports_nothing(self):
        result = SemanticDiffer.compare(self.V1, self.V1)
        self.assertEqual(result["changes"], [])

    def test_whitespace_only_changes_are_ignored(self):
        spaced = self.V1.replace("\n", "\n\n").replace(", ", ",   ")
        result = SemanticDiffer.compare(self.V1, spaced)

        self.assertEqual(result["summary"]["skills_added"], 0)
        self.assertEqual(result["summary"]["skills_removed"], 0)
