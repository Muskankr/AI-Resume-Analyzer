"""
Views for Metadata Sanitizer.

Exposes endpoints for GET /api/file-metadata/ and POST /api/sanitize-resume/.
"""

import logging
import os
import tempfile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import AnonRateThrottle
from .metadata_sanitizer import (
    extract_pdf_metadata,
    extract_docx_metadata,
    detect_pii_in_text,
    redact_pii_from_text,
    sanitize_pdf_file,
    sanitize_docx_file,
)
from .sanitizer_serializers import (
    MetadataExtractionRequestSerializer,
    PIIRedactionRequestSerializer,
    MetadataResponseSerializer,
    RedactionResponseSerializer,
)

#: The extensions this view knows how to read. Also the allowlist for the
#: temp-file suffix, so a caller cannot steer that through the upload name.
SUPPORTED_EXTENSIONS = ("pdf", "docx")

logger = logging.getLogger(__name__)


class FileMetadataThrottle(AnonRateThrottle):
    """Caps /api/file-metadata/.

    Of the endpoints routed in this pass this is the one that most needs a
    ceiling: it is open (``AllowAny`` by default, not overridden here), it
    accepts an arbitrary upload, and it writes every request body to the
    server's disk before doing any work. Unlimited, that is a way to fill a
    disk from off the internet.
    """

    scope = "file_metadata"


class SanitizeResumeThrottle(AnonRateThrottle):
    """Caps /api/sanitize-resume/, an open endpoint that regexes caller-sized text."""

    scope = "sanitize_resume"


class FileMetadataView(APIView):
    """
    API View to extract and display file metadata and PII detections.
    """

    parser_classes = (MultiPartParser, FormParser)
    throttle_classes = [FileMetadataThrottle]

    def post(self, request, *args, **kwargs):
        serializer = MetadataExtractionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = serializer.validated_data["file"]
        filename = uploaded_file.name
        filetype = filename.split(".")[-1].lower()

        # Checked before anything is written to disk. It used to run after
        # the upload had already been streamed into a temp file, so an
        # unsupported type still cost a full write.
        if filetype not in SUPPORTED_EXTENSIONS:
            return Response(
                {"error": "Unsupported file type. Use PDF or DOCX."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Bound before the `with`: if writing the upload raises, the `finally`
        # below would otherwise raise NameError on an unbound `temp_path` and
        # bury the real error.
        temp_path = None

        try:
            # The suffix comes from the allowlist above, not straight from
            # the client-supplied filename.
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=f".{filetype}"
            ) as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name

            if filetype == "pdf":
                metadata = extract_pdf_metadata(temp_path)
                # For PII detection, we'd ideally extract text first.
                # Simplified here to return structure.
                pii_detections = []
            else:
                metadata = extract_docx_metadata(temp_path)
                pii_detections = []

            response_data = {
                "filename": filename,
                "filetype": filetype,
                "metadata": metadata,
                "pii_detections": pii_detections,
            }

            response_serializer = MetadataResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)


class SanitizeResumeView(APIView):
    """
    API View to redact PII from provided text.
    """

    throttle_classes = [SanitizeResumeThrottle]

    def post(self, request, *args, **kwargs):
        serializer = PIIRedactionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        text = serializer.validated_data["text"]
        pii_types = serializer.validated_data["pii_types_to_redact"]

        redacted_text = redact_pii_from_text(text, pii_types)

        response_data = {
            "original_text": text,
            "redacted_text": redacted_text,
            "redacted_types": pii_types,
        }

        response_serializer = RedactionResponseSerializer(data=response_data)
        response_serializer.is_valid(raise_exception=True)

        return Response(response_serializer.data, status=status.HTTP_200_OK)
