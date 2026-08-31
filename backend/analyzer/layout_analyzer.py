"""
Advanced parsing logic using pdfplumber to analyze bounding boxes,
font variations, whitespace, and section ordering.
"""

import pdfplumber
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import re


@dataclass
class LayoutIssue:
    section: str
    issue_type: str
    severity: str
    description: str
    recommendation: str


class LayoutAnalyzer:
    """Analyzes resume layout, formatting, and visual structure."""

    EXPECTED_SECTIONS = ["education", "experience", "skills", "summary", "projects"]
    MAX_LINE_LENGTH = 100
    MIN_FONT_SIZE = 9.0
    MAX_FONT_SIZE = 14.0

    @classmethod
    def analyze_pdf(cls, file_path: str) -> Dict[str, Any]:
        """Perform comprehensive layout analysis on a PDF file."""
        issues = []
        section_order = []
        font_sizes = set()
        total_lines = 0
        long_lines = 0

        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if not text:
                        continue

                    lines = text.split("\n")
                    total_lines += len(lines)

                    for line in lines:
                        if len(line) > cls.MAX_LINE_LENGTH:
                            long_lines += 1

                    # Extract font information from characters
                    chars = page.chars
                    if chars:
                        for char in chars:
                            font_sizes.add(round(char["size"], 1))

                    # Detect sections based on bounding boxes and text
                    words = page.extract_words()
                    for word in words:
                        if word["text"].lower().strip(".") in cls.EXPECTED_SECTIONS:
                            if word["text"].lower() not in section_order:
                                section_order.append(word["text"].lower())

        except Exception as e:
            return {"error": str(e), "score": 0, "issues": []}

        issues.extend(cls._check_section_order(section_order))
        issues.extend(cls._check_font_consistency(font_sizes))
        issues.extend(cls._check_line_length(long_lines, total_lines))

        score = cls._calculate_layout_score(issues, len(section_order), len(font_sizes))

        return {
            "score": score,
            "issues": [i.__dict__ for i in issues],
            "detected_sections": section_order,
            "unique_font_sizes": len(font_sizes),
            "total_lines": total_lines,
        }

    @classmethod
    def _check_section_order(cls, detected: List[str]) -> List[LayoutIssue]:
        issues = []
        if "summary" in detected and "experience" in detected:
            if detected.index("summary") > detected.index("experience"):
                issues.append(
                    LayoutIssue(
                        section="Structure",
                        issue_type="Section Ordering",
                        severity="Medium",
                        description="Summary appears after Experience.",
                        recommendation="Move the Professional Summary to the top of the resume.",
                    )
                )
        if "education" in detected and "experience" in detected:
            if detected.index("education") < detected.index("experience"):
                issues.append(
                    LayoutIssue(
                        section="Structure",
                        issue_type="Section Ordering",
                        severity="Low",
                        description="Education appears before Experience.",
                        recommendation="For experienced professionals, place Experience before Education.",
                    )
                )
        return issues

    @classmethod
    def _check_font_consistency(cls, sizes: set) -> List[LayoutIssue]:
        issues = []
        if len(sizes) > 4:
            issues.append(
                LayoutIssue(
                    section="Typography",
                    issue_type="Font Inconsistency",
                    severity="Medium",
                    description=f"Detected {len(sizes)} different font sizes.",
                    recommendation="Limit font sizes to 2-3 variations (e.g., 10pt body, 12pt headers, 14pt name).",
                )
            )
        if any(size < cls.MIN_FONT_SIZE for size in sizes):
            issues.append(
                LayoutIssue(
                    section="Typography",
                    issue_type="Readability",
                    severity="High",
                    description="Some text is smaller than 9pt.",
                    recommendation="Increase font size to at least 10pt for ATS readability.",
                )
            )
        return issues

    @classmethod
    def _check_line_length(cls, long_lines: int, total_lines: int) -> List[LayoutIssue]:
        issues = []
        if total_lines > 0 and (long_lines / total_lines) > 0.15:
            issues.append(
                LayoutIssue(
                    section="Formatting",
                    issue_type="Line Length",
                    severity="Medium",
                    description="More than 15% of lines exceed 100 characters.",
                    recommendation="Break long bullet points into concise, readable lines.",
                )
            )
        return issues

    @classmethod
    def _calculate_layout_score(
        cls, issues: List[LayoutIssue], sections: int, fonts: int
    ) -> int:
        score = 100
        for issue in issues:
            if issue.severity == "High":
                score -= 20
            elif issue.severity == "Medium":
                score -= 10
            else:
                score -= 5

        if sections < 3:
            score -= 15

        return max(0, score)
