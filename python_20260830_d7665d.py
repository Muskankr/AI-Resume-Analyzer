"""
Locust Load Test for Resume Analysis Pipeline
"""

import os
import json
import random
from datetime import datetime
from locust import HttpUser, task, between, events
from locust.exception import StopUser
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

class ResumeAnalysisUser(HttpUser):
    """Simulated user performing resume analysis tasks"""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login before starting tasks"""
        self.token = None
        self.resume_ids = []
        
        # Login
        login_data = {
            'username': os.getenv('TEST_USER', 'testuser'),
            'password': os.getenv('TEST_PASSWORD', 'testpass123')
        }
        
        response = self.client.post('/api/auth/login/', json=login_data)
        if response.status_code == 200:
            self.token = response.json().get('access')
            self.client.headers.update({
                'Authorization': f'Bearer {self.token}'
            })
        else:
            raise StopUser(f"Failed to login: {response.text}")
    
    @task(5)
    def upload_resume(self):
        """Upload a single resume for analysis"""
        resume_data = self.generate_test_resume()
        
        files = {
            'resume': ('resume.pdf', self.generate_pdf(resume_data), 'application/pdf')
        }
        
        with self.client.post('/api/upload/', files=files, catch_response=True) as response:
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get('id'):
                    self.resume_ids.append(data['id'])
                response.success()
            else:
                response.failure(f"Upload failed: {response.status_code}")
    
    @task(3)
    def upload_with_job_description(self):
        """Upload resume with job description"""
        resume_data = self.generate_test_resume()
        job_descriptions = [
            "Senior Software Engineer with 5+ years in Python, Django, and React",
            "DevOps Engineer with AWS, Docker, and Kubernetes experience",
            "Data Scientist with ML, Python, and SQL expertise",
            "Frontend Developer with React, TypeScript, and CSS"
        ]
        
        files = {
            'resume': ('resume.pdf', self.generate_pdf(resume_data), 'application/pdf')
        }
        
        data = {
            'job_description': random.choice(job_descriptions)
        }
        
        with self.client.post('/api/upload/', files=files, data=data, catch_response=True) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Upload failed: {response.status_code}")
    
    @task(2)
    def bulk_upload(self):
        """Upload multiple resumes"""
        num_files = random.randint(2, 5)
        files = []
        
        for i in range(num_files):
            resume_data = self.generate_test_resume()
            files.append(
                ('resumes', (f'resume_{i+1}.pdf', self.generate_pdf(resume_data), 'application/pdf'))
            )
        
        with self.client.post('/api/upload/bulk/', files=files, catch_response=True) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Bulk upload failed: {response.status_code}")
    
    @task(1)
    def get_history(self):
        """Get analysis history"""
        if self.resume_ids:
            resume_id = random.choice(self.resume_ids)
            with self.client.get(f'/api/history/{resume_id}/', catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"History fetch failed: {response.status_code}")
    
    @task(1)
    def get_leaderboard(self):
        """Get leaderboard data"""
        with self.client.get('/api/leaderboard/', catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Leaderboard fetch failed: {response.status_code}")
    
    def generate_test_resume(self):
        """Generate test resume data"""
        names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson']
        skills = [
            ['Python', 'Django', 'React', 'AWS'],
            ['JavaScript', 'Node.js', 'Vue.js', 'MongoDB'],
            ['Java', 'Spring Boot', 'Angular', 'PostgreSQL'],
            ['Go', 'Kubernetes', 'Docker', 'Redis'],
            ['Ruby', 'Rails', 'React', 'MySQL']
        ]
        
        return {
            'name': random.choice(names),
            'skills': random.choice(skills),
            'experience': f"{random.randint(2, 10)} years",
            'email': f"test{random.randint(1000, 9999)}@example.com"
        }
    
    def generate_pdf(self, data):
        """Generate a simple PDF resume"""
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Write content
        y = 750
        c.setFont("Helvetica-Bold", 24)
        c.drawString(100, y, data['name'])
        
        y -= 50
        c.setFont("Helvetica", 16)
        c.drawString(100, y, f"Email: {data['email']}")
        
        y -= 30
        c.drawString(100, y, f"Experience: {data['experience']}")
        
        y -= 30
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, y, "Skills:")
        
        y -= 30
        c.setFont("Helvetica", 14)
        for skill in data['skills']:
            c.drawString(120, y, f"• {skill}")
            y -= 25
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()

@events.init_command_line_parser.add_listener
def init_parser(parser):
    """Add custom command line arguments"""
    parser.add_argument("--test-type", type=str, default="load", 
                       choices=["smoke", "load", "stress", "spike", "soak"],
                       help="Type of test to run")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Setup before test starts"""
    print(f"🚀 Starting {environment.parsed_options.test_type} test at {datetime.now()}")
    
    # Generate test data if needed
    print("📊 Generating test data...")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Cleanup after test ends"""
    print(f"✅ Test completed at {datetime.now()}")
    
    # Generate report
    stats = environment.runner.stats
    print(f"""
    ╔════════════════════════════════════════════════════════════════╗
    ║                    Load Test Results                         ║
    ╠════════════════════════════════════════════════════════════════╣
    ║ Total Requests: {stats.total.num_requests:>49}║
    ║ Failed Requests: {stats.total.num_failures:>48}║
    ║ Success Rate: {(stats.total.num_requests - stats.total.num_failures) / stats.total.num_requests * 100:.2f}%{' ' * (40 - len(str((stats.total.num_requests - stats.total.num_failures) / stats.total.num_requests * 100)))}║
    ║ Average Response Time: {stats.total.avg_response_time:.0f}ms{' ' * (40 - len(str(int(stats.total.avg_response_time))))}║
    ║ 95th Percentile: {stats.total.get_response_time_percentile(0.95):.0f}ms{' ' * (40 - len(str(int(stats.total.get_response_time_percentile(0.95)))))}║
    ╚════════════════════════════════════════════════════════════════╝
    """)