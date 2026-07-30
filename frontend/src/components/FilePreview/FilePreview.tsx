import { useEffect, useMemo } from 'react'
import { FileText, File as FileIcon, Image as ImageIcon } from 'lucide-react'
import { formatFileSize } from '../../utils/formatFileSize'
import './FilePreview.css'

export interface FilePreviewProps {
  file: File
}

type FileKind = 'pdf' | 'doc' | 'image' | 'text' | 'other'

function getFileKind(file: File): FileKind {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  ) {
    return 'doc'
  }
  if (type === 'text/plain' || name.endsWith('.txt')) return 'text'
  return 'other'
}

const KIND_LABEL: Record<FileKind, string> = {
  pdf: 'PDF',
  doc: 'Word document',
  image: 'Image',
  text: 'Text file',
  other: 'File',
}

/**
 * Shown immediately after a resume file is selected (drag/drop or browse),
 * before the user clicks Analyze, so they can confirm they picked the right
 * file. Renders an actual image thumbnail when the selected file is an
 * image; every other supported type (PDF/DOC/TXT) falls back to a type icon
 * -- true first-page PDF rendering is left as a follow-up since it needs a
 * PDF-rendering dependency this repo doesn't otherwise pull in.
 */
export function FilePreview({ file }: FilePreviewProps) {
  const kind = getFileKind(file)
  // Recomputed whenever `file` (or its kind) changes, so a newly selected
  // file always replaces the previous preview instead of stacking with it.
  const imageUrl = useMemo(
    () => (kind === 'image' ? URL.createObjectURL(file) : null),
    [file, kind]
  )

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  return (
    <div className="file-preview" data-testid="file-preview">
      <div className="file-preview-thumbnail" aria-hidden="true">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="file-preview-image" />
        ) : kind === 'pdf' || kind === 'doc' ? (
          <FileText size={22} />
        ) : kind === 'image' ? (
          <ImageIcon size={22} />
        ) : (
          <FileIcon size={22} />
        )}
      </div>
      <div className="file-preview-details">
        <span className="file-preview-name" title={file.name}>
          {file.name}
        </span>
        <span className="file-preview-meta">
          {KIND_LABEL[kind]} · {formatFileSize(file.size)}
        </span>
      </div>
    </div>
  )
}

export default FilePreview
