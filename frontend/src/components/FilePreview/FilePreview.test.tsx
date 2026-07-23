// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { FilePreview } from './FilePreview'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function makeFile(name: string, size: number, type: string): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('FilePreview component (#140)', () => {
  it('shows the filename and a human-readable size', () => {
    const file = makeFile('resume.pdf', 842 * 1024, 'application/pdf')
    render(<FilePreview file={file} />)

    expect(screen.getByText('resume.pdf')).toBeInTheDocument()
    expect(screen.getByText(/842\.0 KB/)).toBeInTheDocument()
  })

  it('labels a PDF file correctly', () => {
    const file = makeFile('resume.pdf', 1024, 'application/pdf')
    render(<FilePreview file={file} />)
    expect(screen.getByText(/PDF/)).toBeInTheDocument()
  })

  it('labels a DOCX file correctly', () => {
    const file = makeFile(
      'resume.docx',
      2048,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    render(<FilePreview file={file} />)
    expect(screen.getByText(/Word document/)).toBeInTheDocument()
  })

  it('labels a plain text file correctly', () => {
    const file = makeFile('resume.txt', 100, 'text/plain')
    render(<FilePreview file={file} />)
    expect(screen.getByText(/Text file/)).toBeInTheDocument()
  })

  it('renders an actual image thumbnail for image files', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })

    const file = makeFile('photo.png', 4096, 'image/png')
    render(<FilePreview file={file} />)

    const imgEl = document.querySelector('img.file-preview-image') as HTMLImageElement
    expect(imgEl).toBeTruthy()
    expect(imgEl.src).toContain('blob:mock-url')
    expect(createObjectURL).toHaveBeenCalledWith(file)
  })

  it('replaces the preview content when a new file is passed in', () => {
    const first = makeFile('first.pdf', 1024, 'application/pdf')
    const { rerender } = render(<FilePreview file={first} />)
    expect(screen.getByText('first.pdf')).toBeInTheDocument()

    const second = makeFile('second.docx', 2048, 'application/msword')
    rerender(<FilePreview file={second} />)

    expect(screen.queryByText('first.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('second.docx')).toBeInTheDocument()
  })
})
