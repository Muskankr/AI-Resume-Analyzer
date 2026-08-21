from django.test import TestCase, Client


class CacheControlHeadersTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_api_responses_have_no_cache_headers(self):
        """API endpoints must return no-cache, no-store Cache-Control headers."""
        response = self.client.get('/api/skills-leaderboard/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Cache-Control', response)
        self.assertIn('no-cache', response['Cache-Control'])
        self.assertIn('no-store', response['Cache-Control'])

    def test_health_check_api_cache_headers(self):
        """Health check or schema endpoint should be excluded from aggressive caching."""
        response = self.client.get('/api/schema/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Cache-Control', response)
        self.assertIn('no-cache', response['Cache-Control'])
