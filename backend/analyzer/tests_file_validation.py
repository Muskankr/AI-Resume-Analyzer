"""Tests for upload validation (``analyzer.file_validation``) and the endpoints that use it.

Covers the three formats the parser reads, the rejection cases, and the upload
paths that previously accepted files without checking them: the cover-letter
field, the two comparison files and the bulk-JD resume.
"""

import json
from unittest.mock import patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.file_validation import (
    DOCX,
    PDF,
    RESUME_FORMATS,
    TXT,
    UploadValidationError,
    describe_formats,
    detect_format,
    validate_optional_upload,
    validate_upload,
)

# Minimal payloads that carry the right signature for each format. They do not
# have to be parseable — validation only looks at size, extension and header.
PDF_BYTES = b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n"
DOCX_BYTES = b"PK\x03\x04" + b"\x00" * 60
TXT_BYTES = b"Jane Doe\nPython developer with Django and React experience.\n"


def pdf_upload(name="resume.pdf"):
    return SimpleUploadedFile(name, PDF_BYTES, content_type="application/pdf")


def docx_upload(name="resume.docx"):
    return SimpleUploadedFile(
        name,
        DOCX_BYTES,
        content_type=(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ),
    )


def txt_upload(name="resume.txt", body=TXT_BYTES):
    return SimpleUploadedFile(name, body, content_type="text/plain")


class DetectFormatTests(TestCase):
    def test_detects_each_supported_format(self):
        self.assertEqual(detect_format(pdf_upload()), PDF)
        self.assertEqual(detect_format(docx_upload()), DOCX)
        self.assertEqual(detect_format(txt_upload()), TXT)

    def test_unknown_extension_is_not_detected(self):
        upload = SimpleUploadedFile("resume.rtf", b"{\\rtf1}", content_type="text/rtf")
        self.assertIsNone(detect_format(upload))

    def test_extension_alone_is_not_enough(self):
        """A binary renamed to .pdf has the extension but not the signature."""
        disguised = SimpleUploadedFile(
            "resume.pdf", b"MZ\x90\x00\x03\x00", content_type="application/pdf"
        )
        self.assertIsNone(detect_format(disguised))

    def test_reading_the_header_leaves_the_cursor_where_it_was(self):
        """Storage re-reads the file afterwards, so the position must be restored."""
        upload = pdf_upload()
        detect_format(upload)
        self.assertEqual(upload.read(), PDF_BYTES)

    def test_binary_content_is_not_accepted_as_text(self):
        binary = SimpleUploadedFile(
            "resume.txt", b"\x00\x01\x02\x03\xff\xfe", content_type="text/plain"
        )
        self.assertIsNone(detect_format(binary))

    def test_non_utf8_text_is_still_accepted(self):
        """Resumes exported by older Windows editors are often cp1252."""
        cp1252 = "Café résumé — 5 years".encode("cp1252")
        self.assertEqual(detect_format(txt_upload(body=cp1252)), TXT)


class ValidateUploadTests(TestCase):
    def test_accepts_pdf_docx_and_txt(self):
        for upload, expected in (
            (pdf_upload(), PDF),
            (docx_upload(), DOCX),
            (txt_upload(), TXT),
        ):
            with self.subTest(upload=upload.name):
                self.assertEqual(validate_upload(upload), expected)

    def test_rejects_missing_file(self):
        with self.assertRaises(UploadValidationError) as ctx:
            validate_upload(None, field_label="resume")
        self.assertIn("No resume was uploaded", str(ctx.exception))

    def test_rejects_empty_file(self):
        empty = SimpleUploadedFile("resume.pdf", b"", content_type="application/pdf")
        with self.assertRaises(UploadValidationError) as ctx:
            validate_upload(empty, field_label="resume")
        self.assertIn("empty", str(ctx.exception))

    @override_settings(MAX_UPLOAD_SIZE_BYTES=1024)
    def test_rejects_oversized_file(self):
        big = SimpleUploadedFile("resume.pdf", PDF_BYTES + b"0" * 2048, content_type="application/pdf")
        with self.assertRaises(UploadValidationError) as ctx:
            validate_upload(big, field_label="resume")
        self.assertIn("maximum allowed size", str(ctx.exception))

    def test_max_size_argument_overrides_the_setting(self):
        with self.assertRaises(UploadValidationError):
            validate_upload(pdf_upload(), max_size=4)

    def test_rejects_unsupported_extension_with_a_helpful_message(self):
        upload = SimpleUploadedFile("resume.exe", b"MZ\x90\x00", content_type="application/octet-stream")
        with self.assertRaises(UploadValidationError) as ctx:
            validate_upload(upload, field_label="resume")
        message = str(ctx.exception)
        self.assertIn("Unsupported resume format", message)
        self.assertIn("PDF", message)
        self.assertIn("Word (.docx)", message)

    def test_rejects_renamed_file_whose_contents_do_not_match(self):
        disguised = SimpleUploadedFile("resume.docx", b"not a zip archive", content_type="text/plain")
        with self.assertRaises(UploadValidationError) as ctx:
            validate_upload(disguised, field_label="resume")
        self.assertIn("does not look like", str(ctx.exception))

    def test_error_is_a_value_error(self):
        """Existing views catch ValueError, so the subclass has to stay compatible."""
        self.assertTrue(issubclass(UploadValidationError, ValueError))

    def test_optional_upload_allows_none(self):
        self.assertIsNone(validate_optional_upload(None, field_label="cover letter"))

    def test_optional_upload_still_validates_when_present(self):
        with self.assertRaises(UploadValidationError):
            validate_optional_upload(
                SimpleUploadedFile("cover.exe", b"MZ", content_type="application/octet-stream"),
                field_label="cover letter",
            )

    def test_describe_formats_reads_naturally(self):
        self.assertEqual(
            describe_formats(RESUME_FORMATS), "PDF, Word (.docx) or plain text"
        )
        self.assertEqual(describe_formats((PDF,)), "PDF")


