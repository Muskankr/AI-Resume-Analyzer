import React from 'react';

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

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  colorSchemes: ColorScheme[];
  selectedColorScheme: string;
  onColorSchemeChange: (schemeId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateChange,
  colorSchemes,
  selectedColorScheme,
  onColorSchemeChange,
}) => {
  return (
    <div className="template-selector">
      <h4>Choose Template</h4>
      <div className="template-grid">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
            onClick={() => onTemplateChange(template.id)}
          >
            <div className="template-preview">
              <div className={`template-swatch template-${template.id}`}>
                <div className="swatch-header"></div>
                <div className="swatch-body"></div>
              </div>
            </div>
            <div className="template-info">
              <strong>{template.name}</strong>
              <p>{template.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h4>Color Scheme</h4>
      <div className="color-scheme-grid">
        {colorSchemes.map((scheme) => (
          <div
            key={scheme.id}
            className={`color-scheme ${selectedColorScheme === scheme.id ? 'selected' : ''}`}
            onClick={() => onColorSchemeChange(scheme.id)}
            style={{
              background: scheme.colors.bg,
              border: `2px solid ${scheme.colors.border}`,
              color: scheme.colors.text
            }}
          >
            <div className="color-preview">
              <div className="color-dot" style={{ background: scheme.colors.primary }}></div>
              <span>{scheme.name}</span>
            </div>
            <div className="color-swatches">
              <div className="color-swatch" style={{ background: scheme.colors.bg }} />
              <div className="color-swatch" style={{ background: scheme.colors.primary }} />
              <div className="color-swatch" style={{ background: scheme.colors.accent }} />
              <div className="color-swatch" style={{ background: scheme.colors.secondary }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};