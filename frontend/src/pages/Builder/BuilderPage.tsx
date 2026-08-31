import React, { useState } from 'react';
import { ResumeEditor } from './ResumeEditor';
import { LivePreviewPane } from './LivePreviewPane';
import { api } from '../../api/client';
import { useLocation } from 'react-router-dom';
import './Builder.css';

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: { title: string; company: string; duration: string; description: string }[];
  education: { degree: string; institution: string; year: string }[];
}

export const BuilderPage: React.FC = () => {
  const location = useLocation();
  const initialData = location.state?.resumeData || {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: [
      { title: 'Software Engineer', company: 'Tech Corp', duration: '2020 - Present', description: 'Developed cool features.' }
    ],
    education: [
      { degree: 'B.S. Computer Science', institution: 'University of Technology', year: '2019' }
    ]
  };

  const [resumeData, setResumeData] = useState<ResumeData>(initialData);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.post('/api/export-pdf/', resumeData, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="builder-container">
      <div className="builder-header">
        <h1>Resume Editor</h1>
        <button className="export-button" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export to PDF'}
        </button>
      </div>
      <div className="builder-content">
        <ResumeEditor resumeData={resumeData} onChange={setResumeData} />
        <LivePreviewPane resumeData={resumeData} />
      </div>
    </div>
  );
};
