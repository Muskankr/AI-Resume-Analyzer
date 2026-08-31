from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

class JobBoardIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('suggest_roles')

    def test_suggest_roles_missing_params(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('analyzer.job_board_views.requests.get')
    def test_suggest_roles_with_mocked_adzuna(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "results": [
                {
                    "title": "Software Engineer",
                    "company": {"display_name": "Test Co"},
                    "location": {"display_name": "London"},
                    "redirect_url": "http://test.com",
                    "description": "Test job"
                }
            ]
        }
        
        with patch('os.environ.get') as mock_env:
            def side_effect(key, default=None):
                if key == 'ADZUNA_APP_ID': return 'test_id'
                if key == 'ADZUNA_APP_KEY': return 'test_key'
                return default
            mock_env.side_effect = side_effect
            
            response = self.client.get(self.url, {'track': 'Software Engineer', 'skills': 'Python'})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['source'], 'Adzuna')
            self.assertEqual(len(response.data['jobs']), 1)
            self.assertEqual(response.data['jobs'][0]['title'], 'Software Engineer')

    def test_suggest_roles_fallback_mock(self):
        with patch('os.environ.get', return_value=None):
            response = self.client.get(self.url, {'track': 'Software Engineer'})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['source'], 'Adzuna (Mocked)')
            self.assertTrue(len(response.data['jobs']) > 0)
