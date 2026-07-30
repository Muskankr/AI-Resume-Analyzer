import React, { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'
import './ShareResult.css'

interface ShareResultProps {
  shareId: string
}

export const ShareResult: React.FC<ShareResultProps> = ({ shareId }) => {
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/shared/${shareId}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="share-result-container mt-4">
      <div className="share-header">
        <Share2 size={16} />
        <span>Share Analysis Result</span>
      </div>
      <div className="share-input-group">
        <input type="text" value={shareUrl} readOnly className="share-url-input" />
        <button className="share-copy-btn" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
      </div>
      <p className="share-help-text">
        Anyone with this link can view a read-only version of this specific analysis.
      </p>
    </div>
  )
}
