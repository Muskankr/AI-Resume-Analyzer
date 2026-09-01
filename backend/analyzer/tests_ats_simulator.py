from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import ResumeAnalysis
from .ats_simulator import PROFILES, WorkdaySimulator, GreenhouseSimulator, TaleoSimulator, extract_contact_info

User = get_user_model()

class ATSSimulatorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="atstester", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.good_resume = (
            "john.doe@example.com\n555-123-4567\nWork Experience\n"
            "Software Engineer at Tech Corp\nMay 2020 - Jun 2023\n"
            "I developed many cool features and wrote a lot of code. "
            "This resume has a lot of words to pass the minimum word count check. " * 10 +
            "\nJunior Developer at Startup\nJan 2018 - Apr 2020\n"
            "More words here to ensure we have multiple date ranges and enough text. " * 5 +
            "\nEducation\nB.S. in Computer Science\n"
            "Skills: Python, Django, React\n"
        )
        self.bad_resume = "My name is John. I have been a software engineer. My projects are great. \n\nNo actual headings or contacts!"
        
        self.analysis_good = ResumeAnalysis.objects.create(
            user=self.user,
            file_name="good.pdf",
            score=90,
            resume_text=self.good_resume,
            skills_found=[{"skill": "Python"}, {"skill": "Django"}]
        )
        
        self.analysis_bad = ResumeAnalysis.objects.create(
            user=self.user,
            file_name="bad.pdf",
            score=30,
            resume_text=self.bad_resume,
            skills_found=[]
        )

    def test_extract_contact_info(self):
        res = extract_contact_info(self.good_resume)
        self.assertTrue(res["email"])
        self.assertTrue(res["phone"])
        
        res_bad = extract_contact_info(self.bad_resume)
        self.assertFalse(res_bad["email"])
        self.assertFalse(res_bad["phone"])

    def test_workday_simulator(self):
        sim = WorkdaySimulator()
        res_good = sim.simulate(self.good_resume, {})
        self.assertEqual(res_good["compatibility_score"], 100)
        self.assertIn("Work Experience", res_good["detected_sections"])
        
        res_bad = sim.simulate(self.bad_resume, {})
        self.assertTrue(res_bad["compatibility_score"] < 100)
        self.assertTrue(any("failed to detect an explicit 'experience' section" in w.lower() for w in res_bad["warnings"]))

    def test_greenhouse_simulator(self):
        sim = GreenhouseSimulator()
        res_good = sim.simulate(self.good_resume, {"skills_found": [{"skill": "Python"}]})
        self.assertEqual(res_good["compatibility_score"], 100)
        
        res_bad = sim.simulate(self.bad_resume, {"skills_found": []})
        self.assertTrue(res_bad["compatibility_score"] < 100)
        self.assertTrue(any("critical: email address not found" in w.lower() for w in res_bad["warnings"]))

    def test_taleo_simulator(self):
        sim = TaleoSimulator()
        res_good = sim.simulate(self.good_resume, {})
        self.assertEqual(res_good["compatibility_score"], 100)
        
        taleo_bad = self.good_resume + "\n🤔" # weird character
        res_bad = sim.simulate(taleo_bad, {})
        self.assertTrue(any("non-standard/unicode" in w.lower() for w in res_bad["warnings"]))
        
    def test_api_list_profiles(self):
        resp = self.client.get("/api/ats-simulator/profiles/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("profiles", resp.data)
        self.assertEqual(len(resp.data["profiles"]), len(PROFILES))

    def test_api_simulate_all(self):
        resp = self.client.get(f"/api/history/{self.analysis_good.id}/ats-simulate/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("simulations", resp.data)
        self.assertEqual(len(resp.data["simulations"]), len(PROFILES))
        platforms = [s["platform"] for s in resp.data["simulations"]]
        self.assertTrue(any("Workday" in p for p in platforms))
        self.assertTrue(any("Greenhouse" in p for p in platforms))
        self.assertTrue(any("Taleo" in p for p in platforms))

    def test_api_simulate_specific(self):
        resp = self.client.get(f"/api/history/{self.analysis_good.id}/ats-simulate/?platforms=workday,taleo")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["simulations"]), 2)
        platforms = [s["platform"] for s in resp.data["simulations"]]
        self.assertTrue(any("Workday" in p for p in platforms))
        self.assertTrue(any("Taleo" in p for p in platforms))
        self.assertFalse(any("Greenhouse" in p for p in platforms))

    def test_api_simulate_unsupported(self):
        resp = self.client.get(f"/api/history/{self.analysis_good.id}/ats-simulate/?platforms=workday,magicats")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("error", resp.data)
        self.assertIn("magicats", resp.data["error"])

    def test_api_simulate_unauthorized_user(self):
        other_user = User.objects.create_user(username="other", password="password")
        other_analysis = ResumeAnalysis.objects.create(
            user=other_user,
            file_name="other.pdf",
            score=90,
            resume_text="Hello"
        )
        
        # User trying to simulate another user's resume should 404
        resp = self.client.get(f"/api/history/{other_analysis.id}/ats-simulate/")
        self.assertEqual(resp.status_code, 404)
