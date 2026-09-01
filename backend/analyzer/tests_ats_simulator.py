from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import ResumeAnalysis
from .ats_simulator import (
    PROFILES,
    WorkdaySimulator,
    GreenhouseSimulator,
    TaleoSimulator,
    extract_contact_info,
    analyze_ats_compatibility,
    _estimate_pass_rate,
    _grade,
)

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


# A deliberately ATS-friendly resume: standard headings on their own lines,
# full contact block, consistent month-year dates, a real degree, a long
# skills list, quantified bullets, ~500 words, plain ASCII.
STRONG_RESUME = """Jordan Lee
jordan.lee@example.com  (555) 123-4567  linkedin.com/in/jordanlee  Austin, TX

Summary
Backend engineer with six years building payment and data platforms. Focused
on reliability, cost control, and mentoring other engineers.

Work Experience
Senior Software Engineer, PayGrid
Mar 2021 - Present
- Led the migration of the billing service to an event-driven design, which
  reduced p95 latency by 40 percent and cut infrastructure spend by 30000
  dollars per year.
- Built an ingestion pipeline that processes 2000000 events per day with
  automated back-pressure and replay.
- Mentored 4 engineers, introduced a code review checklist, and shipped 18
  production releases without a rollback.
- Designed and documented 25 REST endpoints now used by every internal team.

Software Engineer, DataForge
Jun 2018 - Feb 2021
- Developed and optimized reporting APIs, improving dashboard load time from
  9 seconds to under 2 seconds for 15000 daily users.
- Automated the release process with containerized builds, reducing deployment
  time from 3 hours to 20 minutes.
- Implemented structured logging and alerting that reduced mean time to
  detection by 55 percent.
- Migrated 120 database tables to a partitioned schema with zero downtime.

Education
B.S. in Computer Science, University of Texas at Austin, 2018
Relevant coursework: distributed systems, databases, algorithms.

Skills
Python, Django, Flask, PostgreSQL, Redis, Kafka, RabbitMQ, Docker, Kubernetes,
Amazon Web Services, Terraform, REST, GraphQL, Continuous Integration,
Continuous Delivery, Grafana, Prometheus, Git, Linux, pytest
"""

WEAK_RESUME = (
    "SEEKING AN OPPORTUNITY WHERE I CAN GROW AND CONTRIBUTE MY BEST WORK. "
    "I AM A HARD WORKING TEAM PLAYER WITH A PASSION FOR EXCELLENCE. "
) * 6


