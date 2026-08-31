import React, { useState } from 'react';
import { api } from '../api/client';
import { Button } from './Button';
import './CoverLetterGenerator.css'; // Reuse existing styles

interface AiCoverLetterGeneratorProps {
  analysisId: number;
}

export const AiCoverLetterGenerator: React.FC<AiCoverLetterGeneratorProps> = ({ analysisId }) => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [draft, setDraft] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!jobDescription || jobDescription.trim().length < 20) {
      setError('Please provide a more detailed target job description (at least 20 characters).');
      return;
    }
    
    setError('');
    setWarnings([]);
    setLoading(true);
    setCopied(false);
    
    try {
      const response = await api.post('/api/generate-cover-letter/', {
        analysis_id: analysisId,
        job_description: jobDescription
      });
      
      setDraft(response.data.draft);
      setWarnings(response.data.warnings || []);
      setDisclaimer(response.data.disclaimer || '');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred while generating the cover letter. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (draft) {
      navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDownload = () => {
    if (!draft) return;
    const blob = new Blob([draft], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Cover_Letter_Draft.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="clg-container" style={{ marginTop: '2rem' }}>
      <header className="clg-header">
        <h1>✉️ AI Cover Letter Generator</h1>
        <p>Generate a personalized cover letter draft tailored specifically to your analyzed resume and the target job description.</p>
        <span className="clg-badge">AI-Powered</span>
      </header>

      {/* Input Panel */}
      {!draft && !loading && (
        <div className="clg-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 className="clg-section-title">💼 Target Job Description</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Paste the job description below. Our AI will match your parsed resume experience against these requirements without fabricating claims.
          </p>
          <textarea
            className="clg-textarea"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            style={{ width: '100%' }}
          />
          <div className="clg-char-count">{jobDescription.length} characters</div>
          
          {error && <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>{error}</div>}
          
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Button onClick={handleGenerate} variant="primary" size="lg">
              Generate Cover Letter
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="clg-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loader" role="status" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Generating your personalized cover letter... this may take a few seconds.</p>
        </div>
      )}

      {draft && !loading && (
        <div className="clg-panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
          {disclaimer && (
            <div style={{ background: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #ffeeba' }}>
              <strong>Disclaimer:</strong> {disclaimer}
            </div>
          )}
          
          {warnings.length > 0 && (
            <div style={{ background: '#e2e3e5', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              <strong>Validation Notes:</strong>
              <ul style={{ margin: '8px 0 0 20px' }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <h3 className="clg-section-title">📝 Your Cover Letter Draft</h3>
          <textarea 
            className="clg-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={20}
            style={{ width: '100%', lineHeight: '1.6' }}
          />
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button onClick={handleCopy} variant="secondary">
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <Button onClick={handleDownload} variant="secondary">
              Download .txt
            </Button>
            <Button onClick={handleGenerate} variant="primary">
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
