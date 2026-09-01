import React, { useState, useRef, useEffect } from 'react'
import './PhotoResumeUploader.css'

interface PhotoResumeUploaderProps {
  onPhotoCaptured: (file: File) => void
  selectedFile: File | null
}

export const PhotoResumeUploader: React.FC<PhotoResumeUploaderProps> = ({
  onPhotoCaptured,
  selectedFile,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Sync preview when selectedFile changes externally
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
    } else if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [selectedFile])

  const startCamera = async () => {
    setCameraError(null)
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err: any) {
      console.error(err)
      setCameraActive(false)
      setCameraError('Camera access not supported or permission denied. Please use the photo upload button below.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const handleTabChange = (tab: 'upload' | 'camera') => {
    setActiveTab(tab)
    if (tab === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
  }

  const snapPhoto = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 960
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const photoFile = new File([blob], `printed_resume_photo_${timestamp}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        const url = URL.createObjectURL(photoFile)
        setPreviewUrl(url)
        stopCamera()
        onPhotoCaptured(photoFile)
      },
      'image/jpeg',
      0.92
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      onPhotoCaptured(file)
    }
  }

  return (
    <div className="photo-uploader-card">
      <div className="photo-uploader-header">
        <div className="photo-uploader-title">
          <span>📷</span>
          <span>Printed Resume Photo & Camera OCR</span>
        </div>
        <div className="photo-mode-tabs">
          <button
            type="button"
            className={`photo-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => handleTabChange('upload')}
          >
            🖼️ Select Photo
          </button>
          <button
            type="button"
            className={`photo-tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => handleTabChange('camera')}
          >
            📷 Use Camera
          </button>
        </div>
      </div>

      {/* Guidelines Banner */}
      <div className="photo-guidance-banner">
        <div className="photo-guidance-title">
          <span>💡 Guidelines for High OCR Accuracy</span>
        </div>
        <div className="photo-guidance-grid">
          <div className="photo-guidance-item">
            <span>☀️</span>
            <span><strong>Lighting:</strong> Bright, even illumination without glare or dark shadows.</span>
          </div>
          <div className="photo-guidance-item">
            <span>📐</span>
            <span><strong>Angle:</strong> Hold camera flat overhead (90° angle) parallel to paper.</span>
          </div>
          <div className="photo-guidance-item">
            <span>🔍</span>
            <span><strong>Focus:</strong> Ensure text, dates, and bullet points are sharp and in focus.</span>
          </div>
          <div className="photo-guidance-item">
            <span>📄</span>
            <span><strong>Surface:</strong> Place printed resume flat on a dark/contrasting background.</span>
          </div>
        </div>
      </div>

      {/* Photo Capture Preview or File Selection */}
      {previewUrl ? (
        <div className="photo-preview-container">
          <img src={previewUrl} alt="Captured Printed Resume" className="photo-preview-img" />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="cert-btn cert-btn--secondary"
              onClick={() => {
                setPreviewUrl(null)
                if (activeTab === 'camera') startCamera()
              }}
            >
              🔄 Retake / Change Photo
            </button>
          </div>
        </div>
      ) : activeTab === 'camera' ? (
        <div>
          {cameraError ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '16px' }}>
              ⚠️ {cameraError}
            </div>
          ) : (
            <div>
              <div className="photo-camera-viewport">
                <video ref={videoRef} playsInline muted className="photo-video-stream" />
                <div className="photo-viewfinder-overlay">
                  <span>Align printed resume within frame</span>
                </div>
              </div>
              <div className="photo-shutter-bar">
                <button type="button" className="photo-shutter-btn" onClick={snapPhoto}>
                  📷 Snap & Analyze Photo
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            border: '2px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            cursor: 'pointer',
            background: 'rgba(15, 23, 42, 0.4)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🖼️</span>
          <p style={{ margin: 0, fontWeight: 600, color: '#f8fafc' }}>
            Upload Photo of Printed Resume
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            Supports PNG, JPG, JPEG, WEBP · Mobile Camera Photo Capture
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.webp"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  )
}

export default PhotoResumeUploader
