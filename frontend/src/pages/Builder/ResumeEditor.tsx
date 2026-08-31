import React from 'react';
import type { ResumeData } from './BuilderPage';

interface Props {
  resumeData: ResumeData;
  onChange: (data: ResumeData) => void;
}

export const ResumeEditor: React.FC<Props> = ({ resumeData, onChange }) => {
  const handleChange = (field: keyof ResumeData, value: any) => {
    onChange({ ...resumeData, [field]: value });
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const skillsArray = e.target.value.split(',').map(s => s.trim());
    handleChange('skills', skillsArray);
  };

  return (
    <div className="resume-editor">
      <h2>Edit Information</h2>
      
      <div className="form-group">
        <label>Name</label>
        <input value={resumeData.name} onChange={e => handleChange('name', e.target.value)} />
      </div>
      
      <div className="form-group">
        <label>Email</label>
        <input value={resumeData.email} onChange={e => handleChange('email', e.target.value)} />
      </div>
      
      <div className="form-group">
        <label>Phone</label>
        <input value={resumeData.phone} onChange={e => handleChange('phone', e.target.value)} />
      </div>

      <div className="form-group">
        <label>Skills (comma separated)</label>
        <textarea value={resumeData.skills.join(', ')} onChange={handleSkillsChange} />
      </div>

      <div className="form-group">
        <h3>Experience</h3>
        {resumeData.experience.map((exp, index) => (
          <div key={index} className="nested-group">
            <input placeholder="Title" value={exp.title} onChange={e => {
              const newExp = [...resumeData.experience];
              newExp[index].title = e.target.value;
              handleChange('experience', newExp);
            }} />
            <input placeholder="Company" value={exp.company} onChange={e => {
              const newExp = [...resumeData.experience];
              newExp[index].company = e.target.value;
              handleChange('experience', newExp);
            }} />
            <input placeholder="Duration" value={exp.duration} onChange={e => {
              const newExp = [...resumeData.experience];
              newExp[index].duration = e.target.value;
              handleChange('experience', newExp);
            }} />
            <textarea placeholder="Description" value={exp.description} onChange={e => {
              const newExp = [...resumeData.experience];
              newExp[index].description = e.target.value;
              handleChange('experience', newExp);
            }} />
          </div>
        ))}
        <button onClick={() => handleChange('experience', [...resumeData.experience, { title: '', company: '', duration: '', description: '' }])}>
          Add Experience
        </button>
      </div>

      <div className="form-group">
        <h3>Education</h3>
        {resumeData.education.map((edu, index) => (
          <div key={index} className="nested-group">
            <input placeholder="Degree" value={edu.degree} onChange={e => {
              const newEdu = [...resumeData.education];
              newEdu[index].degree = e.target.value;
              handleChange('education', newEdu);
            }} />
            <input placeholder="Institution" value={edu.institution} onChange={e => {
              const newEdu = [...resumeData.education];
              newEdu[index].institution = e.target.value;
              handleChange('education', newEdu);
            }} />
            <input placeholder="Year" value={edu.year} onChange={e => {
              const newEdu = [...resumeData.education];
              newEdu[index].year = e.target.value;
              handleChange('education', newEdu);
            }} />
          </div>
        ))}
        <button onClick={() => handleChange('education', [...resumeData.education, { degree: '', institution: '', year: '' }])}>
          Add Education
        </button>
      </div>
    </div>
  );
};
