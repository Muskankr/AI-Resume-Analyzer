import os
import requests
import urllib.parse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([AllowAny])
def suggest_roles(request):
    """
    Fetch open roles from Adzuna API based on detected skills and career track.
    Expected query params:
      - track: str (e.g. "Software Engineer")
      - skills: str (comma-separated skills, e.g. "Python,Django,React")
      - country: str (default 'us')
    """
    app_id = os.environ.get('ADZUNA_APP_ID')
    app_key = os.environ.get('ADZUNA_APP_KEY')
    
    track = request.GET.get('track', '')
    skills = request.GET.get('skills', '')
    country = request.GET.get('country', 'us')
    
    if not track and not skills:
        return Response({"error": "Please provide 'track' or 'skills' query parameters."}, status=status.HTTP_400_BAD_REQUEST)

    # Use Adzuna API if keys are present, else fallback to mock for development/review
    if app_id and app_key:
        query_parts = []
        if track:
            query_parts.append(track)
        if skills:
            query_parts.extend(skills.split(','))
            
        what_query = " ".join(query_parts)
        
        encoded_what = urllib.parse.quote(what_query)
        url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1?app_id={app_id}&app_key={app_key}&results_per_page=5&what={encoded_what}"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            jobs = []
            for item in data.get('results', []):
                jobs.append({
                    'title': item.get('title'),
                    'company': item.get('company', {}).get('display_name'),
                    'location': item.get('location', {}).get('display_name'),
                    'url': item.get('redirect_url'),
                    'description': item.get('description'),
                    'source': 'Adzuna'
                })
            
            return Response({
                "source": "Adzuna",
                "attribution": "Job listings provided by Adzuna",
                "jobs": jobs
            })
        except requests.RequestException as e:
            return Response({"error": f"Failed to fetch jobs: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
    else:
        # Mock data fallback when API keys are not provided
        mock_jobs = [
            {
                'title': f'Senior {track or "Developer"}',
                'company': 'Tech Innovations Inc.',
                'location': 'Remote',
                'url': '#',
                'description': f'Looking for an experienced professional with skills in {skills}.',
                'source': 'Adzuna (Mock)'
            },
            {
                'title': f'{track or "Engineer"} Role',
                'company': 'Future Solutions',
                'location': 'New York, NY',
                'url': '#',
                'description': f'Join our dynamic team. Requirements: {skills}.',
                'source': 'Adzuna (Mock)'
            }
        ]
        return Response({
            "source": "Adzuna (Mocked)",
            "attribution": "Job listings provided by Adzuna API (Mock Mode: Keys not configured)",
            "jobs": mock_jobs
        })
