import React from 'react';

interface PreviewPanelProps {
  previewHtml: string;
  loading: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ previewHtml, loading }) => {
  return (
    <div className="preview-panel">
      <h4>Live Preview</h4>
      <div className="preview-wrapper">
        {loading ? (
          <div className="loading-placeholder">
            <div className="spinner"></div>
            <p>Generating preview...</p>
          </div>
        ) : previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            title="Website Preview"
            className="preview-iframe"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="empty-preview">
            <p>Select a template to see preview</p>
          </div>
        )}
      </div>
    </div>
  );
};