class ATSCompatibilityCheckerTests(TestCase):
    """The ten-point vendor-neutral checker (analyze_ats_compatibility)."""

    def setUp(self):
        self.report = analyze_ats_compatibility(STRONG_RESUME)

    def test_report_shape(self):
        r = self.report
        self.assertEqual(len(r["criteria"]), 10)
        for key in (
            "overall_score", "grade", "rating",
            "estimated_ats_pass_rate", "word_count", "summary",
            "criteria", "prioritized_fixes",
        ):
            self.assertIn(key, r)
        self.assertEqual(
            r["overall_score"], sum(c["earned"] for c in r["criteria"])
        )
        self.assertEqual(
            r["summary"],
            {
                "passed": sum(c["status"] == "pass" for c in r["criteria"]),
                "warnings": sum(c["status"] == "warn" for c in r["criteria"]),
                "failed": sum(c["status"] == "fail" for c in r["criteria"]),
            },
        )

    def test_every_criterion_is_bounded_and_explained(self):
        for c in self.report["criteria"]:
            self.assertLessEqual(c["earned"], c["max"])
            self.assertGreaterEqual(c["earned"], 0)
            self.assertEqual(c["max"], 10)
            self.assertTrue(c["why_it_matters"])
            self.assertTrue(c["evidence"], f"{c['id']} produced no evidence")
            self.assertIn(c["status"], {"pass", "warn", "fail"})

    def test_strong_resume_scores_well(self):
        r = self.report
        self.assertGreaterEqual(r["overall_score"], 85)
        self.assertIn(r["grade"], {"A", "B"})
        self.assertGreaterEqual(r["estimated_ats_pass_rate"], 70)
        by_id = {c["id"]: c for c in r["criteria"]}
        for cid in ("section_headers", "contact_info", "education", "skills"):
            self.assertEqual(by_id[cid]["status"], "pass", cid)

    def test_weak_resume_fails_with_capped_pass_rate(self):
        r = analyze_ats_compatibility(WEAK_RESUME)
        self.assertLess(r["overall_score"], 45)
        self.assertEqual(r["grade"], "F")
        # No email + no Experience heading -> both caps apply.
        self.assertLessEqual(r["estimated_ats_pass_rate"], 35)
        self.assertTrue(r["prioritized_fixes"])

    def test_empty_resume_is_unparseable(self):
        r = analyze_ats_compatibility("")
        self.assertEqual(r["estimated_ats_pass_rate"], 0)
        self.assertEqual(r["grade"], "F")
        purity = next(c for c in r["criteria"] if c["id"] == "text_purity")
        self.assertEqual(purity["earned"], 0)
        self.assertEqual(purity["status"], "fail")

    def test_prioritized_fixes_are_sorted_by_impact(self):
        r = analyze_ats_compatibility(WEAK_RESUME)
        fixes = r["prioritized_fixes"]
        highs = [f for f in fixes if f["severity"] == "high"]
        # every 'high' fix comes before every non-'high' one
        self.assertEqual(fixes[: len(highs)], highs)
        # within the same severity, points are non-increasing
        pts = [f["points"] for f in highs]
        self.assertEqual(pts, sorted(pts, reverse=True))

    def test_job_description_drives_keyword_score(self):
        jd = (
            "We need a backend engineer strong in Rust, gRPC, ClickHouse and "
            "Elasticsearch running on Google Cloud with Bazel builds."
        )
        without = analyze_ats_compatibility(STRONG_RESUME)
        with_jd = analyze_ats_compatibility(STRONG_RESUME, job_description=jd)
        kw_without = next(c for c in without["criteria"] if c["id"] == "keywords")
        kw_with = next(c for c in with_jd["criteria"] if c["id"] == "keywords")
        # The resume never mentions those tools, so a JD full of them should
        # pull the keyword score down relative to the generic heuristic.
        self.assertLess(kw_with["earned"], kw_without["earned"])
        self.assertTrue(
            any("Missing:" in e for e in kw_with["evidence"])
        )

    def test_table_flag_penalises_layout(self):
        clean = analyze_ats_compatibility(STRONG_RESUME)
        flagged = analyze_ats_compatibility(STRONG_RESUME, has_tables=True)
        clean_tbl = next(c for c in clean["criteria"] if c["id"] == "tables_columns")
        flagged_tbl = next(c for c in flagged["criteria"] if c["id"] == "tables_columns")
        self.assertEqual(clean_tbl["status"], "pass")
        self.assertEqual(flagged_tbl["status"], "fail")

    def test_pass_rate_curve_is_monotonic(self):
        rates = [_estimate_pass_rate(s) for s in range(0, 101, 10)]
        self.assertEqual(rates, sorted(rates))
        self.assertEqual(_estimate_pass_rate(0), 3)
        self.assertGreaterEqual(_estimate_pass_rate(100), 95)

    def test_grade_boundaries(self):
        self.assertEqual(_grade(90), "A")
        self.assertEqual(_grade(89), "B")
        self.assertEqual(_grade(60), "D")
        self.assertEqual(_grade(59), "F")


class ATSCompatibilityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_public_check_with_resume_text(self):
        resp = self.client.post(
            "/api/ats-compatibility/",
            {"resume_text": STRONG_RESUME},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["criteria"]), 10)
        self.assertIn(resp.data["grade"], {"A", "B", "C", "D", "F"})
        self.assertIsInstance(resp.data["estimated_ats_pass_rate"], int)

    def test_missing_input_is_rejected(self):
        resp = self.client.post("/api/ats-compatibility/", {}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_job_description_is_accepted(self):
        resp = self.client.post(
            "/api/ats-compatibility/",
            {"resume_text": STRONG_RESUME, "job_description": "Python Django AWS"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

    def test_analysis_id_requires_authentication(self):
        resp = self.client.post(
            "/api/ats-compatibility/",
            {"analysis_id": 1},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_authenticated_analysis_id_lookup(self):
        user = User.objects.create_user(username="atscompat", password="pw12345!")
        analysis = ResumeAnalysis.objects.create(
            user=user,
            file_name="r.pdf",
            score=80,
            resume_text=STRONG_RESUME,
        )
        self.client.force_authenticate(user=user)
        resp = self.client.post(
            "/api/ats-compatibility/",
            {"analysis_id": analysis.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.data["overall_score"], 80)
