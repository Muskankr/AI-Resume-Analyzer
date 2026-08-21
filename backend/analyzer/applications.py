from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import JobApplication

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_job_applications(request):
    """
    Retrieve all job applications for the current user.
    """
    apps = JobApplication.objects.filter(user=request.user)
    
    results = []
    for app in apps:
        results.append({
            "id": app.id,
            "company": app.company,
            "role_title": app.role_title,
            "status": app.status,
            "notes": app.notes,
            "resume_analysis_id": app.resume_analysis.id if app.resume_analysis else None,
            "cover_letter_id": app.cover_letter.id if app.cover_letter else None,
            "created_at": app.created_at,
            "updated_at": app.updated_at
        })
        
    return Response({"applications": results})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_job_application(request):
    """
    Create a new job application.
    """
    data = request.data
    
    app = JobApplication.objects.create(
        user=request.user,
        company=data.get('company'),
        role_title=data.get('role_title'),
        status=data.get('status', 'WISHLIST'),
        notes=data.get('notes', ''),
        # Omitting complex FK mapping for brevity, assume simple strings
    )
    
    return Response({
        "id": app.id,
        "company": app.company,
        "role_title": app.role_title,
        "status": app.status,
    }, status=201)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_job_application(request, app_id):
    """
    Update a job application's status or details.
    """
    try:
        app = JobApplication.objects.get(id=app_id, user=request.user)
    except JobApplication.DoesNotExist:
        return Response({"error": "Application not found"}, status=404)
        
    data = request.data
    if 'status' in data:
        app.status = data['status']
    if 'company' in data:
        app.company = data['company']
    if 'role_title' in data:
        app.role_title = data['role_title']
    if 'notes' in data:
        app.notes = data['notes']
        
    app.save()
    
    return Response({
        "id": app.id,
        "company": app.company,
        "role_title": app.role_title,
        "status": app.status,
        "notes": app.notes
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_job_application(request, app_id):
    try:
        app = JobApplication.objects.get(id=app_id, user=request.user)
        app.delete()
        return Response({"success": "True"})
    except JobApplication.DoesNotExist:
        return Response({"error": "Application not found"}, status=404)
