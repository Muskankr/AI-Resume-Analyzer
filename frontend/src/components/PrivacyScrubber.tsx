import React, { useState, useRef } from 'react';
import axios from 'axios';
import './PrivacyScrubber.css';

const PrivacyScrubber: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<any>(null);
    const [text, setText] = useState('');
    const [redactedText, setRedactedText] = useState('');
    const [selectedPiiTypes, setSelectedPiiTypes] = useState<string[]>(['email', 'phone', 'ssn']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type)) {
            setError('Please upload a PDF or DOCX file.');
            return;
        }

        setFile(selectedFile);
        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post('/api/file-metadata/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMetadata(response.data);

            // In a real app, we would extract text from the file here to populate the text area
            // For this implementation, we'll prompt the user to paste the text or use a mock
            setText("Paste your resume text here to scan for PII...");
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to extract metadata.');
        } finally {
            setLoading(false);
        }
    };

    const handlePiiTypeToggle = (type: string) => {
        setSelectedPiiTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleSanitize = async () => {
        if (!text.trim()) return;

        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/sanitize-resume/', {
                text: text,
                pii_types_to_redact: selectedPiiTypes
            });
            setRedactedText(response.data.redacted_text);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to sanitize text.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadClean = () => {
        if (!redactedText) return;
        const blob = new Blob([redactedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sanitized_resume.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="privacy-scrubber-container">
            <h2 className="scrubber-title">Resume Privacy Scrubber</h2>

            <div className="scrubber-workspace">
                <div className="upload-panel glass-card">
                    <h3>1. Upload Resume</h3>
                    <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.docx"
                            hidden
                        />
                        <p>{file ? file.name : 'Click to upload PDF or DOCX'}</p>
                    </div>

                    {loading && <p className="loading-text">Extracting metadata...</p>}
                    {error && <p className="error-message">{error}</p>}

                    {metadata && (
                        <div className="metadata-display">
                            <h4>Detected Metadata</h4>
                            <ul>
                                {Object.entries(metadata.metadata).map(([key, value]) => (
                                    <li key={key}><strong>{key}:</strong> {String(value)}</li>
                                ))}
                            </ul>
                            <p className="metadata-warning">⚠️ This metadata is visible to anyone who downloads your file.</p>
                        </div>
                    )}
                </div>

                <div className="redaction-panel glass-card">
                    <h3>2. Redact PII</h3>
                    <div className="pii-toggles">
                        <label>
                            <input
                                type="checkbox"
                                checked={selectedPiiTypes.includes('email')}
                                onChange={() => handlePiiTypeToggle('email')}
                            /> Email Addresses
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={selectedPiiTypes.includes('phone')}
                                onChange={() => handlePiiTypeToggle('phone')}
                            /> Phone Numbers
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={selectedPiiTypes.includes('ssn')}
                                onChange={() => handlePiiTypeToggle('ssn')}
                            /> Social Security Numbers
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={selectedPiiTypes.includes('address')}
                                onChange={() => handlePiiTypeToggle('address')}
                            /> Street Addresses
                        </label>
                    </div>

                    <div className="text-areas">
                        <div className="text-area-wrapper">
                            <label>Original Text</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste resume text here..."
                                rows={10}
                            />
                        </div>
                        <div className="text-area-wrapper">
                            <label>Sanitized Output</label>
                            <textarea
                                value={redactedText}
                                readOnly
                                placeholder="Sanitized text will appear here..."
                                rows={10}
                                className="redacted-output"
                            />
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button
                            className="sanitize-btn glass-button"
                            onClick={handleSanitize}
                            disabled={loading || !text.trim()}
                        >
                            {loading ? 'Sanitizing...' : 'Sanitize Text'}
                        </button>
                        <button
                            className="download-btn glass-button secondary"
                            onClick={handleDownloadClean}
                            disabled={!redactedText}
                        >
                            Download Clean Version
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyScrubber;
