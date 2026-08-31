# Add to existing urls.py
from django.urls import path, include

urlpatterns = [
    # ... existing routes ...
    path('api/compare-job-offers/', include('analyzer.comparer.urls')),
]