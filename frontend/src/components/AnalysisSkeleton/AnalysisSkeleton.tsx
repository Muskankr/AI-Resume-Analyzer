import React from "react";
import "./AnalysisSkeleton.css";

const AnalysisSkeleton: React.FC = () => {
  return (
    <div
      className="analysis-skeleton"
      role="status"
      aria-live="polite"
    >
      {/* Reusable screen-reader notification */}
      <span className="sr-only">Analyzing resume and generating insights, please wait...</span>

      {/* Visual representation - hidden from screen readers to prevent noise */}
      <div aria-hidden="true">
        {/* ATS Score Card Placeholder */}
        <div className="skeleton-score-section">
          <div className="skeleton-circle skeleton-shimmer" />
          <div className="skeleton-score-title skeleton-shimmer" />
        </div>

        {/* Resume Preview Placeholder */}
        <div className="skeleton-resume-preview">
          <div className="skeleton-preview-header skeleton-shimmer" />
          <div className="skeleton-line skeleton-shimmer" style={{ width: "95%" }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: "88%" }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: "92%" }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: "75%" }} />
        </div>

        {/* Status Completed Banner Placeholder */}
        <div className="skeleton-status-banner skeleton-shimmer" />
        <div className="skeleton-filename skeleton-shimmer" />

        {/* Skills Section Placeholders */}
        <div className="skeleton-skills-section">
          <div className="skeleton-section-title skeleton-shimmer" />
          <div className="skeleton-badge-container">
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "80px" }} />
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "110px" }} />
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "95px" }} />
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "70px" }} />
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "120px" }} />
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "85px" }} />
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "90px" }} />
            <div className="skeleton-badge skeleton-shimmer" style={{ width: "65px" }} />
          </div>
        </div>

        {/* Skill Gap Matrix (2-column layout) Placeholder */}
        <div className="skeleton-matrix">
          <div className="skeleton-matrix-title skeleton-shimmer" />
          <div className="skeleton-matrix-columns">
            <div className="skeleton-matrix-col">
              <div className="skeleton-matrix-header skeleton-shimmer" />
              <div className="skeleton-badge-container">
                <div className="skeleton-badge skeleton-shimmer" style={{ width: "75px" }} />
                <div className="skeleton-badge skeleton-shimmer" style={{ width: "90px" }} />
                <div className="skeleton-badge skeleton-shimmer" style={{ width: "80px" }} />
              </div>
            </div>
            <div className="skeleton-matrix-col">
              <div className="skeleton-matrix-header skeleton-shimmer" />
              <div className="skeleton-badge-container">
                <div className="skeleton-badge skeleton-shimmer" style={{ width: "85px" }} />
                <div className="skeleton-badge skeleton-shimmer" style={{ width: "70px" }} />
                <div className="skeleton-badge skeleton-shimmer" style={{ width: "95px" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions Section Placeholder */}
        <div className="skeleton-suggestions-box">
          <div className="skeleton-suggestions-header">
            <div className="skeleton-suggestions-title skeleton-shimmer" />
            <div className="skeleton-suggestions-btn skeleton-shimmer" />
          </div>
          <div className="skeleton-suggestion-row skeleton-shimmer" />
          <div className="skeleton-suggestion-row skeleton-shimmer" />
          <div className="skeleton-suggestion-row skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
};

export default AnalysisSkeleton;