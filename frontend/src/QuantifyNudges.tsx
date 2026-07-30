import React, { useState } from "react";
import "./QuantifyNudges.css";

export interface QuantifyNudge {
  line_index: number;
  original_text: string;
  suggestion: string;
  hint: string;
}

interface Props {
  nudges: QuantifyNudge[];
}

const NudgeCard: React.FC<{ nudge: QuantifyNudge; index: number }> = ({ nudge, index }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="nudge-card" role="listitem">
      <div className="nudge-header" onClick={() => setExpanded(p => !p)}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setExpanded(p => !p)}>
        <div className="nudge-badge">
          <span>📊</span>
          <span className="nudge-label">Bullet #{index + 1} needs a metric</span>
        </div>
        <span>{expanded ? "▲" : "▼"}</span>
      </div>
      <div className="nudge-original">
        <span className="nudge-tag">Original</span>
        <blockquote className="nudge-quote">{nudge.original_text}</blockquote>
      </div>
      {expanded && (
        <div className="nudge-details">
          <p className="nudge-suggestion">💡 {nudge.suggestion}</p>
          <div className="nudge-hint-box">
            <span className="nudge-tag nudge-tag--hint">Example fix</span>
            <p className="nudge-hint-text">{nudge.hint}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const QuantifyNudges: React.FC<Props> = ({ nudges }) => {
  if (!nudges || nudges.length === 0) {
    return (
      <div className="quantify-nudges quantify-nudges--empty">
        <span>✅</span>
        <p>All achievement bullets are already quantified. Great work!</p>
      </div>
    );
  }
  return (
    <section className="quantify-nudges">
      <div className="quantify-nudges__header">
        <h3 className="quantify-nudges__title">📊 Quantify Your Achievements</h3>
        <span className="quantify-nudges__count">
          {nudges.length} bullet{nudges.length !== 1 ? "s" : ""} need a metric
        </span>
      </div>
      <p className="quantify-nudges__desc">
        Numbers make bullets stronger. Each item below is missing a quantifiable detail.
      </p>
      <div role="list">
        {nudges.map((nudge, i) => (
          <NudgeCard key={nudge.line_index} nudge={nudge} index={i} />
        ))}
      </div>
    </section>
  );
};

export default QuantifyNudges;
