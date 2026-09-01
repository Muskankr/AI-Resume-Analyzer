"""Validation for every file the API accepts.

The parser in :mod:`analyzer.services` reads PDF, DOCX and TXT resumes, but the
upload endpoints used to allow PDF only, and the cover-letter field was not
validated at all. This module keeps one description of what a valid upload is
so every entry point (resume, cover letter, the two comparison files) agrees.

A format is described by its extensions, the bytes a real file of that type
starts with, and the content types browsers send for it. Extension alone is not
enough — anyone can rename a file — so the header is checked too. Plain text has
no signature, so it is validated by decoding a sample of it instead.
"""

from dataclasses import dataclass
from typing import Optional, Sequence, Tuple

from django.conf import settings

#: Fallback ceiling when ``MAX_UPLOAD_SIZE_BYTES`` is not configured.
DEFAULT_MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB

#: How many bytes we read to identify a file. Large enough for every signature
#: below and for a representative text sample, small enough to stay cheap.
SNIFF_LENGTH = 4096


class UploadValidationError(ValueError):
    """Raised when an uploaded file is not something we can analyse.

    Subclasses :class:`ValueError` so the existing ``except ValueError`` blocks
    in the views keep working unchanged.
    """


@dataclass(frozen=True)
class FileFormat:
    """One accepted upload format."""

    key: str
    label: str
    extensions: Tuple[str, ...]
    #: Byte prefixes a genuine file of this type starts with. Empty means the
    #: format has no signature and is identified by :attr:`text_like` instead.
    magic_prefixes: Tuple[bytes, ...] = ()
    #: Byte sequences that must occur at fixed offsets. This covers formats
    #: such as WebP, whose signature is split by a variable-length field.
    magic_offsets: Tuple[Tuple[int, bytes], ...] = ()
    content_types: Tuple[str, ...] = ()
    #: Formats without a signature (plain text) are accepted when the sample
    #: decodes cleanly and holds no NUL bytes.
    text_like: bool = False

    def matches_extension(self, file_name: str) -> bool:
        name = (file_name or "").lower()
        return any(name.endswith(ext) for ext in self.extensions)

    def matches_content(self, sample: bytes) -> bool:
        if self.magic_prefixes and not any(
            sample.startswith(prefix) for prefix in self.magic_prefixes
        ):
            return False
        if self.magic_offsets and not all(
            sample[offset : offset + len(expected)] == expected
            for offset, expected in self.magic_offsets
        ):
            return False
        if self.magic_prefixes or self.magic_offsets:
            return True
        if self.text_like:
            return _looks_like_text(sample)
        return False


PDF = FileFormat(
    key="pdf",
    label="PDF",
    extensions=(".pdf",),
    magic_prefixes=(b"%PDF",),
    content_types=("application/pdf",),
)