@override_settings(RESUME_UPLOAD_RATE="1000/hour")
class UploadEndpointValidationTests(TestCase):
    """End-to-end checks through ``/api/upload/``.

    The Celery task is patched out — the point here is which files get past
    validation, not what the analysis produces. The upload throttle is raised
    and its cache cleared so a run of several uploads does not trip the
    per-IP rate limit.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _post(self, **payload):
        with patch("analyzer.views.analyze_resume_task.delay") as mock_delay:
            mock_delay.return_value = type("Task", (), {"id": "test-task-id"})()
            response = self.client.post("/api/v1/upload/", payload)
        return response

    def test_pdf_resume_is_accepted(self):
        response = self._post(file=pdf_upload(), role="Frontend Developer")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["task_id"], "test-task-id")

    def test_docx_resume_is_accepted(self):
        response = self._post(file=docx_upload(), role="Frontend Developer")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_txt_resume_is_accepted(self):
        response = self._post(file=txt_upload(), role="Frontend Developer")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unsupported_format_is_rejected(self):
        response = self._post(
            file=SimpleUploadedFile("resume.exe", b"MZ\x90\x00", content_type="application/octet-stream"),
            role="Frontend Developer",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported resume format", response.data["error"])

    def test_invalid_cover_letter_is_rejected(self):
        response = self._post(
            file=pdf_upload(),
            cover_letter=SimpleUploadedFile(
                "cover.exe", b"MZ\x90\x00", content_type="application/octet-stream"
            ),
            role="Frontend Developer",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cover letter", response.data["error"])

    @override_settings(MAX_UPLOAD_SIZE_BYTES=1024)
    def test_oversized_cover_letter_is_rejected(self):
        """The size ceiling used to apply to the resume field only."""
        response = self._post(
            file=pdf_upload(),
            cover_letter=SimpleUploadedFile(
                "cover.pdf", PDF_BYTES + b"0" * 4096, content_type="application/pdf"
            ),
            role="Frontend Developer",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maximum allowed size", response.data["error"])

    def test_valid_cover_letter_is_accepted(self):
        response = self._post(
            file=pdf_upload(),
            cover_letter=docx_upload("cover.docx"),
            role="Frontend Developer",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


@override_settings(RESUME_UPLOAD_RATE="1000/hour")
class ComparisonUploadValidationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_compare_uploads_rejects_an_invalid_second_file(self):
        response = self.client.post(
            "/api/v1/compare-uploads/",
            {
                "file1": txt_upload("v1.txt"),
                "file2": SimpleUploadedFile(
                    "v2.exe", b"MZ\x90\x00", content_type="application/octet-stream"
                ),
                "role": "Frontend Developer",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("second resume", response.data["error"])

    def test_compare_uploads_accepts_two_valid_files(self):
        response = self.client.post(
            "/api/v1/compare-uploads/",
            {
                "file1": txt_upload("v1.txt", b"Python developer with Django experience."),
                "file2": txt_upload("v2.txt", b"Python developer with Django and React experience."),
                "role": "Frontend Developer",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("score_delta", response.data)

    def test_bulk_jd_comparison_rejects_an_invalid_resume(self):
        response = self.client.post(
            "/api/v1/compare-bulk-jds/",
            {
                "file": SimpleUploadedFile(
                    "resume.exe", b"MZ\x90\x00", content_type="application/octet-stream"
                ),
                "job_descriptions": json.dumps(["Python django developer"]),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported resume format", response.data["error"])
