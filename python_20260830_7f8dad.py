"""
Website generation views for API endpoints
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import HttpResponse, FileResponse
from django.core.exceptions import ObjectDoesNotExist
import iofrom .models import Resume
from .website_generator import WebsiteGenerator
from .website_generator.serializers import (
    WebsiteGenerationSerializer,
    WebsiteCustomizationSerializer,
    WebsiteExportSerializer
)
from .website_generator.utils import WebsiteUtils

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_website(request):
    """
    Generate a personal website from resume data
    
    POST /api/website/generate/
    """
    try:
        # Get resume data
        resume_id = request.data.get('resume_id')
        resume_data = request.data.get('resume_data')
        
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id, user=request.user)
                resume_data = {
                    'name': resume.name,
                    'title': resume.title or 'Professional',
                    'summary': resume.summary or '',
                    'skills_found': resume.skills_found or [],
                    'experience': resume.experience or [],
                    'education': resume.education or [],
                    'projects': resume.projects or [],
                    'certifications': resume.certifications or [],
                    'email': resume.email or '',
                    'phone': resume.phone or '',
                    'location': resume.location or '',
                    'linkedin': resume.linkedin or '',
                    'github': resume.github or '',
                    'website': resume.website or '',
                    'text': resume.text or ''
                }
            except ObjectDoesNotExist:
                return Response(
                    {'error': 'Resume not found or access denied'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Validate request data
        serializer = WebsiteGenerationSerializer(data={
            'resume_data': resume_data,
            'template': request.data.get('template', 'minimal'),
            'color_scheme': request.data.get('color_scheme', 'light'),
            'customizations': request.data.get('customizations', {})
        })
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate website
        generator = WebsiteGenerator()
        result = generator.generate_website(
            resume_data=resume_data,
            template=request.data.get('template', 'minimal'),
            color_scheme=request.data.get('color_scheme', 'light'),
            customizations=request.data.get('customizations', {})
        )
        
        if result.get('success'):
            # Save generation record (optional)
            # Could add a WebsiteGeneration model here
            
            # Remove large bundle from response for preview
            response_data = {
                'success': True,
                'website_data': result.get('website_data'),
                'metadata': result.get('metadata'),
                'deploy_config': result.get('deploy_config'),
                'preview_url': request.build_absolute_uri('/api/website/preview/')
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result.get('error', 'Website generation failed')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    except Exception as e:
        logger.error(f"Website generation error: {str(e)}")
        return Response(
            {'error': f'An unexpected error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_website(request):
    """
    Get HTML preview of generated website
    
    POST /api/website/preview/
    """
    try:
        # Similar logic to generate_website but returns preview HTML
        resume_id = request.data.get('resume_id')
        resume_data = request.data.get('resume_data')
        
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id, user=request.user)
                resume_data = {
                    'name': resume.name,
                    'title': resume.title or 'Professional',
                    'summary': resume.summary or '',
                    'skills_found': resume.skills_found or [],
                    'experience': resume.experience or [],
                    'education': resume.education or [],
                    'projects': resume.projects or [],
                    'certifications': resume.certifications or [],
                    'email': resume.email or '',
                    'phone': resume.phone or '',
                    'location': resume.location or '',
                    'linkedin': resume.linkedin or '',
                    'github': resume.github or '',
                    'website': resume.website or '',
                    'text': resume.text or ''
                }
            except ObjectDoesNotExist:
                return Response(
                    {'error': 'Resume not found or access denied'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Generate preview
        generator = WebsiteGenerator()
        preview_html = generator.preview_website(
            resume_data=resume_data,
            template=request.data.get('template', 'minimal'),
            color_scheme=request.data.get('color_scheme', 'light')
        )
        
        return Response({
            'preview_html': preview_html,
            'metadata': {
                'template': request.data.get('template', 'minimal'),
                'color_scheme': request.data.get('color_scheme', 'light')
            }
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Website preview error: {str(e)}")
        return Response(
            {'error': f'Failed to generate preview: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def download_website(request):
    """
    Download generated website as ZIP
    
    POST /api/website/download/
    """
    try:
        resume_id = request.data.get('resume_id')
        resume_data = request.data.get('resume_data')
        
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id, user=request.user)
                resume_data = {
                    'name': resume.name,
                    'title': resume.title or 'Professional',
                    'summary': resume.summary or '',
                    'skills_found': resume.skills_found or [],
                    'experience': resume.experience or [],
                    'education': resume.education or [],
                    'projects': resume.projects or [],
                    'certifications': resume.certifications or [],
                    'email': resume.email or '',
                    'phone': resume.phone or '',
                    'location': resume.location or '',
                    'linkedin': resume.linkedin or '',
                    'github': resume.github or '',
                    'website': resume.website or '',
                    'text': resume.text or ''
                }
            except ObjectDoesNotExist:
                return Response(
                    {'error': 'Resume not found or access denied'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Generate website bundle
        generator = WebsiteGenerator()
        result = generator.generate_website(
            resume_data=resume_data,
            template=request.data.get('template', 'minimal'),
            color_scheme=request.data.get('color_scheme', 'light'),
            customizations=request.data.get('customizations', {})
        )
        
        if not result.get('success'):
            return Response(
                {'error': result.get('error', 'Failed to generate website')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        bundle = result.get('bundle', {})
        
        # Create ZIP file
        zip_data = WebsiteUtils.create_zip_bundle(bundle)
        
        # Create response
        response = HttpResponse(
            zip_data,
            content_type='application/zip'
        )
        response['Content-Disposition'] = f'attachment; filename="{result["website_data"]["name"].lower().replace(" ", "-")}-portfolio.zip"'
        response['Content-Length'] = len(zip_data)
        
        return response
    
    except Exception as e:
        logger.error(f"Website download error: {str(e)}")
        return Response(
            {'error': f'Failed to download website: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_templates(request):
    """
    Get available templates and color schemes
    
    GET /api/website/templates/
    """
    try:
        generator = WebsiteGenerator()
        
        return Response({
            'templates': generator.get_available_templates(),
            'color_schemes': generator.get_available_color_schemes()
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Get templates error: {str(e)}")
        return Response(
            {'error': f'Failed to get templates: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deploy_website(request):
    """
    Deploy generated website to hosting platform
    
    POST /api/website/deploy/
    """
    try:
        # This would integrate with Vercel/Netlify APIs
        # For now, return deployment instructions
        
        resume_id = request.data.get('resume_id')
        resume_data = request.data.get('resume_data')
        platform = request.data.get('platform', 'vercel')
        
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id, user=request.user)
                resume_data = {
                    'name': resume.name,
                    'title': resume.title or 'Professional',
                    'summary': resume.summary or '',
                    'skills_found': resume.skills_found or [],
                    'experience': resume.experience or [],
                    'education': resume.education or [],
                    'projects': resume.projects or [],
                    'certifications': resume.certifications or [],
                    'email': resume.email or '',
                    'phone': resume.phone or '',
                    'location': resume.location or '',
                    'linkedin': resume.linkedin or '',
                    'github': resume.github or '',
                    'website': resume.website or '',
                    'text': resume.text or ''
                }
            except ObjectDoesNotExist:
                return Response(
                    {'error': 'Resume not found or access denied'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Generate website
        generator = WebsiteGenerator()
        result = generator.generate_website(
            resume_data=resume_data,
            template=request.data.get('template', 'minimal'),
            color_scheme=request.data.get('color_scheme', 'light'),
            customizations=request.data.get('customizations', {})
        )
        
        if not result.get('success'):
            return Response(
                {'error': result.get('error', 'Failed to generate website')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # In production, this would deploy to Vercel/Netlify
        # For now, return deployment instructions
        deploy_config = result.get('deploy_config', {})
        
        return Response({
            'success': True,
            'message': f'Ready to deploy to {platform}',
            'deploy_instructions': {
                'platform': platform,
                'steps': [
                    'Download the website ZIP file',
                    f'Sign up for {platform} if you haven\'t already',
                    f'Go to {platform} dashboard and create a new project',
                    'Upload the ZIP file or connect your repository',
                    f'Follow {platform}\'s deployment instructions'
                ],
                'config': deploy_config.get(platform, {})
            }
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Website deployment error: {str(e)}")
        return Response(
            {'error': f'Failed to deploy website: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )