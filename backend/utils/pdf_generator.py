import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_resume_pdf(resume_data: dict) -> bytes:
    """
    Generates a single-column, ATS-friendly PDF from JSON resume data.
    """
    buffer = io.BytesIO()
    
    # Set margins to 0.5 inch (36 points) for ATS friendliness
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=12,
        textColor=colors.black,
        alignment=1 # Center
    )
    
    heading_style = ParagraphStyle(
        'HeadingStyle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.black,
    )
    
    normal_style = styles['Normal']
    
    story = []
    
    # Name & Contact (assuming they are in resume_data)
    name = resume_data.get('name', 'Your Name')
    email = resume_data.get('email', 'email@example.com')
    phone = resume_data.get('phone', '')
    
    story.append(Paragraph(name, title_style))
    contact_info = email
    if phone:
        contact_info += f" | {phone}"
    story.append(Paragraph(contact_info, ParagraphStyle('Contact', parent=normal_style, alignment=1, spaceAfter=12)))
    
    # Skills
    skills = resume_data.get('skills', [])
    if skills:
        story.append(Paragraph('Skills', heading_style))
        skills_text = ", ".join(skills)
        story.append(Paragraph(skills_text, normal_style))
        story.append(Spacer(1, 6))
        
    # Experience
    experience = resume_data.get('experience', [])
    if experience:
        story.append(Paragraph('Experience', heading_style))
        for exp in experience:
            title = exp.get('title', '')
            company = exp.get('company', '')
            duration = exp.get('duration', '')
            description = exp.get('description', '')
            
            exp_header = f"<b>{title}</b> - {company}"
            if duration:
                exp_header += f" | {duration}"
            
            story.append(Paragraph(exp_header, normal_style))
            if description:
                story.append(Paragraph(description, normal_style))
            story.append(Spacer(1, 6))
            
    # Education
    education = resume_data.get('education', [])
    if education:
        story.append(Paragraph('Education', heading_style))
        for edu in education:
            degree = edu.get('degree', '')
            institution = edu.get('institution', '')
            year = edu.get('year', '')
            
            edu_header = f"<b>{degree}</b> - {institution}"
            if year:
                edu_header += f" | {year}"
            
            story.append(Paragraph(edu_header, normal_style))
            story.append(Spacer(1, 6))
            
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
