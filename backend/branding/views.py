"""
Branding Views for API
Handles all branding-related API endpoints.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.core.cache import cache
import uuid

from .models import OrganizationBranding, BRANDING_TEMPLATES
from .serializers import BrandingSerializer, LogoUploadSerializer
from .services import BrandingService

logger = logging.getLogger(__name__)


class BrandingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organization branding.
    """
    
    serializer_class = BrandingSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'organization_id'
    
    def get_queryset(self):
        user = self.request.user
        organization_id = getattr(user, 'organization_id', None)
        if organization_id:
            return OrganizationBranding.objects.filter(organization_id=organization_id)
        return OrganizationBranding.objects.none()
    
    def get_object(self):
        organization_id = self.kwargs.get('organization_id')
        try:
            uuid.UUID(organization_id)
        except ValueError:
            return None
        
        obj = OrganizationBranding.objects.filter(
            organization_id=organization_id
        ).first()
        
        if not obj:
            obj = OrganizationBranding.objects.create(
                organization_id=organization_id,
                brand_name="My Organization"
            )
        
        return obj
    
    def retrieve(self, request, *args, **kwargs):
        try:
            obj = self.get_object()
            if not obj:
                return Response({
                    'success': False,
                    'message': 'Invalid organization ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(obj)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Branding retrieved successfully'
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        try:
            obj = self.get_object()
            if not obj:
                return Response({
                    'success': False,
                    'message': 'Invalid organization ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(obj, data=request.data, partial=True)
            
            if serializer.is_valid():
                branding = serializer.save()
                cache.delete(f'branding_css_{str(branding.organization_id)}')
                
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Branding updated successfully'
                })
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Validation failed'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='(?P<organization_id>[^/.]+)/reset')
    def reset_branding(self, request, organization_id=None):
        try:
            obj = self.get_object()
            if not obj:
                return Response({
                    'success': False,
                    'message': 'Invalid organization ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            obj.brand_name = None
            obj.tagline = None
            obj.primary_color = "#4F46E5"
            obj.secondary_color = "#7C3AED"
            obj.accent_color = "#10B981"
            obj.background_color = "#FFFFFF"
            obj.text_color = "#111827"
            obj.link_color = "#4F46E5"
            obj.primary_font = "Inter"
            obj.secondary_font = "system-ui"
            obj.font_size = "16px"
            obj.logo_url = None
            obj.logo_dark_url = None
            obj.custom_css = None
            obj.custom_js = None
            obj.hide_powered_by = False
            obj.theme_type = "light"
            obj.save()
            
            cache.delete(f'branding_css_{organization_id}')
            
            return Response({
                'success': True,
                'message': 'Branding reset to default',
                'data': BrandingSerializer(obj).data
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='(?P<organization_id>[^/.]+)/template')
    def apply_template(self, request, organization_id=None):
        try:
            template_name = request.data.get('template_name')
            
            if not template_name:
                return Response({
                    'success': False,
                    'message': 'Template name is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if template_name not in BRANDING_TEMPLATES:
                return Response({
                    'success': False,
                    'message': f"Template '{template_name}' not found"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            obj = self.get_object()
            if not obj:
                return Response({
                    'success': False,
                    'message': 'Invalid organization ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            template = BRANDING_TEMPLATES[template_name]
            
            for key, value in template.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            
            obj.save()
            cache.delete(f'branding_css_{organization_id}')
            
            return Response({
                'success': True,
                'message': f"Template '{template_name}' applied successfully",
                'data': BrandingSerializer(obj).data
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='(?P<organization_id>[^/.]+)/logo')
    def upload_logo(self, request, organization_id=None):
        try:
            serializer = LogoUploadSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            obj = self.get_object()
            if not obj:
                return Response({
                    'success': False,
                    'message': 'Invalid organization ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            file = serializer.validated_data['file']
            logo_type = serializer.validated_data.get('logo_type', 'primary')
            
            import base64
            file_data = file.read()
            encoded_data = base64.b64encode(file_data).decode('utf-8')
            mock_url = f"data:{file.content_type};base64,{encoded_data[:100]}..."
            
            logo_fields = {
                'primary': 'logo_url',
                'dark': 'logo_dark_url',
                'favicon': 'favicon_url',
                'email': 'email_logo_url'
            }
            
            field_name = logo_fields.get(logo_type, 'logo_url')
            setattr(obj, field_name, mock_url)
            obj.save()
            
            cache.delete(f'branding_css_{organization_id}')
            
            return Response({
                'success': True,
                'message': f"Logo '{logo_type}' uploaded successfully",
                'data': {
                    'logo_type': logo_type,
                    'url': getattr(obj, field_name)
                }
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='(?P<organization_id>[^/.]+)/css')
    def get_css(self, request, organization_id=None):
        try:
            service = BrandingService()
            obj = self.get_object()
            
            if not obj:
                return HttpResponse('/* Invalid organization */', content_type='text/css')
            
            cache_key = f'branding_css_{organization_id}'
            css = cache.get(cache_key)
            
            if not css:
                css = service.generate_branding_css(obj)
                cache.set(cache_key, css, 3600)
            
            return HttpResponse(css, content_type='text/css')
        except Exception as e:
            return HttpResponse(f'/* Error: {str(e)} */', content_type='text/css')
    
    @action(detail=False, methods=['get'], url_path='templates')
    def get_templates(self, request):
        templates = []
        for key, template in BRANDING_TEMPLATES.items():
            templates.append({
                'id': key,
                'name': template.get('name', key.title()),
                'description': template.get('description', ''),
                'primary_color': template.get('primary_color', '#4F46E5'),
                'secondary_color': template.get('secondary_color', '#7C3AED'),
                'accent_color': template.get('accent_color', '#10B981'),
                'background_color': template.get('background_color', '#FFFFFF'),
                'text_color': template.get('text_color', '#111827'),
                'primary_font': template.get('primary_font', 'Inter')
            })
        
        return Response({
            'success': True,
            'data': templates,
            'count': len(templates)
        })
    
    @action(detail=False, methods=['get'], url_path='(?P<organization_id>[^/.]+)/preview')
    def get_preview(self, request, organization_id=None):
        try:
            obj = self.get_object()
            if not obj:
                return Response({
                    'success': False,
                    'message': 'Invalid organization ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            service = BrandingService()
            result = service.generate_branding_preview(obj)
            
            return Response({
                'success': True,
                'data': result,
                'message': 'Preview generated successfully'
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)