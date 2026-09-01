import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TemplateSelector } from './TemplateSelector';
import { CustomizationPanel } from './CustomizationPanel';
import { PreviewPanel } from './PreviewPanel';
import { ExportOptions } from './ExportOptions';

interface WebsiteData {
  name: string;
  title: string;
  summary: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    start_date: string;
    end_date: string;
    gpa: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    link: string;
    technologies: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    link: string;
  }>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  color_schemes: string[];
}

interface ColorScheme {
  id: string;
  name: string;
  colors: {
    bg: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    card_bg: string;
  };
}

export const WebsiteGenerator: React.FC = () => {
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('minimal');
  const [selectedColorScheme, setSelectedColorScheme] = useState('light');
  const [customizations, setCustomizations] = useState({});
  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/website/templates/');
      setTemplates(response.data.templates);
      setColorSchemes(response.data.color_schemes);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    }
  };

  const generateWebsite = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/website/generate/', {
        resume_id: resumeId,
        template: selectedTemplate,
        color_scheme: selectedColorScheme,
        customizations: customizations
      });

      if (response.data.success) {
        setWebsiteData(response.data.website_data);
        setStep(3);
        // Fetch preview
        await fetchPreview();
      } else {
        setError(response.data.error || 'Failed to generate website');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    try {
      const response = await axios.post('/api/website/preview/', {
        resume_id: resumeId,
        template: selectedTemplate,
        color_scheme: selectedColorScheme
      });
      setPreviewHtml(response.data.preview_html);
    } catch (err) {
      console.error('Failed to fetch preview:', err);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    fetchPreview();
  };

  const handleColorSchemeChange = (schemeId: string) => {
    setSelectedColorScheme(schemeId);
    fetchPreview();
  };

  const handleCustomizationChange = (key: string, value: any) => {
    setCustomizations(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async (format: string) => {
    try {
      const response = await axios.post('/api/website/download/', {
        resume_id: resumeId,
        template: selectedTemplate,
        color_scheme: selectedColorScheme,
        customizations: customizations
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-${websiteData?.name?.toLowerCase().replace(/\s+/g, '-') || 'website'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download website');
      console.error(err);
    }
  };

  const handleDeploy = async (platform: string) => {
    try {
      const response = await axios.post('/api/website/deploy/', {
        resume_id: resumeId,
        template: selectedTemplate,
        color_scheme: selectedColorScheme,
        customizations: customizations,
        platform: platform
      });

      if (response.data.success) {
        // Show deployment instructions
        alert(`Deployment instructions:\n${response.data.deploy_instructions.steps.join('\n')}`);
      }
    } catch (err) {
      setError('Failed to deploy website');
      console.error(err);
    }
  };

  return (
    <div className="website-generator">
      <div className="generator-header">
        <h2>🌐 Resume to Personal Website</h2>
        <p>Turn your resume into a beautiful, deployable portfolio website</p>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="generator-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Select Resume</span>
        </div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Customize</span>
        </div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Preview & Export</span>
        </div>
      </div>

      <div className="generator-content">
        {step === 1 && (
          <div className="step-content resume-selection">
            <h3>Select a Resume to Convert</h3>
            <p>Choose a previously analyzed resume or upload a new one</p>
            
            <div className="resume-selector">
              <input
                type="number"
                placeholder="Enter Resume ID"
                value={resumeId || ''}
                onChange={(e) => setResumeId(Number(e.target.value))}
                className="resume-input"
              />
              <button
                onClick={() => setStep(2)}
                disabled={!resumeId}
                className="btn-primary"
              >
                Continue →
              </button>
            </div>
            
            <div className="resume-upload-option">
              <p>Or upload a new resume:</p>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Handle file upload
                    const formData = new FormData();
                    formData.append('resume', file);
                    try {
                      const response = await axios.post('/api/upload/', formData);
                      setResumeId(response.data.id);
                      setStep(2);
                    } catch (err) {
                      setError('Failed to upload resume');
                    }
                  }
                }}
                className="file-input"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content customization">
            <div className="customization-grid">
              <div className="customization-left">
                <TemplateSelector
                  templates={templates}
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={handleTemplateChange}
                  colorSchemes={colorSchemes}
                  selectedColorScheme={selectedColorScheme}
                  onColorSchemeChange={handleColorSchemeChange}
                />
                
                <CustomizationPanel
                  customizations={customizations}
                  onCustomizationChange={handleCustomizationChange}
                  websiteData={websiteData}
                />
                
                <div className="actions">
                  <button
                    onClick={() => setStep(1)}
                    className="btn-secondary"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={generateWebsite}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Generating...' : 'Generate Website →'}
                  </button>
                </div>
              </div>
              
              <div className="customization-right">
                <PreviewPanel
                  previewHtml={previewHtml}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content export">
            <div className="export-grid">
              <div className="export-preview">
                <h3>Generated Website</h3>
                <div className="preview-container">
                  <iframe
                    srcDoc={previewHtml}
                    title="Website Preview"
                    className="preview-iframe"
                  />
                </div>
              </div>
              
              <div className="export-options">
                <ExportOptions
                  onExport={handleExport}
                  onDeploy={handleDeploy}
                  websiteData={websiteData}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};