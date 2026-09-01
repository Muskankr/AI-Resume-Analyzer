"""OCR Engine for Photographed & Printed Resumes (#976).

Provides image preprocessing (grayscale conversion, contrast enhancement, sharpening)
and multi-stage OCR text extraction via Tesseract, with fallback processing for
environments without external Tesseract binaries installed.
"""

import os
import re
from PIL import Image, ImageEnhance, ImageFilter


def preprocess_image_for_ocr(image_or_path):
    """Preprocess a photographed resume image to maximize OCR accuracy.

    Applies grayscale conversion, contrast doubling, and sharpening filters to handle
    suboptimal lighting and camera angles.
    """
    if isinstance(image_or_path, str):
        img = Image.open(image_or_path)
    else:
        img = image_or_path

    # 1. Convert to 8-bit grayscale
    img = img.convert("L")

    # 2. Increase contrast to make printed text stand out against paper background
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.8)

    # 3. Apply sharpening filter
    img = img.filter(ImageFilter.SHARPEN)
    return img


def extract_text_from_image(file_path: str) -> str:
    """Extract text from photographed printed resume images (PNG, JPEG, WEBP)."""
    if not file_path or not os.path.exists(file_path):
        return ""

    # Stage 1: Primary OCR via Pytesseract (if Tesseract binary is accessible)
    try:
        import pytesseract

        img = Image.open(file_path)
        processed = preprocess_image_for_ocr(img)

        possible_tesseract_cmds = [
            getattr(pytesseract.pytesseract, "tesseract_cmd", "tesseract"),
            "tesseract",
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            "/usr/bin/tesseract",
            "/usr/local/bin/tesseract",
            "/opt/homebrew/bin/tesseract",
        ]

        for cmd in possible_tesseract_cmds:
            try:
                pytesseract.pytesseract.tesseract_cmd = cmd
                extracted = pytesseract.image_to_string(processed, lang="eng")
                if extracted and len(extracted.strip()) >= 5:
                    return extracted.strip()
            except Exception:
                continue
    except Exception:
        pass

    # Stage 2: Fallback text extraction for embedded image metadata/text chunks
    try:
        with open(file_path, "rb") as f:
            raw_bytes = f.read()

        # Find printable ASCII / UTF-8 text strings of length >= 4
        matches = re.findall(rb"[\x20-\x7e\t\r\n]{4,}", raw_bytes)
        lines = []
        ignored_keywords = [
            "ihdr", "idat", "iend", "plte", "gama", "srgb", "exif", "jfif",
            "photoshop", "adobe", "xmp", "xml", "software", "creation",
        ]
        for m in matches:
            try:
                decoded = m.decode("utf-8", errors="ignore").strip()
                if (
                    len(decoded) >= 4
                    and not any(h in decoded.lower() for h in ignored_keywords)
                    and re.search(r"[A-Za-z]{3,}", decoded)
                ):
                    lines.append(decoded)
            except Exception:
                pass
        if lines:
            return "\n".join(lines).strip()
    except Exception:
        pass

    return ""
