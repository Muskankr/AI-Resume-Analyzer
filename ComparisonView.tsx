import React from 'react';

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

interface ComparisonViewProps {
  result: ComparisonResult;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ result }) => {
  const { job1, job2, comparison, insights, seniority_comparison } = result;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const getSeniorityBadge = (level: string) => {
    const colors: Record<string, string> = {
      'junior': 'badge-junior',
      'mid': 'badge-mid',
      'senior': 'badge-senior',
      'lead': 'badge-lead',
    };
    return colors[level] || 'badge-default';
  };

  return (
    <div className="comparison-view">
      {/* Score Header */}
      <div className="score-header">
        <div className="match-score">
          <div className={`score-circle ${getScoreColor(comparison.match_score)}`}>
            <span className="score-number">{comparison.match_score}%</span>
            <span className="score-label">Match</span>
          </div>
          <div className="score-details">
            <p>Skills overlap: {comparison.overlap_percentage}%</p>
            <p>Total skills combined: {comparison.total_skills_combined}</p>
          </div>
        </div>
      </div>

      {/* Side by Side Comparison */}
      <div className="side-by-side">
        <div className="job-side job-1">
          <h3>📋 Job Offer 1</h3>
          <div className="job-details">
            <div className="detail-item">
              <span className="label">Experience:</span>
              <span className="value">{job1.experience_level}</span>
            </div>
            <div className="detail-item">
              <span className="label">Seniority:</span>
              <span className={`badge ${getSeniorityBadge(job1.seniority)}`}>
                {job1.seniority}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Skills ({job1.skill_count}):</span>
              <div className="skill-tags">
                {job1.skills.map((skill, idx) => (
                  <span key={idx} className="skill-tag job1-skill">{skill}</span>
                ))}
              </div>
            </div>
            {job1.missing_skills.length > 0 && (
              <div className="detail-item missing">
                <span className="label">Missing skills:</span>
                <div className="skill-tags">
                  {job1.missing_skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag missing-skill">⚠️ {skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="job-side job-2">
          <h3>📋 Job Offer 2</h3>
          <div className="job-details">
            <div className="detail-item">
              <span className="label">Experience:</span>
              <span className="value">{job2.experience_level}</span>
            </div>
            <div className="detail-item">
              <span className="label">Seniority:</span>
              <span className={`badge ${getSeniorityBadge(job2.seniority)}`}>
                {job2.seniority}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Skills ({job2.skill_count}):</span>
              <div className="skill-tags">
                {job2.skills.map((skill, idx) => (
                  <span key={idx} className="skill-tag job2-skill">{skill}</span>
                ))}
              </div>
            </div>
            {job2.missing_skills.length > 0 && (
              <div className="detail-item missing">
                <span className="label">Missing skills:</span>
                <div className="skill-tags">
                  {job2.missing_skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag missing-skill">⚠️ {skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills Comparison */}
      <div className="skills-comparison">
        <h3>🔍 Skills Breakdown</h3>
        <div className="skills-breakdown">
          <div className="skill-group common">
            <h4>Common Skills ({comparison.common_skills.length})</h4>
            <div className="skill-tags">
              {comparison.common_skills.map((skill, idx) => (
                <span key={idx} className="skill-tag common-skill">✅ {skill}</span>
              ))}
            </div>
          </div>
          <div className="skill-group unique">
            <h4>Unique to Job 1 ({comparison.unique_to_job1.length})</h4>
            <div className="skill-tags">
              {comparison.unique_to_job1.map((skill, idx) => (
                <span key={idx} className="skill-tag unique-1">🔵 {skill}</span>
              ))}
            </div>
          </div>
          <div className="skill-group unique">
            <h4>Unique to Job 2 ({comparison.unique_to_job2.length})</h4>
            <div className="skill-tags">
              {comparison.unique_to_job2.map((skill, idx) => (
                <span key={idx} className="skill-tag unique-2">🟢 {skill}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Seniority Comparison */}
      <div className="seniority-comparison">
        <h3>📊 Seniority Comparison</h3>
        <div className="seniority-bars">
          <div className="seniority-bar">
            <span>Job 1</span>
            <div className={`bar level-${seniority_comparison.job1_level}`}>
              {seniority_comparison.job1_level}
            </div>
          </div>
          <div className="seniority-bar">
            <span>Job 2</span>
            <div className={`bar level-${seniority_comparison.job2_level}`}>
              {seniority_comparison.job2_level}
            </div>
          </div>
        </div>
        <div className="seniority-note">
          {seniority_comparison.is_same ? (
            <span>✅ Both roles have similar seniority expectations</span>
          ) : (
            <span>⚠️ Seniority differs between the two roles</span>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="insights-section">
        <h3>💡 Key Insights</h3>
        <ul className="insights-list">
          {insights.map((insight, idx) => (
            <li key={idx} className="insight-item">
              <span className="insight-bullet">•</span>
              {insight}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};