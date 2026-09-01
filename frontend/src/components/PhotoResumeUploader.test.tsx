// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PhotoResumeUploader } from './PhotoResumeUploader'

describe('PhotoResumeUploader', () => {
  const onPhotoCapturedMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL & revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-photo-url')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('renders title, photo selection mode, and legibility guidance banner', () => {
    render(<PhotoResumeUploader onPhotoCaptured={onPhotoCapturedMock} selectedFile={null} />)

    expect(screen.getByText(/Printed Resume Photo & Camera OCR/i)).toBeInTheDocument()
    expect(screen.getByText(/Guidelines for High OCR Accuracy/i)).toBeInTheDocument()
    expect(screen.getByText(/Lighting:/i)).toBeInTheDocument()
    expect(screen.getByText(/Angle:/i)).toBeInTheDocument()
    expect(screen.getByText(/Focus:/i)).toBeInTheDocument()
    expect(screen.getByText(/Surface:/i)).toBeInTheDocument()
  })

  it('allows uploading a photo file and triggers onPhotoCaptured', () => {
    const { container } = render(
      <PhotoResumeUploader onPhotoCaptured={onPhotoCapturedMock} selectedFile={null} />
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const fakePhoto = new File(['fake-image-bytes'], 'printed_resume.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [fakePhoto] } })

    expect(onPhotoCapturedMock).toHaveBeenCalledWith(fakePhoto)
  })

  it('switches between Select Photo and Use Camera tabs', () => {
    render(<PhotoResumeUploader onPhotoCaptured={onPhotoCapturedMock} selectedFile={null} />)

    const cameraTabBtn = screen.getByRole('button', { name: /use camera/i })
    fireEvent.click(cameraTabBtn)

    expect(cameraTabBtn).toHaveClass('active')
  })

  it('displays photo preview when selectedFile is provided', () => {
    const fakePhoto = new File(['fake-image-bytes'], 'my_printed_resume.png', { type: 'image/png' })

    render(<PhotoResumeUploader onPhotoCaptured={onPhotoCapturedMock} selectedFile={fakePhoto} />)

    const previewImg = screen.getByAltText(/captured printed resume/i)
    expect(previewImg).toBeInTheDocument()
    expect(previewImg).toHaveAttribute('src', 'blob:http://localhost/mock-photo-url')
  })
})
