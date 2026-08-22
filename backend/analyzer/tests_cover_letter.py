from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User
from .cover_letter import generate_cover_letter
import json

class CoverLetterGeneratorTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testapplicant',
            email='test@example.com',
            password='testpassword123'
        )
        self.valid_resume = "Highly skilled software engineer with 5 years of experience in Python, Django, React, and AWS."
        self.valid_jd = "Looking for a backend developer proficient in Python, SQL, Docker, and AWS."

    def test_missing_resume_text(self):
        """Test rejection when resume text is absent."""
        request = self.factory.post(
            '/api/cover-letter/generate/',
            json.dumps({"job_description": self.valid_jd}),
            content_type='application/json'
        )
        request.user = self.user
        
        response = generate_cover_letter(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)

    def test_missing_jd_text(self):
        """Test rejection when job description is absent."""
        request = self.factory.post(
            '/api/cover-letter/generate/',
            json.dumps({"resume_text": self.valid_resume}),
            content_type='application/json'
        )
        request.user = self.user
        
        response = generate_cover_letter(request)
        self.assertEqual(response.status_code, 400)

    def test_successful_default_generation(self):
        """Test successful generation using default professional tone."""
        request = self.factory.post(
            '/api/cover-letter/generate/',
            json.dumps({
                "resume_text": self.valid_resume,
                "job_description": self.valid_jd
            }),
            content_type='application/json'
        )
        request.user = self.user
        
        response = generate_cover_letter(request)
        self.assertEqual(response.status_code, 200)
        
        data = response.data
        self.assertIn('cover_letter', data)
        self.assertEqual(data['tone_used'], 'professional')
        # Expecting intersection of 'python' and 'aws'
        self.assertTrue('Python' in data['keywords_integrated'] or 'Aws' in data['keywords_integrated'])

    def test_generation_creative_tone(self):
        """Test successful generation using creative tone."""
        request = self.factory.post(
            '/api/cover-letter/generate/',
            json.dumps({
                "resume_text": self.valid_resume,
                "job_description": self.valid_jd,
                "tone": "creative"
            }),
            content_type='application/json'
        )
        request.user = self.user
        
        response = generate_cover_letter(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['tone_used'], 'creative')
        self.assertIn('Design & Engineering Team', response.data['cover_letter'])

    def test_generation_direct_tone(self):
        """Test successful generation using direct tone."""
        request = self.factory.post(
            '/api/cover-letter/generate/',
            json.dumps({
                "resume_text": self.valid_resume,
                "job_description": self.valid_jd,
                "tone": "direct"
            }),
            content_type='application/json'
        )
        request.user = self.user
        
        response = generate_cover_letter(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['tone_used'], 'direct')
        self.assertIn('impactful products on tight deadlines', response.data['cover_letter'])

    def test_no_intersection_fallback(self):
        """Test behavior when there are no intersecting keywords."""
        unrelated_resume = "Expert in carpentry, woodwork, and interior design."
        request = self.factory.post(
            '/api/cover-letter/generate/',
            json.dumps({
                "resume_text": unrelated_resume,
                "job_description": self.valid_jd
            }),
            content_type='application/json'
        )
        request.user = self.user
        
        response = generate_cover_letter(request)
        self.assertEqual(response.status_code, 200)
        # Should fallback to empty list or defaults, basically avoiding index errors
        self.assertIsInstance(response.data['keywords_integrated'], list)
