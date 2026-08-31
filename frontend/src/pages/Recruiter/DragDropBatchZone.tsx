import React, { useCallback, useState } from 'react'

interface DragDropBatchZoneProps {
  onUploadStart: (batchId: string) => void
}

export const DragDropBatchZone: React.FC<DragDropBatchZoneProps> = ({ onUploadStart }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a .zip file containing resumes.')
      return
    }

    // eslint-disable-next-line react-hooks/immutability
    await uploadFile(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Please upload a .zip file containing resumes.')
        return
      }
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('role', 'General')
    formData.append('experience_level', 'Mid-Level')

    try {
      const token = localStorage.getItem('token')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headers: any = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/batch-upload/', {
        method: 'POST',
        body: formData,
        headers,
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
      const data = await response.json()
      onUploadStart(data.batch_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".zip"
        className="hidden"
        id="batch-upload"
        onChange={handleFileSelect}
      />
      <label htmlFor="batch-upload" className="cursor-pointer">
        <div className="flex flex-col items-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Drop ZIP file here
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">or click to select</span>
        </div>
      </label>
      {isUploading && <p className="mt-4 text-blue-500">Uploading...</p>}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  )
}
