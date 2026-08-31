from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User

class CareerRoadmapTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test_user', password='test_password')
        self.client.force_authenticate(user=self.user)

    def test_generate_career_roadmap_frontend(self):
        url = reverse('generate_career_roadmap')
        data = {'current_role': 'junior developer', 'target_role': 'Frontend Developer'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['target_role'], 'frontend developer')
        self.assertEqual(len(response.data['roadmap_nodes']), 4)
        self.assertEqual(response.data['roadmap_nodes'][0]['type'], 'foundational')

    def test_generate_career_roadmap_fallback(self):
        url = reverse('generate_career_roadmap')
        data = {'current_role': 'junior developer', 'target_role': 'Blockchain Architect'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['roadmap_nodes']), 4)
        self.assertEqual(response.data['roadmap_nodes'][0]['title'], 'Core Foundations Setup')

    def test_get_course_recommendations(self):
        url = reverse('get_course_recommendations')
        response = self.client.get(url, {'skill': 'React'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['skill'], 'react')
        self.assertEqual(len(response.data['courses']), 3)
        self.assertEqual(response.data['courses'][0]['platform'], 'Coursera')

    def test_unauthenticated_access(self):
        self.client.force_authenticate(user=None)
        url = reverse('generate_career_roadmap')
        data = {'current_role': 'dev', 'target_role': 'manager'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
