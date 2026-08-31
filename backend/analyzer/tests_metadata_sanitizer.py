"""
Unit tests for the Metadata Sanitizer module.

Verifies metadata removal and redaction accuracy without corrupting structure.
"""

from django.test import TestCase
from .metadata_sanitizer import detect_pii_in_text, redact_pii_from_text


class MetadataSanitizerTests(TestCase):
    """Test suite for metadata sanitization and PII redaction logic."""

    def test_detect_pii_email(self):
        """Test that email addresses are correctly detected."""
        text = "Contact me at john.doe@example.com for more info."
        detections = detect_pii_in_text(text)
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["type"], "email")
        self.assertEqual(detections[0]["value"], "john.doe@example.com")

    def test_detect_pii_phone(self):
        """Test that phone numbers are correctly detected."""
        text = "Call me at (555) 123-4567 or 555-987-6543."
        detections = detect_pii_in_text(text)
        self.assertEqual(len(detections), 2)
        self.assertTrue(all(d["type"] == "phone" for d in detections))

    def test_detect_pii_ssn(self):
        """Test that SSN patterns are correctly detected."""
        text = "My SSN is 123-45-6789, please keep it safe."
        detections = detect_pii_in_text(text)
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["type"], "ssn")

    def test_redact_pii_single_type(self):
        """Test redaction of a single PII type."""
        text = "Email: test@test.com and Phone: 555-123-4567"
        redacted = redact_pii_from_text(text, ["email"])
        self.assertIn("[REDACTED]", redacted)
        self.assertIn("555-123-4567", redacted)  # Phone should remain
        self.assertNotIn("test@test.com", redacted)

    def test_redact_pii_multiple_types(self):
        """Test redaction of multiple PII types simultaneously."""
        text = "Contact test@test.com or call 555-123-4567. SSN: 123-45-6789"
        redacted = redact_pii_from_text(text, ["email", "phone", "ssn"])
        self.assertEqual(redacted.count("[REDACTED]"), 3)
        self.assertNotIn("test@test.com", redacted)
        self.assertNotIn("555-123-4567", redacted)
        self.assertNotIn("123-45-6789", redacted)

    def test_redact_pii_no_matches(self):
        """Test that text without PII remains unchanged."""
        text = "This is a safe sentence with no personal information."
        redacted = redact_pii_from_text(text, ["email", "phone"])
        self.assertEqual(text, redacted)

    def test_redact_pii_empty_text(self):
        """Test that empty text handling is safe."""
        redacted = redact_pii_from_text("", ["email"])
        self.assertEqual(redacted, "")
