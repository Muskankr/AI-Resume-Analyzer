import React from "react";

/**
 * Highlights skills inside a raw text block by wrapping matching phrases in a mark tag.
 */
export function highlightSkills(text: string, skills: string[]): React.ReactNode[] {
  if (!text) return [];
  if (skills.length === 0) return [text];

  const sorted = [...skills].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\w])(${escaped.join("|")})(?![\\w])`, "gi");
  const parts = text.split(pattern);
  const skillSet = new Set(skills.map((s) => s.toLowerCase()));

  return parts.map((part, i) =>
    skillSet.has(part.toLowerCase()) ? (
      <mark key={i} className="skill-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Generates a formatted date-time string suitable for export filenames.
 */
export function getExportTimestamp(): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}-${pad(d.getSeconds())}`;
}