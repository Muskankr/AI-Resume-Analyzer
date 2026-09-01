import React, { useState } from 'react';
import { JobOfferInput } from './JobOfferInput';
import { ComparisonView } from './ComparisonView';
import './styles.css';

interface ComparisonResult {
  job1: {
    skills: string[];
    experience_level: string;
    seniority: string;
    skill_count: number;
    missing_skills: string[];
  };
  job2: {
    skills: string[];
    experience_level: string;
    seniority: string;
    skill_count: number;
    missing_skills: string[];
  };
  comparison: {
    common_skills: string[];
    unique_to_job1: string[];
    unique_to_job2: string[];
    match_score: number;
    overlap_percentage: number;
    total_skills_combined: number;
  };
  insights: string[];
  seniority_comparison: {
    job1_level: string;
    job2_level: string;
    is_same: boolean;
  };
}

export const JobOfferComparator: React.FC = () => {
  const [jobOffer1, setJobOffer1] = useState('');
  const [jobOffer2, setJobOffer2] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!jobOffer1.trim() || !jobOffer2.trim()) {
      setError('Please enter both job descriptions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/compare-job-offers/compare/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          job_offer_1: jobOffer1,
          job_offer_2: jobOffer2,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.errors?.message || 'Comparison failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compare job offers');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setJobOffer1('');
    setJobOffer2('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="job-offer-comparator">
      <div className="comparator-header">
        <h2>⚖️ Compare Job Offers</h2>
        <p>Paste two job descriptions to compare them side by side</p>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {!result ? (
        <div className="comparator-inputs">
          <JobOfferInput
            label="Job Offer 1"
            value={jobOffer1}
            onChange={setJobOffer1}
            placeholder="Paste the first job description here..."
          />
          <JobOfferInput
            label="Job Offer 2"
            value={jobOffer2}
            onChange={setJobOffer2}
            placeholder="Paste the second job description here..."
          />
          
          <div className="comparator-actions">
            <button
              onClick={handleCompare}
              disabled={loading || !jobOffer1.trim() || !jobOffer2.trim()}
              className="btn-compare"
            >
              {loading ? 'Comparing...' : '⚡ Compare Offers'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={handleReset} className="btn-reset">
            ← New Comparison
          </button>
          <ComparisonView result={result} />
        </>
      )}
    </div>
  );
};

export default JobOfferComparator;