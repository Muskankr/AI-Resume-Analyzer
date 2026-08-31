"""
API endpoint to trigger and retrieve the layout analysis report for a given resume.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .layout_serializers import LayoutAnalysisResponseSerializer
from .layout_analyzer import LayoutAnalyzer
import tempfile
import os


class LayoutAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request={
            "multipart/form-data": {"file": {"type": "string", "format": "binary"}}
        },
        responses={
            200: OpenApiResponse(
                response=LayoutAnalysisResponseSerializer,
                description="Successful layout analysis",
            ),
            400: OpenApiResponse(description="Invalid file or missing file"),
        },
        summary="Analyze resume layout and formatting",
    )
    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not file_obj.name.lower().endswith(".pdf"):
            return Response(
                {"error": "Only PDF files are supported for layout analysis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            for chunk in file_obj.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        try:
            result = LayoutAnalyzer.analyze_pdf(tmp_path)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
