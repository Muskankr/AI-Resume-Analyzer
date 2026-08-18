/**
 * Client-side checks for the files a user picks before we send them upstream.
 *
 * These are a convenience, not a guarantee — the backend runs the same checks
 * plus a file-signature sniff. Keeping the rules here means the drop handler,
 * the file input and any future upload surface stay in agreement instead of
 * each carrying their own copy.
 */

import { formatFileSize } from './formatFileSize'

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export interface AcceptedFormat {
  /** Shown to the user in error messages and helper text. */
  label: string
  extensions: string[]
  /**
   * MIME types browsers report for this format. Browsers are inconsistent
   * here — .docx often arrives as an empty string on Linux, .txt sometimes as
   * `application/octet-stream` — so a missing or unknown type is not treated
   * as a failure, only a contradicting one is.
   */
  mimeTypes: string[]
}

export const RESUME_FORMATS: AcceptedFormat[] = [
  { label: 'PDF', extensions: ['.pdf'], mimeTypes: ['application/pdf'] },
  {
    label: 'Word (.docx)',
    extensions: ['.docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  { label: 'plain text', extensions: ['.txt'], mimeTypes: ['text/plain'] },
]

/** Value for the `accept` attribute of a resume file input. */
export const RESUME_ACCEPT_ATTRIBUTE = RESUME_FORMATS.flatMap((format) => [
  ...format.extensions,
  ...format.mimeTypes,
]).join(',')

/** e.g. `PDF, Word (.docx) or plain text` */
export function describeAcceptedFormats(formats: AcceptedFormat[] = RESUME_FORMATS): string {
  const labels = formats.map((format) => format.label)
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`
}

/** Helper text for the upload zone, e.g. `Supports PDF, DOCX or TXT up to 5MB`. */
export function describeUploadLimits(maxSizeBytes: number = MAX_RESUME_SIZE_BYTES): string {
  const extensions = RESUME_FORMATS.flatMap((format) => format.extensions).map((extension) =>
    extension.replace('.', '').toUpperCase()
  )
  const readable = `${extensions.slice(0, -1).join(', ')} or ${extensions[extensions.length - 1]}`
  return `Supports ${readable} up to ${Math.round(maxSizeBytes / (1024 * 1024))}MB`
}

function extensionOf(fileName: string): string {
  const lower = fileName.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  return dotIndex === -1 ? '' : lower.slice(dotIndex)
}

function findFormat(fileName: string, formats: AcceptedFormat[]): AcceptedFormat | undefined {
  const extension = extensionOf(fileName)
  if (!extension) return undefined
  return formats.find((format) => format.extensions.includes(extension))
}

export type FileValidationResult =
  | { ok: true; format: AcceptedFormat }
  | { ok: false; error: string }

export interface ValidateFileOptions {
  formats?: AcceptedFormat[]
  maxSizeBytes?: number
  /** Used in messages, e.g. "cover letter". */
  label?: string
}

/**
 * Validate a file the user selected or dropped.
 *
 * Checks, in the order the user is most likely to hit them: recognised
 * extension, non-empty, within the size limit, and a MIME type that does not
 * contradict the extension.
 */
export function validateResumeFile(
  file: File | null | undefined,
  options: ValidateFileOptions = {}
): FileValidationResult {
  const {
    formats = RESUME_FORMATS,
    maxSizeBytes = MAX_RESUME_SIZE_BYTES,
    label = 'file',
  } = options

  if (!file) {
    return { ok: false, error: `Please choose a ${label} to upload.` }
  }

  const format = findFormat(file.name, formats)
  if (!format) {
    return {
      ok: false,
      error: `Unsupported ${label} format. Please upload ${describeAcceptedFormats(formats)}.`,
    }
  }

  if (file.size === 0) {
    return { ok: false, error: `The selected ${label} is empty.` }
  }

  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      error: `That ${label} is too large. Maximum allowed size is ${formatFileSize(maxSizeBytes)}.`,
    }
  }

  // Only reject on a type the browser reported *and* that belongs to a
  // different accepted format — an unknown or blank type is common and fine.
  const reportedType = (file.type || '').toLowerCase()
  if (reportedType && !format.mimeTypes.includes(reportedType)) {
    const claimedByAnotherFormat = formats.some(
      (candidate) => candidate !== format && candidate.mimeTypes.includes(reportedType)
    )
    if (claimedByAnotherFormat) {
      return {
        ok: false,
        error: `The ${label} extension does not match its contents. Please re-export it as ${format.label}.`,
      }
    }
  }

  return { ok: true, format }
}
