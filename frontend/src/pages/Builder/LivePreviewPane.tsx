import React from 'react';
import type { ResumeData } from './BuilderPage';

interface Props {
  resumeData: ResumeData;
}

export const LivePreviewPane: React.FC<Props> = ({ resumeData }) => {
  return (
    <div className="live-preview-pane">
      <div className="preview-document">
        <h1 className="preview-name">{resumeData.name || 'Your Name'}</h1>
        <p className="preview-contact">
          {resumeData.email || 'email@example.com'} {resumeData.phone && `| ${resumeData.phone}`}
        </p>

        {resumeData.skills && resumeData.skills.length > 0 && (
          <div className="preview-section">
            <h2 className="preview-heading">Skills</h2>
            <p className="preview-skills">{resumeData.skills.join(', ')}</p>
          </div>
        )}

        {resumeData.experience && resumeData.experience.length > 0 && (
          <div className="preview-section">
            <h2 className="preview-heading">Experience</h2>
            {resumeData.experience.map((exp, index) => (
              <div key={index} className="preview-item">
                <p><strong>{exp.title}</strong> - {exp.company} {exp.duration && `| ${exp.duration}`}</p>
                {exp.description && <p>{exp.description}</p>}
              </div>
            ))}
          </div>
        )}

        {resumeData.education && resumeData.education.length > 0 && (
          <div className="preview-section">
            <h2 className="preview-heading">Education</h2>
            {resumeData.education.map((edu, index) => (
              <div key={index} className="preview-item">
                <p><strong>{edu.degree}</strong> - {edu.institution} {edu.year && `| ${edu.year}`}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
