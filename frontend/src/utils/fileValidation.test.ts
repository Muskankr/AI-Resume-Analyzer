import { describe, it, expect } from 'vitest'
import {
  MAX_RESUME_SIZE_BYTES,
  RESUME_ACCEPT_ATTRIBUTE,
  describeAcceptedFormats,
  describeUploadLimits,
  validateResumeFile,
} from './fileValidation'

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type })
  // File size is read-only, so it is stubbed for the size-limit cases.
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateResumeFile', () => {
  it('accepts the three formats the backend parser reads', () => {
    const cases: Array<[string, string]> = [
      ['resume.pdf', 'application/pdf'],
      [
        'resume.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      ['resume.txt', 'text/plain'],
    ]

    for (const [name, type] of cases) {
      const result = validateResumeFile(makeFile(name, type))
      expect(result.ok, `${name} should be accepted`).toBe(true)
    }
  })

  it('matches the extension case-insensitively', () => {
    expect(validateResumeFile(makeFile('RESUME.PDF', 'application/pdf')).ok).toBe(true)
    expect(validateResumeFile(makeFile('Resume.DocX', '')).ok).toBe(true)
  })

  it('accepts a file whose type the browser did not report', () => {
    // Chrome on Linux commonly reports an empty type for .docx.
    expect(validateResumeFile(makeFile('resume.docx', '')).ok).toBe(true)
  })

  it('rejects an unsupported extension and names the supported ones', () => {
    const result = validateResumeFile(makeFile('resume.exe', 'application/octet-stream'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Unsupported')
      expect(result.error).toContain('PDF')
      expect(result.error).toContain('Word (.docx)')
    }
  })

  it('rejects a file with no extension at all', () => {
    expect(validateResumeFile(makeFile('resume', 'application/pdf')).ok).toBe(false)
  })

  it('rejects an empty file', () => {
    const result = validateResumeFile(makeFile('resume.pdf', 'application/pdf', 0))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('empty')
  })

  it('rejects a file over the size limit', () => {
    const result = validateResumeFile(
      makeFile('resume.pdf', 'application/pdf', MAX_RESUME_SIZE_BYTES + 1)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('5.0 MB')
  })

  it('honours a custom size limit and states it in readable units', () => {
    const result = validateResumeFile(makeFile('resume.pdf', 'application/pdf', 2048), {
      maxSizeBytes: 1024,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('1.0 KB')
  })

  it('rejects a file whose reported type belongs to a different accepted format', () => {
    const result = validateResumeFile(makeFile('resume.pdf', 'text/plain'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('does not match')
  })

  it('uses the supplied label in messages', () => {
    const result = validateResumeFile(makeFile('cover.exe', 'application/octet-stream'), {
      label: 'cover letter',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('cover letter')
  })

  it('rejects a missing file', () => {
    expect(validateResumeFile(null).ok).toBe(false)
    expect(validateResumeFile(undefined).ok).toBe(false)
  })
})

describe('format descriptions', () => {
  it('lists the accepted formats in a readable sentence', () => {
    expect(describeAcceptedFormats()).toBe('PDF, Word (.docx) or plain text')
  })

  it('summarises the upload limits for the drop zone', () => {
    expect(describeUploadLimits()).toBe('Supports PDF, DOCX or TXT up to 5MB')
    expect(describeUploadLimits(10 * 1024 * 1024)).toBe('Supports PDF, DOCX or TXT up to 10MB')
  })

  it('builds an accept attribute covering every extension and mime type', () => {
    expect(RESUME_ACCEPT_ATTRIBUTE).toContain('.pdf')
    expect(RESUME_ACCEPT_ATTRIBUTE).toContain('.docx')
    expect(RESUME_ACCEPT_ATTRIBUTE).toContain('.txt')
    expect(RESUME_ACCEPT_ATTRIBUTE).toContain('application/pdf')
  })
})