DOCX = FileFormat(
    key="docx",
    label="Word (.docx)",
    extensions=(".docx",),
    # .docx is a ZIP container, so it carries the ZIP local-file-header magic.
    # The two alternatives cover empty and spanned archives written by some
    # export tools.
    magic_prefixes=(b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"),
    content_types=(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
)

TXT = FileFormat(
    key="txt",
    label="plain text",
    extensions=(".txt",),
    content_types=("text/plain",),
    text_like=True,
)

# Profile images and photographed resume photos must be recognised by content and extension.
PNG = FileFormat(
    key="png",
    label="PNG image",
    extensions=(".png",),
    magic_prefixes=(b"\x89PNG\r\n\x1a\n",),
    content_types=("image/png",),
)

JPEG = FileFormat(
    key="jpeg",
    label="JPEG image",
    extensions=(".jpg", ".jpeg"),
    magic_prefixes=(b"\xff\xd8\xff",),
    content_types=("image/jpeg",),
)

WEBP = FileFormat(
    key="webp",
    label="WebP image",
    extensions=(".webp",),
    magic_offsets=((0, b"RIFF"), (8, b"WEBP")),
    content_types=("image/webp",),
)

#: Formats accepted for resumes and cover letters — digital files and photographed printed resumes.
RESUME_FORMATS: Tuple[FileFormat, ...] = (PDF, DOCX, TXT, PNG, JPEG, WEBP)

AVATAR_FORMATS: Tuple[FileFormat, ...] = (PNG, JPEG, WEBP)


def _looks_like_text(sample: bytes) -> bool:
    """True when ``sample`` plausibly comes from a plain-text file."""
    if not sample:
        return False
    if b"\x00" in sample:
        return False
    try:
        sample.decode("utf-8")
        return True
    except UnicodeDecodeError:
        # Resumes exported from older Windows editors are often cp1252. Accept
        # them as long as the bytes are not obviously binary.
        printable = sum(
            1 for byte in sample if byte in (9, 10, 13) or 32 <= byte <= 126 or byte >= 160
        )
        return printable / len(sample) > 0.9


def get_max_upload_size() -> int:
    """Configured upload ceiling in bytes."""
    return getattr(settings, "MAX_UPLOAD_SIZE_BYTES", DEFAULT_MAX_UPLOAD_SIZE)


def describe_formats(formats: Sequence[FileFormat]) -> str:
    """Human-readable list of accepted formats, e.g. ``PDF, Word (.docx) or plain text``."""
    labels = [fmt.label for fmt in formats]
    if len(labels) == 1:
        return labels[0]
    return "{} or {}".format(", ".join(labels[:-1]), labels[-1])


def allowed_extensions(formats: Sequence[FileFormat] = RESUME_FORMATS) -> Tuple[str, ...]:
    """Flat tuple of every extension the given formats accept."""
    return tuple(ext for fmt in formats for ext in fmt.extensions)


def read_sample(uploaded_file) -> bytes:
    """Read the head of ``uploaded_file`` without disturbing its position.

    Django's ``UploadedFile`` is re-read later by the storage backend, so the
    cursor has to go back where it was.
    """
    try:
        position = uploaded_file.tell()
    except Exception:
        position = None

    try:
        sample = uploaded_file.read(SNIFF_LENGTH)
    except Exception:
        sample = b""

    try:
        uploaded_file.seek(position if position is not None else 0)
    except Exception:
        pass

    if isinstance(sample, str):  # pragma: no cover - defensive, files are binary
        sample = sample.encode("utf-8", errors="ignore")
    return sample or b""


def detect_format(
    uploaded_file,
    formats: Sequence[FileFormat] = RESUME_FORMATS,
) -> Optional[FileFormat]:
    """Return the format whose extension *and* content both match, else ``None``.

    The extension decides which format we expect; the content decides whether
    the file really is one. A ``.exe`` renamed to ``.pdf`` matches the PDF
    extension but not the ``%PDF`` header, so it is rejected.
    """
    name = getattr(uploaded_file, "name", "") or ""
    candidates = [fmt for fmt in formats if fmt.matches_extension(name)]
    if not candidates:
        return None

    sample = read_sample(uploaded_file)
    for fmt in candidates:
        if fmt.matches_content(sample):
            return fmt
    return None


def validate_upload(
    uploaded_file,
    formats: Sequence[FileFormat] = RESUME_FORMATS,
    field_label: str = "file",
    max_size: Optional[int] = None,
) -> FileFormat:
    """Validate one uploaded file and return the format it was recognised as.

    Args:
        uploaded_file: A Django ``UploadedFile`` (or anything with ``name``,
            ``size`` and ``read``).
        formats: Accepted formats, defaulting to the three resume formats.
        field_label: Name used in error messages, e.g. ``"cover letter"``.
        max_size: Override for the configured size ceiling, in bytes.

    Raises:
        UploadValidationError: With a message safe to show to the user.
    """
    if uploaded_file is None:
        raise UploadValidationError(f"No {field_label} was uploaded.")

    size = getattr(uploaded_file, "size", 0) or 0
    if size == 0:
        raise UploadValidationError(f"The uploaded {field_label} is empty.")

    ceiling = get_max_upload_size() if max_size is None else max_size
    if size > ceiling:
        raise UploadValidationError(
            f"The {field_label} exceeds the maximum allowed size of "
            f"{ceiling // (1024 * 1024)}MB."
        )

    name = getattr(uploaded_file, "name", "") or ""
    if not any(fmt.matches_extension(name) for fmt in formats):
        raise UploadValidationError(
            f"Unsupported {field_label} format. Please upload {describe_formats(formats)}."
        )

    detected = detect_format(uploaded_file, formats)
    if detected is None:
        raise UploadValidationError(
            f"The {field_label} does not look like a valid "
            f"{describe_formats(formats)} file. It may be corrupted or renamed."
        )

    return detected


def validate_optional_upload(
    uploaded_file,
    formats: Sequence[FileFormat] = RESUME_FORMATS,
    field_label: str = "file",
    max_size: Optional[int] = None,
) -> Optional[FileFormat]:
    """Same as :func:`validate_upload` but ``None`` in, ``None`` out.

    Used for fields such as the cover letter, which are allowed to be absent
    but must be valid when present.
    """
    if uploaded_file is None:
        return None
    return validate_upload(
        uploaded_file,
        formats=formats,
        field_label=field_label,
        max_size=max_size,
    )
