"""
Resume File Metadata Sanitizer and Privacy Scrubber.

This module extracts, displays, and strips hidden PDF/DOCX metadata
and provides logic for redacting Personally Identifiable Information (PII).
"""

import re
import io
import tempfile
import os
from typing import Dict, Any, List, Optional

# PII Detection Patterns
PII_PATTERNS = {
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "phone": r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b",
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "address": r"\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b",
}


def extract_pdf_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extracts metadata from a PDF file.
    Note: Requires pdfplumber or PyPDF2. Using a simplified mock for structure.
    """
    try:
        import pdfplumber

        with pdfplumber.open(file_path) as pdf:
            metadata = pdf.metadata or {}
            return {
                "author": metadata.get("Author", "Unknown"),
                "creator": metadata.get("Creator", "Unknown"),
                "producer": metadata.get("Producer", "Unknown"),
                "creation_date": metadata.get("CreationDate", "Unknown"),
                "modification_date": metadata.get("ModDate", "Unknown"),
                "has_hidden_layers": False,  # Simplified
            }
    except ImportError:
        return {"error": "pdfplumber not installed"}
    except Exception as e:
        return {"error": str(e)}


def extract_docx_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extracts metadata from a DOCX file.
    """
    try:
        from docx import Document

        doc = Document(file_path)
        core_properties = doc.core_properties

        return {
            "author": core_properties.author or "Unknown",
            "last_modified_by": core_properties.last_modified_by or "Unknown",
            "created": (
                str(core_properties.created) if core_properties.created else "Unknown"
            ),
            "modified": (
                str(core_properties.modified) if core_properties.modified else "Unknown"
            ),
            "revision": (
                str(core_properties.revision) if core_properties.revision else "1"
            ),
        }
    except ImportError:
        return {"error": "python-docx not installed"}
    except Exception as e:
        return {"error": str(e)}


def detect_pii_in_text(text: str) -> List[Dict[str, Any]]:
    """
    Detects PII in the provided text based on regex patterns.
    """
    detections = []
    for pii_type, pattern in PII_PATTERNS.items():
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            detections.append(
                {
                    "type": pii_type,
                    "value": match.group(),
                    "start": match.start(),
                    "end": match.end(),
                }
            )
    return detections


def redact_pii_from_text(text: str, pii_types_to_redact: List[str]) -> str:
    """
    Redacts specified PII types from the text, replacing them with [REDACTED].
    """
    redacted_text = text
    # Sort by type to ensure consistent processing
    for pii_type in sorted(pii_types_to_redact):
        if pii_type in PII_PATTERNS:
            pattern = PII_PATTERNS[pii_type]
            redacted_text = re.sub(
                pattern, "[REDACTED]", redacted_text, flags=re.IGNORECASE
            )
    return redacted_text


def sanitize_pdf_file(input_path: str, output_path: str) -> bool:
    """
    Sanitizes a PDF file by removing metadata.
    Note: True PDF sanitization requires rewriting the PDF.
    This is a simplified version that creates a clean copy.
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(input_path)

        # Remove metadata
        doc.set_metadata({})

        # Save to new path
        doc.save(output_path, garbage=4, deflate=True)
        doc.close()
        return True
    except ImportError:
        return False
    except Exception:
        return False


def sanitize_docx_file(input_path: str, output_path: str) -> bool:
    """
    Sanitizes a DOCX file by clearing core properties.
    """
    try:
        from docx import Document

        doc = Document(input_path)

        # Clear properties
        doc.core_properties.author = ""
        doc.core_properties.last_modified_by = ""
        doc.core_properties.comments = ""

        doc.save(output_path)
        return True
    except ImportError:
        return False
    except Exception:
        return False
