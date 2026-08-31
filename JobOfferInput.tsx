import React from 'react';

interface JobOfferInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const JobOfferInput: React.FC<JobOfferInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => {
  const characterCount = value.length;

  return (
    <div className="job-offer-input">
      <div className="input-header">
        <label>{label}</label>
        <span className={`char-count ${characterCount > 9000 ? 'warning' : ''}`}>
          {characterCount} / 10000
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={10000}
        rows={10}
      />
      <div className="input-hint">
        <span>💡 Tip: Include job title, required skills, and experience level for best results</span>
      </div>
    </div>
  );
};