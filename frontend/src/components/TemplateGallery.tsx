import React from "react";
import { TemplateCard } from "./TemplateCard";

export const TemplateGallery: React.FC = () => {
  const templates = [
    {
      name: "Modern",
      description: "A clean, modern layout with clear sections and plenty of white space.",
      atsNote: "Optimized for ATS parsing – simple formatting, no tables.",
      fileName: "modern.docx",
      imageSrc: "/templates/modern.png",
    },
    {
      name: "Clean",
      description: "Simple and professional design, easy to read for recruiters.",
      atsNote: "Uses standard headings and bullet points – ATS friendly.",
      fileName: "clean.docx",
      imageSrc: "/templates/clean.png",
    },
    {
      name: "Creative",
      description: "Subtle color accents and modern typography while staying ATS compatible.",
      atsNote: "No complex tables or graphics – plain text formatting.",
      fileName: "creative.docx",
      imageSrc: "/templates/creative.png",
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <TemplateCard
          key={t.name}
          name={t.name}
          description={t.description}
          atsNote={t.atsNote}
          fileName={t.fileName}
          imageSrc={t.imageSrc}
        />
      ))}
    </div>
  );
};
