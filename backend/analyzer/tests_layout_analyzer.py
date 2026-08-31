"""
Unit tests validating bounding box calculations, section detection, and scoring rules.
"""

from django.test import TestCase
from analyzer.layout_analyzer import LayoutAnalyzer, LayoutIssue


class LayoutAnalyzerTestCase(TestCase):
    def test_section_order_detection(self):
        detected = ["experience", "summary", "skills"]
        issues = LayoutAnalyzer._check_section_order(detected)

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].issue_type, "Section Ordering")
        self.assertEqual(issues[0].severity, "Medium")

    def test_font_consistency_check(self):
        sizes = {10.0, 11.0, 12.0, 14.0, 16.0, 8.0}
        issues = LayoutAnalyzer._check_font_consistency(sizes)

        self.assertEqual(len(issues), 2)
        severity_types = [i.severity for i in issues]
        self.assertIn("Medium", severity_types)
        self.assertIn("High", severity_types)

    def test_line_length_check(self):
        # Fixed typo: added '=' for keyword argument
        issues = LayoutAnalyzer._check_line_length(long_lines=20, total_lines=100)
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].issue_type, "Line Length")

    def test_score_calculation(self):
        issues = [
            LayoutIssue("Structure", "Ordering", "High", "desc", "rec"),
            LayoutIssue("Typography", "Size", "Medium", "desc", "rec"),
        ]
        score = LayoutAnalyzer._calculate_layout_score(issues, sections=4, fonts=2)
        self.assertEqual(score, 70)  # 100 - 20 (High) - 10 (Medium)
