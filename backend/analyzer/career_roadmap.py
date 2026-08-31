import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

CAREER_PATHS = {
    "frontend developer": [
        {"id": "node-1", "title": "Master HTML, CSS & JS Basics", "type": "foundational", "duration": "1-2 Months", "desc": "Understand the DOM, semantic HTML, responsive CSS layouts, and ES6+ features."},
        {"id": "node-2", "title": "React Core & State Management", "type": "core", "duration": "2-3 Months", "desc": "Learn React hooks, component lifecycle, Context API, and Redux or Zustand."},
        {"id": "node-3", "title": "Advanced Frameworks & SSR", "type": "advanced", "duration": "2 Months", "desc": "Dive into Next.js, server-side rendering, hybrid static generation, and routing mechanisms."},
        {"id": "node-4", "title": "Performance Optimization", "type": "expert", "duration": "Ongoing", "desc": "Lazy loading, code splitting, Web Vitals monitoring, and accessibility auditing (a11y)."}
    ],
    "backend developer": [
        {"id": "node-1", "title": "Language Deep Dive & Web Servers", "type": "foundational", "duration": "1 Month", "desc": "Master Node.js, Python, or Go. Understand HTTP protocols, RESTful logic, and middleware routing."},
        {"id": "node-2", "title": "Database Design & ORMs", "type": "core", "duration": "2 Months", "desc": "Learn SQL (PostgreSQL, MySQL) and NoSQL (MongoDB), database indexing, Normalization, and ORMs."},
        {"id": "node-3", "title": "Caching & Message Queues", "type": "advanced", "duration": "2 Months", "desc": "Implement Redis for caching, RabbitMQ/Kafka for asynchronous job processing, and websockets."},
        {"id": "node-4", "title": "Microservices & System Design", "type": "expert", "duration": "Ongoing", "desc": "Containerization (Docker), orchestration (Kubernetes), load balancing, and distributed tracing."}
    ],
    "fullstack developer": [
        {"id": "node-1", "title": "Frontend Fluency", "type": "foundational", "duration": "3 Months", "desc": "Achieve high proficiency in React/Vue and modern CSS frameworks like Tailwind."},
        {"id": "node-2", "title": "Backend API Construction", "type": "core", "duration": "3 Months", "desc": "Build scalable APIs using Express, Django, or FastAPI linked to relational databases."},
        {"id": "node-3", "title": "Cloud Infrastructures & CI/CD", "type": "advanced", "duration": "2 Months", "desc": "Deploy to AWS/GCP, configure automated GitHub Actions pipelines, and manage serverless architectures."},
        {"id": "node-4", "title": "System Architecture Mastery", "type": "expert", "duration": "Ongoing", "desc": "End-to-end security modeling, enterprise state management, high-volume telemetry processing."}
    ],
    "data scientist": [
        {"id": "node-1", "title": "Python & Data Wrangling", "type": "foundational", "duration": "2 Months", "desc": "Pandas, NumPy, EDA techniques, data cleaning, and feature engineering pipelines."},
        {"id": "node-2", "title": "Statistical Models & ML", "type": "core", "duration": "3 Months", "desc": "Scikit-Learn, regression clustering classifications, bias-variance tradeoff optimization."},
        {"id": "node-3", "title": "Deep Learning Frameworks", "type": "advanced", "duration": "3 Months", "desc": "PyTorch or TensorFlow. Build Neural Networks, CNNs, LSTMs, and apply transfer learning."},
        {"id": "node-4", "title": "MLOps & Model Deployment", "type": "expert", "duration": "Ongoing", "desc": "Deploy machine inference endpoints, model drift monitoring, MLflow, and scalable serving infrastructure."}
    ]
}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_career_roadmap(request):
    """
    Generate an interconnected career roadmap given current and target roles.
    Includes milestone nodes mapped chronically.
    """
    current_role = request.data.get('current_role', '').lower().strip()
    target_role = request.data.get('target_role', '').lower().strip()
    
    # Generic fallback
    fallback_path = [
        {"id": "node-1", "title": "Core Foundations Setup", "type": "foundational", "duration": "Phase 1", "desc": f"Master the prerequisites and foundational layers required to transition from {current_role or 'your role'} to {target_role or 'your target role'}."},
        {"id": "node-2", "title": "Specialized Tooling", "type": "core", "duration": "Phase 2", "desc": "Engage with enterprise-grade toolkits specific to industry standards."},
        {"id": "node-3", "title": "Advanced Concept Application", "type": "advanced", "duration": "Phase 3", "desc": "Applying architectural logic mapping, high efficiency workflows, and optimization."},
        {"id": "node-4", "title": "Mastery & Edge Cases", "type": "expert", "duration": "Phase 4", "desc": "Resolving complex architectural bottlenecks, contributing to systemic enhancements."}
    ]

    selected_path = None
    for role, path in CAREER_PATHS.items():
        if role in target_role:
            selected_path = path
            break
            
    if not selected_path:
        selected_path = fallback_path
        
    return Response({
        "success": True,
        "current_role": current_role,
        "target_role": target_role,
        "roadmap_nodes": selected_path,
        "projected_duration": sum([1 for p in selected_path]) * 2, # Rough estimation in months
        "metadata": {
            "source": "AI Generation Engine",
            "version": "1.0"
        }
    }, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_course_recommendations(request):
    """
    Provides curated course learning targets based on query params.
    """
    skill = request.query_params.get('skill', '').lower()
    
    courses = [
        {"id": "c1", "title": f"Mastering {skill.title() if skill else 'Software'} Concepts", "platform": "Coursera", "difficulty": "Intermediate", "rating": 4.8},
        {"id": "c2", "title": f"{skill.title() if skill else 'Advanced'} - Top 50 Interview Questions", "platform": "Udemy", "difficulty": "Advanced", "rating": 4.6},
        {"id": "c3", "title": f"Bootcamp 2026: {skill.title() if skill else 'Fullstack'} Edition", "platform": "edX", "difficulty": "Beginner", "rating": 4.9}
    ]
    
    return Response({
        "success": True,
        "skill": skill,
        "courses": courses
    }, status=200)
