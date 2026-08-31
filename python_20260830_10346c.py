"""
Utility functions for website generator
"""

import re
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional
import json
import zipfile
import io
from pathlib import Path

class WebsiteUtils:
    """Utility class for website generation"""
    
    @staticmethod
    def sanitize_text(text: str) -> str:
        """Sanitize text for HTML output"""
        if not text:
            return ''
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Escape special characters
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return text.strip()
    
    @staticmethod
    def extract_name_from_resume(resume_data: Dict[str, Any]) -> str:
        """Extract name from resume data"""
        name = resume_data.get('name', '')
        if not name:
            # Try to extract from summary or other fields
            summary = resume_data.get('summary', '')
            if summary:
                name = summary.split('.')[0].strip()
            else:
                name = 'Professional Portfolio'
        return WebsiteUtils.sanitize_text(name)
    
    @staticmethod
    def extract_contact_info(resume_data: Dict[str, Any]) -> Dict[str, str]:
        """Extract contact information from resume data"""
        contact = {}
        
        # Common fields
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}'
        
        summary = resume_data.get('summary', '')
        
        # Extract email
        email_match = re.search(email_pattern, summary)
        if email_match:
            contact['email'] = email_match.group()
        
        # Extract phone
        phone_match = re.search(phone_pattern, summary)
        if phone_match:
            contact['phone'] = phone_match.group()
        
        # Extract location (simplified)
        location_pattern = r'(?:in|from|based in)\s+([A-Za-z\s,]+)'
        location_match = re.search(location_pattern, summary)
        if location_match:
            contact['location'] = location_match.group(1).strip()
        
        # Check for explicit fields
        if resume_data.get('email'):
            contact['email'] = resume_data['email']
        if resume_data.get('phone'):
            contact['phone'] = resume_data['phone']
        if resume_data.get('location'):
            contact['location'] = resume_data['location']
        if resume_data.get('linkedin'):
            contact['linkedin'] = resume_data['linkedin']
        if resume_data.get('github'):
            contact['github'] = resume_data['github']
        if resume_data.get('website'):
            contact['website'] = resume_data['website']
        
        return contact
    
    @staticmethod
    def extract_skills(resume_data: Dict[str, Any]) -> List[str]:
        """Extract skills from resume data"""
        skills = resume_data.get('skills_found', [])
        
        # If skills_found is empty, try to extract from text
        if not skills and resume_data.get('text'):
            text = resume_data['text']
            # Common skills to look for
            common_skills = [
                'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Ruby',
                'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask',
                'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
                'SQL', 'MongoDB', 'PostgreSQL', 'MySQL',
                'Git', 'CI/CD', 'Agile', 'Scrum',
                'Machine Learning', 'AI', 'Data Science',
                'HTML', 'CSS', 'SCSS', 'Tailwind'
            ]
            skills = [skill for skill in common_skills if skill.lower() in text.lower()]
        
        return skills[:20]  # Limit to 20 skills
    
    @staticmethod
    def extract_experience(resume_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract work experience from resume data"""
        experience = []
        
        if resume_data.get('experience'):
            for exp in resume_data['experience']:
                experience.append({
                    'title': exp.get('title', ''),
                    'company': exp.get('company', ''),
                    'start_date': exp.get('start_date', ''),
                    'end_date': exp.get('end_date', ''),
                    'description': exp.get('description', '')
                })
        
        return experience
    
    @staticmethod
    def extract_education(resume_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract education from resume data"""
        education = []
        
        if resume_data.get('education'):
            for edu in resume_data['education']:
                education.append({
                    'degree': edu.get('degree', ''),
                    'institution': edu.get('institution', ''),
                    'start_date': edu.get('start_date', ''),
                    'end_date': edu.get('end_date', ''),
                    'gpa': edu.get('gpa', '')
                })
        
        return education
    
    @staticmethod
    def extract_projects(resume_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract projects from resume data"""
        projects = []
        
        if resume_data.get('projects'):
            for proj in resume_data['projects']:
                projects.append({
                    'name': proj.get('name', ''),
                    'description': proj.get('description', ''),
                    'link': proj.get('link', ''),
                    'technologies': proj.get('technologies', [])
                })
        
        return projects
    
    @staticmethod
    def extract_certifications(resume_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract certifications from resume data"""
        certifications = []
        
        if resume_data.get('certifications'):
            for cert in resume_data['certifications']:
                certifications.append({
                    'name': cert.get('name', ''),
                    'issuer': cert.get('issuer', ''),
                    'date': cert.get('date', ''),
                    'link': cert.get('link', '')
                })
        
        return certifications
    
    @staticmethod
    def prepare_website_data(resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare data for website generation"""
        contact = WebsiteUtils.extract_contact_info(resume_data)
        
        return {
            'name': WebsiteUtils.extract_name_from_resume(resume_data),
            'title': resume_data.get('title', 'Professional'),
            'summary': resume_data.get('summary', ''),
            'email': contact.get('email', ''),
            'phone': contact.get('phone', ''),
            'location': contact.get('location', ''),
            'linkedin': contact.get('linkedin', ''),
            'github': contact.get('github', ''),
            'website': contact.get('website', ''),
            'skills': WebsiteUtils.extract_skills(resume_data),
            'experience': WebsiteUtils.extract_experience(resume_data),
            'education': WebsiteUtils.extract_education(resume_data),
            'projects': WebsiteUtils.extract_projects(resume_data),
            'certifications': WebsiteUtils.extract_certifications(resume_data),
            'year': datetime.now().year
        }
    
    @staticmethod
    def generate_website_bundle(
        website_data: Dict[str, Any],
        template: str = 'minimal',
        color_scheme: str = 'light',
        custom_css: Optional[str] = None,
        custom_html: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate complete website bundle with customization"""
        from .templates import TemplateEngine
        
        # Get base template
        base_template = TemplateEngine.get_base_template(template, color_scheme)
        
        # Render template with data
        rendered_html = base_template
        
        # Simple template rendering (replace placeholders)
        for key, value in website_data.items():
            if isinstance(value, str):
                rendered_html = rendered_html.replace(f'{{{{{key}}}}}', value)
            elif isinstance(value, list) and key in ['skills', 'experience', 'education', 'projects', 'certifications']:
                rendered_html = rendered_html.replace(f'{{{{#each {key}}}}}', '')
                # This is a simplified rendering - in production, use a proper templating engine
        
        # Apply custom CSS if provided
        if custom_css:
            rendered_html = rendered_html.replace('</style>', f'{custom_css}\n</style>')
        
        # Apply custom HTML if provided
        if custom_html:
            rendered_html = rendered_html.replace('</body>', f'{custom_html}\n</body>')
        
        # Create bundle
        bundle = {
            'index.html': rendered_html,
            'metadata.json': json.dumps({
                'name': website_data.get('name'),
                'title': website_data.get('title'),
                'template': template,
                'color_scheme': color_scheme,
                'generated_at': datetime.now().isoformat()
            }, indent=2)
        }
        
        # Add favicon if available
        bundle['favicon.ico'] = generate_favicon(website_data.get('name', 'P'))
        
        return bundle
    
    @staticmethod
    def create_zip_bundle(bundle: Dict[str, str]) -> bytes:
        """Create ZIP file from website bundle"""
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for filename, content in bundle.items():
                zip_file.writestr(filename, content)
        
        zip_buffer.seek(0)
        return zip_buffer.getvalue()
    
    @staticmethod
    def generate_deploy_config(website_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate deployment configuration"""
        return {
            'vercel': {
                'project': f"{website_data.get('name', '').lower().replace(' ', '-')}-portfolio",
                'framework': 'static',
                'build_command': 'echo "static site"',
                'output_directory': '.'
            },
            'netlify': {
                'project': f"{website_data.get('name', '').lower().replace(' ', '-')}-portfolio",
                'framework': 'static',
                'build_command': 'echo "static site"',
                'publish_directory': '.'
            }
        }

def generate_favicon(initial: str) -> bytes:
    """Generate simple favicon"""
    # This would generate a proper favicon in production
    # Returning a simple placeholder for now
    return b''  # Placeholder