import React, { useState } from 'react';

interface ExportOptionsProps {
  onExport: (format: string) => void;
  onDeploy: (platform: string) => void;
  websiteData: any;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  onExport,
  onDeploy,
  websiteData,
}) => {
  const [exportFormat, setExportFormat] = useState('zip');
  const [deployPlatform, setDeployPlatform] = useState('vercel');

  return (
    <div className="export-options">
      <h4>Export & Deploy</h4>
      
      <div className="export-section">
        <h5>📦 Download</h5>
        <div className="export-format">
          <label>
            <input
              type="radio"
              value="zip"
              checked={exportFormat === 'zip'}
              onChange={(e) => setExportFormat(e.target.value)}
            />
            ZIP Archive (Recommended)
          </label>
          <label>
            <input
              type="radio"
              value="html"
              checked={exportFormat === 'html'}
              onChange={(e) => setExportFormat(e.target.value)}
            />
            Single HTML File
          </label>
        </div>
        
        <button
          className="btn-primary export-btn"
          onClick={() => onExport(exportFormat)}
        >
          ⬇️ Download Website
        </button>
        
        <div className="file-info">
          <p>Includes: index.html, assets, and deployment config</p>
          <p>Size: ~50KB</p>
        </div>
      </div>

      <div className="deploy-section">
        <h5>🚀 One-Click Deploy</h5>
        <p>Deploy your website to popular hosting platforms</p>
        
        <div className="deploy-platforms">
          <button
            className={`deploy-btn ${deployPlatform === 'vercel' ? 'active' : ''}`}
            onClick={() => setDeployPlatform('vercel')}
          >
            <span className="platform-icon">▲</span> Vercel
          </button>
          <button
            className={`deploy-btn ${deployPlatform === 'netlify' ? 'active' : ''}`}
            onClick={() => setDeployPlatform('netlify')}
          >
            <span className="platform-icon">⎈</span> Netlify
          </button>
        </div>
        
        <button
          className="btn-success deploy-action"
          onClick={() => onDeploy(deployPlatform)}
        >
          🚀 Deploy to {deployPlatform.charAt(0).toUpperCase() + deployPlatform.slice(1)}
        </button>
        
        <div className="deploy-info">
          <p>⚠️ You'll need an account on the selected platform</p>
          <p>Free tier available for both platforms</p>
        </div>
      </div>

      {websiteData && (
        <div className="website-summary">
          <h5>Generated Site Details</h5>
          <div className="summary-item">
            <span>Name:</span>
            <strong>{websiteData.name}</strong>
          </div>
          <div className="summary-item">
            <span>Title:</span>
            <strong>{websiteData.title}</strong>
          </div>
          <div className="summary-item">
            <span>Skills:</span>
            <strong>{websiteData.skills?.length || 0} listed</strong>
          </div>
          <div className="summary-item">
            <span>Experience:</span>
            <strong>{websiteData.experience?.length || 0} entries</strong>
          </div>
          <div className="summary-item">
            <span>Projects:</span>
            <strong>{websiteData.projects?.length || 0} shown</strong>
          </div>
        </div>
      )}
    </div>
  );
};