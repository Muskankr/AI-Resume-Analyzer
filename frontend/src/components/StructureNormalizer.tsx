import React, { useState } from 'react';
import axios from 'axios';
import './StructureNormalizer.css';

interface NormalizationResult {
    sections: Record<string, string>;
    changes_made: string[];
}

const StructureNormalizer: React.FC = () => {
    const [rawText, setRawText] = useState<string>('');
    const [results, setResults] = useState<NormalizationResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Handles the API request to normalize the resume structure.
     */
    const handleNormalize = async () => {
        if (!rawText.trim()) {
            setError('Please paste your resume text to normalize.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post<NormalizationResult>('/api/normalize-resume/', {
                resume_text: rawText
            });
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to normalize resume. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Copies the normalized resume text to the clipboard.
     */
    const copyNormalizedResume = () => {
        if (!results) return;

        let fullText = '';
        const sectionOrder = ['contact', 'summary', 'experience', 'education', 'skills', 'projects'];

        sectionOrder.forEach(section => {
            if (results.sections[section]) {
                fullText += `${section.toUpperCase()}\n${results.sections[section]}\n\n`;
            }
        });

        navigator.clipboard.writeText(fullText.trim()).then(() => {
            alert('Normalized resume copied to clipboard!');
        }).catch((err) => {
            console.error('Failed to copy: ', err);
        });
    };

    return (
        <div className="structure-normalizer-container">
            <h2 className="normalizer-title">Resume Structure Normalizer</h2>

            <div className="normalizer-workspace">
                {/* Input Section */}
                <div className="input-panel glass-card">
                    <h3>Original Messy Resume</h3>
                    <p className="panel-description">
                        Paste your unstructured or poorly formatted resume text below. We will identify sections and standardize the formatting.
                    </p>
                    <textarea
                        className="text-input"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="e.g.,
John Doe
555-1234

work history
* built a react app
led a team of 5

skills
python, aws"
                        rows={15}
                    />
                    <button
                        className="normalize-btn glass-button"
                        onClick={handleNormalize}
                        disabled={loading}
                    >
                        {loading ? 'Normalizing...' : 'Normalize Structure'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {/* Results Section */}
                <div className="results-panel glass-card">
                    <h3>Normalized Output</h3>

                    {!results && !loading && (
                        <div className="empty-state">
                            <p>Run the normalizer to see your resume restructured with clear sections and consistent bullet points.</p>
                        </div>
                    )}

                    {loading && <div className="loading-state">Analyzing structure and standardizing format...</div>}

                    {results && !loading && (
                        <div className="results-content">
                            <div className="changes-summary">
                                <h4>✅ Changes Applied:</h4>
                                <ul>
                                    {results.changes_made.map((change, idx) => (
                                        <li key={idx}>{change}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="normalized-sections">
                                {['contact', 'summary', 'experience', 'education', 'skills', 'projects'].map(section => {
                                    if (!results.sections[section]) return null;

                                    return (
                                        <div key={section} className="section-block">
                                            <h4 className="section-header">{section.toUpperCase()}</h4>
                                            <pre className="section-content">{results.sections[section]}</pre>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                className="copy-all-btn glass-button secondary"
                                onClick={copyNormalizedResume}
                            >
                                Copy Normalized Resume
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StructureNormalizer;
