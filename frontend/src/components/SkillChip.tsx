import React, { useState, useRef, useEffect } from "react";

interface SkillChipProps {
  skill: string;
  type: "detected" | "matched" | "missing";
  targetRole?: string;
}

export const SkillChip: React.FC<SkillChipProps> = ({ skill, type, targetRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside the chip
  useEffect(() => {
  const handleClickOutside = (event: Event) => {
    if (chipRef.current && !chipRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
  }

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("touchstart", handleClickOutside);
  };
}, [isOpen]);
  // Context messages based on chip type
  const getContextMessage = () => {
    switch (type) {
      case "matched":
        return `✅ Found in parsed resume text for the ${targetRole || "selected"} role.`;
      case "missing":
        return `⚠️ Required skill for ${targetRole || "this track"} — missing from your uploaded resume.`;
      case "detected":
      default:
        return `🔍 Extracted from document keywords during section parsing.`;
    }
  };

  const getBadgeClass = () => {
    if (type === "matched") return "badge bg-success m-1 skill-chip--interactive";
    if (type === "missing") return "badge bg-danger m-1 skill-chip--interactive";
    return "skill-badge skill-chip--interactive";
  };

  return (
    <div
      ref={chipRef}
      className="skill-chip-wrapper"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen((prev) => !prev)}
      tabIndex={0}
      role="button"
      aria-expanded={isOpen}
      aria-label={`Skill details for ${skill}`}
    >
      <span className={getBadgeClass()}>{skill}</span>

      {isOpen && (
        <div className="skill-chip-popover" role="tooltip">
          <strong className="skill-popover-title">{skill}</strong>
          <p className="skill-popover-context">{getContextMessage()}</p>
        </div>
      )}
    </div>
  );
};