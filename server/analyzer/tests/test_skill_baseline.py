from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase


class SkillExtractionBaselineTests(APITestCase):

    def analyze_text(self, text):
        page = MagicMock()
        page.extract_text.return_value = text

        pdf = MagicMock()
        pdf.pages = [page]

        context = MagicMock()
        context.__enter__.return_value = pdf
        context.__exit__.return_value = False

        resume = SimpleUploadedFile(
            "resume.pdf",
            b"%PDF-1.4 baseline fixture",
            content_type="application/pdf",
        )

        with patch("analyzer.views.pdfplumber.open", return_value=context):
            response = self.client.post(
                "/api/upload/",
                {"file": resume},
                format="multipart",
            )

        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data["skills_found"], list)

        return response.data["skills_found"]

    def test_c_is_not_detected_inside_education(self):
        self.assertNotIn(
            "c",
            self.analyze_text("Education and academic background"),
        )

    def test_react_is_not_detected_inside_reactive(self):
        self.assertNotIn(
            "react",
            self.analyze_text("Worked on reactive architecture"),
        )

    def test_js_alias_resolves_to_javascript(self):
        self.assertIn(
            "javascript",
            self.analyze_text("Experienced JS developer"),
        )

    def test_cpp_alias_resolves_to_cplusplus(self):
        self.assertIn(
            "c++",
            self.analyze_text("CPP systems engineer"),
        )