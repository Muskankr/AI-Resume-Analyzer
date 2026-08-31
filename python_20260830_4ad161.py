"""
HTML/CSS Templates for Resume-to-Website Generator
"""

class TemplateEngine:
    """Handles template rendering and customization"""
    
    TEMPLATES = {
        'minimal': {
            'name': 'Minimal',
            'description': 'Clean, minimalist design focused on content',
            'color_schemes': ['light', 'dark', 'navy', 'teal']
        },
        'modern': {
            'name': 'Modern',
            'description': 'Contemporary design with subtle animations',
            'color_schemes': ['light', 'dark', 'purple', 'blue']
        },
        'professional': {
            'name': 'Professional',
            'description': 'Corporate-style layout ideal for job applications',
            'color_schemes': ['light', 'dark', 'slate', 'indigo']
        },
        'creative': {
            'name': 'Creative',
            'description': 'Unique design for creative professionals',
            'color_schemes': ['light', 'dark', 'coral', 'amber']
        }
    }
    
    COLOR_SCHEMES = {
        'light': {
            'bg': '#ffffff',
            'text': '#1a1a1a',
            'primary': '#2563eb',
            'secondary': '#4b5563',
            'accent': '#3b82f6',
            'border': '#e5e7eb',
            'card_bg': '#f9fafb'
        },
        'dark': {
            'bg': '#0f172a',
            'text': '#f1f5f9',
            'primary': '#60a5fa',
            'secondary': '#94a3b8',
            'accent': '#3b82f6',
            'border': '#1e293b',
            'card_bg': '#1e293b'
        },
        'navy': {
            'bg': '#0a1628',
            'text': '#e8edf5',
            'primary': '#4f8cf7',
            'secondary': '#8899bb',
            'accent': '#6b9cf7',
            'border': '#1a2a4a',
            'card_bg': '#12203a'
        },
        'teal': {
            'bg': '#f0fdfa',
            'text': '#0f172a',
            'primary': '#0d9488',
            'secondary': '#4b5563',
            'accent': '#14b8a6',
            'border': '#ccfbf1',
            'card_bg': '#ffffff'
        },
        'purple': {
            'bg': '#faf5ff',
            'text': '#1a1a2e',
            'primary': '#7c3aed',
            'secondary': '#6b7280',
            'accent': '#8b5cf6',
            'border': '#ede9fe',
            'card_bg': '#ffffff'
        },
        'blue': {
            'bg': '#eff6ff',
            'text': '#1a1a2e',
            'primary': '#2563eb',
            'secondary': '#4b5563',
            'accent': '#3b82f6',
            'border': '#dbeafe',
            'card_bg': '#ffffff'
        },
        'slate': {
            'bg': '#f1f5f9',
            'text': '#0f172a',
            'primary': '#475569',
            'secondary': '#64748b',
            'accent': '#64748b',
            'border': '#e2e8f0',
            'card_bg': '#ffffff'
        },
        'indigo': {
            'bg': '#eef2ff',
            'text': '#1a1a2e',
            'primary': '#4f46e5',
            'secondary': '#6366f1',
            'accent': '#818cf8',
            'border': '#e0e7ff',
            'card_bg': '#ffffff'
        },
        'coral': {
            'bg': '#fff5f5',
            'text': '#1a1a2e',
            'primary': '#f43f5e',
            'secondary': '#e11d48',
            'accent': '#fb7185',
            'border': '#ffe4e6',
            'card_bg': '#ffffff'
        },
        'amber': {
            'bg': '#fffbeb',
            'text': '#1a1a2e',
            'primary': '#d97706',
            'secondary': '#b45309',
            'accent': '#f59e0b',
            'border': '#fef3c7',
            'card_bg': '#ffffff'
        }
    }

    @classmethod
    def get_base_template(cls, template_name='minimal', color_scheme='light'):
        """Generate base HTML template with CSS"""
        colors = cls.COLOR_SCHEMES.get(color_scheme, cls.COLOR_SCHEMES['light'])
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{name}} - Professional Portfolio">
    <meta name="theme-color" content="{colors['primary']}">
    <title>{{name}} - Portfolio</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: {colors['bg']};
            color: {colors['text']};
            line-height: 1.6;
            transition: background-color 0.3s ease, color 0.3s ease;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }}
        
        /* Header Styles */
        .header {{
            text-align: center;
            padding: 3rem 0;
            border-bottom: 2px solid {colors['border']};
            margin-bottom: 2rem;
        }}
        
        .header h1 {{
            font-size: 3rem;
            font-weight: 700;
            color: {colors['primary']};
            margin-bottom: 0.5rem;
        }}
        
        .header .title {{
            font-size: 1.25rem;
            color: {colors['secondary']};
            margin-bottom: 1rem;
        }}
        
        .header .contact-info {{
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            flex-wrap: wrap;
            font-size: 0.95rem;
            color: {colors['secondary']};
        }}
        
        .header .contact-info a {{
            color: {colors['primary']};
            text-decoration: none;
            transition: color 0.2s;
        }}
        
        .header .contact-info a:hover {{
            color: {colors['accent']};
            text-decoration: underline;
        }}
        
        /* Section Styles */
        .section {{
            margin-bottom: 2.5rem;
        }}
        
        .section h2 {{
            font-size: 1.75rem;
            color: {colors['primary']};
            border-bottom: 2px solid {colors['border']};
            padding-bottom: 0.5rem;
            margin-bottom: 1.5rem;
        }}
        
        /* Card Styles */
        .card {{
            background: {colors['card_bg']};
            border: 1px solid {colors['border']};
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }}
        
        .card h3 {{
            color: {colors['primary']};
            margin-bottom: 0.5rem;
        }}
        
        .card .subtitle {{
            color: {colors['secondary']};
            font-size: 0.95rem;
            margin-bottom: 0.5rem;
        }}
        
        .card .date {{
            color: {colors['secondary']};
            font-size: 0.85rem;
            margin-bottom: 0.75rem;
        }}
        
        /* Skills Grid */
        .skills-grid {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
        }}
        
        .skill-tag {{
            background: {colors['primary']};
            color: white;
            padding: 0.4rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
            transition: transform 0.2s, background-color 0.2s;
        }}
        
        .skill-tag:hover {{
            transform: scale(1.05);
            background: {colors['accent']};
        }}
        
        /* Grid Layout for Experience/Projects */
        .grid-2 {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }}
        
        /* Responsive Design */
        @media (max-width: 768px) {{
            .container {{
                padding: 1rem;
            }}
            
            .header h1 {{
                font-size: 2rem;
            }}
            
            .header .contact-info {{
                flex-direction: column;
                gap: 0.5rem;
            }}
            
            .grid-2 {{
                grid-template-columns: 1fr;
            }}
        }}
        
        /* Animations */
        @keyframes fadeIn {{
            from {{
                opacity: 0;
                transform: translateY(20px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        .fade-in {{
            animation: fadeIn 0.6s ease-out;
        }}
        
        /* Print Styles */
        @media print {{
            .card:hover {{
                transform: none;
                box-shadow: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header fade-in">
            <h1>{{name}}</h1>
            <div class="title">{{title}}</div>
            <div class="contact-info">
                {{#if email}}<span>📧 <a href="mailto:{{email}}">{{email}}</a></span>{{/if}}
                {{#if phone}}<span>📱 {{phone}}</span>{{/if}}
                {{#if location}}<span>📍 {{location}}</span>{{/if}}
                {{#if github}}<span>💻 <a href="{{github}}" target="_blank">GitHub</a></span>{{/if}}
                {{#if linkedin}}<span>🔗 <a href="{{linkedin}}" target="_blank">LinkedIn</a></span>{{/if}}
                {{#if website}}<span>🌐 <a href="{{website}}" target="_blank">Website</a></span>{{/if}}
            </div>
        </header>

        <!-- Summary -->
        {{#if summary}}
        <section class="section fade-in">
            <h2>About Me</h2>
            <p>{{summary}}</p>
        </section>
        {{/if}}

        <!-- Experience -->
        {{#if experience}}
        <section class="section fade-in">
            <h2>Experience</h2>
            <div class="grid-2">
                {{#each experience}}
                <div class="card">
                    <h3>{{title}}</h3>
                    <div class="subtitle">{{company}}</div>
                    <div class="date">{{start_date}} - {{#if end_date}}{{end_date}}{{else}}Present{{/if}}</div>
                    <p>{{description}}</p>
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <!-- Education -->
        {{#if education}}
        <section class="section fade-in">
            <h2>Education</h2>
            <div class="grid-2">
                {{#each education}}
                <div class="card">
                    <h3>{{degree}}</h3>
                    <div class="subtitle">{{institution}}</div>
                    <div class="date">{{start_date}} - {{#if end_date}}{{end_date}}{{else}}Present{{/if}}</div>
                    {{#if gpa}}<p>GPA: {{gpa}}</p>{{/if}}
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <!-- Skills -->
        {{#if skills}}
        <section class="section fade-in">
            <h2>Skills</h2>
            <div class="skills-grid">
                {{#each skills}}
                <span class="skill-tag">{{this}}</span>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <!-- Projects -->
        {{#if projects}}
        <section class="section fade-in">
            <h2>Projects</h2>
            <div class="grid-2">
                {{#each projects}}
                <div class="card">
                    <h3>{{name}}</h3>
                    {{#if description}}<p>{{description}}</p>{{/if}}
                    {{#if link}}<a href="{{link}}" target="_blank">View Project →</a>{{/if}}
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <!-- Certifications -->
        {{#if certifications}}
        <section class="section fade-in">
            <h2>Certifications</h2>
            <div class="grid-2">
                {{#each certifications}}
                <div class="card">
                    <h3>{{name}}</h3>
                    <div class="subtitle">{{issuer}}</div>
                    <div class="date">{{#if date}}{{date}}{{/if}}</div>
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <!-- Footer -->
        <footer style="text-align: center; padding: 2rem 0; border-top: 2px solid {colors['border']}; margin-top: 2rem; color: {colors['secondary']};">
            <p>&copy; {{year}} {{name}}. Built with AI Resume Analyzer</p>
        </footer>
    </div>
</body>
</html>'''

    @classmethod
    def generate_css_variables(cls, color_scheme):
        """Generate CSS variables for customization"""
        colors = cls.COLOR_SCHEMES.get(color_scheme, cls.COLOR_SCHEMES['light'])
        return f'''
        :root {{
            --bg-color: {colors['bg']};
            --text-color: {colors['text']};
            --primary-color: {colors['primary']};
            --secondary-color: {colors['secondary']};
            --accent-color: {colors['accent']};
            --border-color: {colors['border']};
            --card-bg: {colors['card_bg']};
        }}
        '''

    @classmethod
    def get_template_options(cls):
        """Get available template options"""
        return [
            {
                'id': template_id,
                'name': template['name'],
                'description': template['description'],
                'color_schemes': template['color_schemes']
            }
            for template_id, template in cls.TEMPLATES.items()
        ]

    @classmethod
    def get_color_scheme_options(cls):
        """Get available color schemes"""
        return [
            {
                'id': scheme_id,
                'name': scheme_id.capitalize(),
                'colors': colors
            }
            for scheme_id, colors in cls.COLOR_SCHEMES.items()
        ]