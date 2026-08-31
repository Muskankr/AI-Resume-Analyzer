import React from 'react';

interface CustomizationPanelProps {
  customizations: Record<string, any>;
  onCustomizationChange: (key: string, value: any) => void;
  websiteData: any;
}

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  customizations,
  onCustomizationChange,
  websiteData,
}) => {
  return (
    <div className="customization-panel">
      <h4>Customize Your Website</h4>
      
      <div className="customization-group">
        <label>Personal Information</label>
        <div className="customization-field">
          <label>Name</label>
          <input
            type="text"
            value={customizations.name || websiteData?.name || ''}
            onChange={(e) => onCustomizationChange('name', e.target.value)}
            placeholder="Your full name"
          />
        </div>
        
        <div className="customization-field">
          <label>Title</label>
          <input
            type="text"
            value={customizations.title || websiteData?.title || ''}
            onChange={(e) => onCustomizationChange('title', e.target.value)}
            placeholder="e.g., Software Engineer"
          />
        </div>
        
        <div className="customization-field">
          <label>Summary</label>
          <textarea
            value={customizations.summary || websiteData?.summary || ''}
            onChange={(e) => onCustomizationChange('summary', e.target.value)}
            placeholder="Write a brief professional summary..."
            rows={4}
          />
        </div>
      </div>

      <div className="customization-group">
        <label>Skills</label>
        <div className="customization-field">
          <input
            type="text"
            value={customizations.skills?.join(', ') || websiteData?.skills?.join(', ') || ''}
            onChange={(e) => onCustomizationChange('skills', 
              e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            )}
            placeholder="Enter skills separated by commas"
          />
          <small>e.g., React, Python, TypeScript, Docker</small>
        </div>
      </div>

      <div className="customization-group">
        <label>Advanced Customization</label>
        <div className="customization-field">
          <label>Custom CSS</label>
          <textarea
            value={customizations.custom_css || ''}
            onChange={(e) => onCustomizationChange('custom_css', e.target.value)}
            placeholder="/* Add your custom CSS here */"
            rows={4}
            className="code-editor"
          />
        </div>
        
        <div className="customization-field">
          <label>Custom HTML</label>
          <textarea
            value={customizations.custom_html || ''}
            onChange={(e) => onCustomizationChange('custom_html', e.target.value)}
            placeholder="<!-- Add custom HTML (added before closing body tag) -->"
            rows={4}
            className="code-editor"
          />
        </div>
      </div>
    </div>
  );
};