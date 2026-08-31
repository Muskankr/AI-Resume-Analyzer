import logging
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from analyzer.models import SignupAbuseEvent

User = get_user_model()

class SignupAbuseDetectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        
    def tearDown(self):
        cache.clear()

    @override_settings(SIGNUP_ABUSE_THRESHOLD=5, SIGNUP_ABUSE_WINDOW_MINUTES=1)
    def test_normal_signup_below_threshold(self):
        for i in range(3):
            resp = self.client.post(
                "/api/auth/signup/", 
                {"username": f"user{i}", "password": "V3ryStr0ngP@ssw0rd!", "captcha_token": "PASSED_CAPTCHA_TOKEN_FOR_TESTING"},
                REMOTE_ADDR="192.168.1.1",
                HTTP_USER_AGENT="Mozilla/5.0"
            )
            if resp.status_code != 201:
                print(resp.data)
            self.assertEqual(resp.status_code, 201)
        
        self.assertEqual(SignupAbuseEvent.objects.count(), 0)

    @override_settings(SIGNUP_ABUSE_THRESHOLD=3, SIGNUP_ABUSE_WINDOW_MINUTES=1)
    def test_abuse_detection_exceeds_threshold(self):
        for i in range(3):
            resp = self.client.post(
                "/api/auth/signup/", 
                {"username": f"user{i}", "password": "V3ryStr0ngP@ssw0rd!", "captcha_token": "PASSED_CAPTCHA_TOKEN_FOR_TESTING"},
                REMOTE_ADDR="10.0.0.1",
                HTTP_USER_AGENT="DumbBot/1.0"
            )
            self.assertEqual(resp.status_code, 201)
            
        # 4th attempt should be blocked
        resp = self.client.post(
            "/api/auth/signup/", 
            {"username": "user4", "password": "V3ryStr0ngP@ssw0rd!", "captcha_token": "PASSED_CAPTCHA_TOKEN_FOR_TESTING"},
            REMOTE_ADDR="10.0.0.1",
            HTTP_USER_AGENT="DumbBot/1.0"
        )
        self.assertEqual(resp.status_code, 429)
        self.assertIn("Too many signup attempts from this IP", resp.data["detail"])
        
        # Check event was created
        events = SignupAbuseEvent.objects.filter(ip_address="10.0.0.1")
        self.assertEqual(events.count(), 1)
        self.assertEqual(events.first().status, "flagged")

    @override_settings(SIGNUP_ABUSE_THRESHOLD=3, SIGNUP_ABUSE_WINDOW_MINUTES=1)
    def test_shared_network_high_entropy(self):
        # If we have 4 distinct user agents for 4 signups, it's 100% entropy
        # Threshold is 3.
        for i in range(4):
            resp = self.client.post(
                "/api/auth/signup/", 
                {"username": f"uni_user{i}", "password": "V3ryStr0ngP@ssw0rd!", "captcha_token": "PASSED_CAPTCHA_TOKEN_FOR_TESTING"},
                REMOTE_ADDR="172.16.0.1",
                HTTP_USER_AGENT=f"Browser{i}/1.0"
            )
            # The 4th attempt exceeds threshold but is allowed due to entropy
            self.assertEqual(resp.status_code, 201)
            
        # Check event was created but status is 'reviewed'
        events = SignupAbuseEvent.objects.filter(ip_address="172.16.0.1")
        self.assertEqual(events.count(), 1)
        self.assertEqual(events.first().status, "reviewed")
        self.assertIn("allowed due to high user-agent entropy", events.first().notes.lower())

    @override_settings(SIGNUP_ABUSE_ENABLED=False, SIGNUP_ABUSE_THRESHOLD=2)
    def test_abuse_detection_disabled(self):
        for i in range(5):
            resp = self.client.post(
                "/api/auth/signup/", 
                {"username": f"testuser{i}", "password": "V3ryStr0ngP@ssw0rd!", "captcha_token": "PASSED_CAPTCHA_TOKEN_FOR_TESTING"},
                REMOTE_ADDR="192.168.1.100",
                HTTP_USER_AGENT="Bot/1.0"
            )
            self.assertEqual(resp.status_code, 201)
            
        self.assertEqual(SignupAbuseEvent.objects.count(), 0)

    @override_settings(SIGNUP_ABUSE_THRESHOLD=2, SIGNUP_ABUSE_WINDOW_MINUTES=1)
    def test_malformed_missing_ip(self):
        # The test client normally sets REMOTE_ADDR to 127.0.0.1 by default if missing,
        # but we can try to pass empty.
        resp = self.client.post(
            "/api/auth/signup/", 
            {"username": "no_ip", "password": "V3ryStr0ngP@ssw0rd!", "captcha_token": "PASSED_CAPTCHA_TOKEN_FOR_TESTING"},
            REMOTE_ADDR="",
            HTTP_X_FORWARDED_FOR=""
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(SignupAbuseEvent.objects.count(), 0)

    @override_settings(SIGNUP_ABUSE_THRESHOLD=2, SIGNUP_ABUSE_WINDOW_MINUTES=1)
    def test_ipv6_handling(self):
        for i in range(3):
            resp = self.client.post(
                "/api/auth/signup/", 
                {"username": f"ipv6_user{i}", "password": "V3ryStr0ngP@ssw0rd!", "captcha_token": "PASSED_CAPTCHA_TOKEN_FOR_TESTING"},
                REMOTE_ADDR="2001:0db8:85a3:0000:0000:8a2e:0370:7334",
                HTTP_USER_AGENT="DumbBot/1.0"
            )
            if i < 2:
                self.assertEqual(resp.status_code, 201)
            else:
                self.assertEqual(resp.status_code, 429)
                
        self.assertEqual(SignupAbuseEvent.objects.filter(ip_address="2001:0db8:85a3:0000:0000:8a2e:0370:7334").count(), 1)
