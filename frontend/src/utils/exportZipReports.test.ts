import { describe, it, expect, vi } from 'vitest'
import {
  sanitizeFilename,
  generateSingleReportPdf,
  downloadBulkReportsZip,
  type BulkReportItem,
} from './exportZipReports'

// Mock jsPDF
vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(function() { return {
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      splitTextToSize: vi.fn((text: string) => [text]),
      text: vi.fn(),
      addPage: vi.fn(),
      output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
    }; }),
  }
})

describe('exportZipReports Utility', () => {
  it('sanitizes strings into valid filenames', () => {
    expect(sanitizeFilename('Software Engineer / Frontend & Backend!')).toBe(
      'Software_Engineer_Frontend_Backend_'
    )
    expect(sanitizeFilename('React.js Developer')).toBe('React.js_Developer')
  })

  it('generates a jsPDF instance for a single report item', () => {
    const item: BulkReportItem = {
      targetRole: 'Frontend Developer',
      score: 85,
      matchedSkills: ['react', 'typescript'],
      missingSkills: ['docker'],
      suggestions: ['Add Docker experience'],
    }

    const doc = generateSingleReportPdf(item)
    expect(doc).toBeDefined()
    expect(doc.output).toBeDefined()
  })

  it('generates a zip blob containing multiple distinguishably named reports without error', async () => {
    // Safely attach URL.createObjectURL / revokeObjectURL for jsdom test env
    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
      window.URL.revokeObjectURL = vi.fn()
    }

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

    const sampleReports: BulkReportItem[] = [
      {
        id: 101,
        fileName: 'resume_john.pdf',
        targetRole: 'Frontend Lead',
        score: 90,
        matchedSkills: ['react', 'javascript', 'html'],
        missingSkills: ['graphql'],
        suggestions: ['Learn GraphQL basics'],
      },
      {
        id: 102,
        fileName: 'resume_jane.pdf',
        targetRole: 'Backend Engineer',
        score: 75,
        matchedSkills: ['python', 'django'],
        missingSkills: ['redis', 'docker'],
        suggestions: ['Add Redis experience'],
      },
    ]

    const zipBlob = await downloadBulkReportsZip(sampleReports, 'test-batch.zip')

    expect(zipBlob).toBeInstanceOf(Blob)
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})
