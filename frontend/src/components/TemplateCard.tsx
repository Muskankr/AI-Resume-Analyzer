import React from 'react'

interface TemplateCardProps {
  name: string
  description: string
  atsNote: string
  fileName: string // e.g., "modern.docx"
  imageSrc: string // public path to preview image
  careerTrack?: string
  designStyle?: string
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  name,
  description,
  atsNote,
  fileName,
  imageSrc,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center shadow-lg">
      <img
        src={imageSrc}
        alt={`${name} preview`}
        className="w-full h-48 object-cover rounded mb-4"
      />
      <h3 className="text-xl font-semibold mb-2 text-white">{name}</h3>
      <p className="text-sm text-gray-300 mb-2">{description}</p>
      <p className="text-xs text-green-400 mb-3">{atsNote}</p>
      <a
        href={`/templates/${fileName}`}
        download
        className="app-btn app-btn--accent"
        aria-label={`Download ${name} template`}
      >
        ⬇️ Download
      </a>
    </div>
  )
}
