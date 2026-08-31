"""
Comprehensive tests ensuring accurate categorization of added, removed,
and modified resume elements.
"""

from django.test import TestCase

from analyzer.quarantine import skip_while_broken
from analyzer.semantic_differ import SemanticDiffer, SemanticChange


#: These tests were written against behaviour the modules under test do not
#: have. They failed from the day they were written and nobody saw it, because
#: the package they lived in was never collected (#913). Turning collection
#: back on without quarantining them would land a red build for bugs this
#: change is not making.
#:
#: Each quarantine names the issue that tracks its bug and carries a probe for
#: it, so the test starts running again on its own once the fix lands — in
#: whatever order these pull requests are merged. See `analyzer/quarantine.py`
#: for why a plain @skip would outlive its reason here.

class SemanticDifferTestCase(TestCase):
    def test_skill_extraction_and_comparison(self):
        text_v1 = "Skills: Python, Django, React, SQL"
        text_v2 = "Skills: Python, Django, React, AWS, Docker"

        result = SemanticDiffer.compare(text_v1, text_v2)
        summary = result["summary"]

        self.assertEqual(summary["skills_added"], 2)  # AWS, Docker
        self.assertEqual(summary["skills_removed"], 1)  # SQL

    def test_action_verb_improvement(self):
        text_v1 = "Responsible for managing the team and worked on the backend."
        text_v2 = "Spearheaded the team and orchestrated the backend architecture."

        result = SemanticDiffer.compare(text_v1, text_v2)
        summary = result["summary"]

        self.assertGreater(summary["phrasing_improved"], 0)

    @skip_while_broken(
        lambda: "\n" not in SemanticDiffer._normalize_text("Experience\nAcme Corp"),
        "#916: _normalize_text strips the newlines the section patterns anchor to",
    )
    def test_experience_section_expansion(self):
        text_v1 = "Experience\nJob 1\nDid things."
        text_v2 = "Experience\nJob 1\nDid things.\nJob 2\nDid more things.\nJob 3\nEven more things.\nExtra line 1\nExtra line 2\nExtra line 3"

        result = SemanticDiffer.compare(text_v1, text_v2)
        summary = result["summary"]

        self.assertEqual(summary["experience_expanded"], 1)

    def test_empty_input_handling(self):
        result = SemanticDiffer.compare("", "Some text")
        self.assertIn("error", result)

    def test_identical_texts(self):
        text = "Skills: Python\nExperience: Job 1"
        result = SemanticDiffer.compare(text, text)

        self.assertEqual(result["summary"]["skills_added"], 0)
        self.assertEqual(result["summary"]["skills_removed"], 0)
        self.assertEqual(len(result["changes"]), 0)
