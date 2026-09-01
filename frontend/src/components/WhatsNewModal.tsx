import React, { useEffect } from 'react'
import { Sparkles, X, Check } from 'lucide-react'
import { CURRENT_RELEASE, markWhatsNewAsSeen, type ReleaseInfo } from '../data/whatsNewReleases'
import './WhatsNewModal.css'
import { Button } from './Button'

interface WhatsNewModalProps {
  isOpen: boolean
  onClose: () => void
  release?: ReleaseInfo
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  release = CURRENT_RELEASE,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // eslint-disable-next-line react-hooks/immutability
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, release.version])

  if (!isOpen) return null

  const handleDismiss = () => {
    markWhatsNewAsSeen(release.version)
    onClose()
  }

  const getTagClass = (tag: string) => {
    switch (tag) {
      case 'New':
        return 'whats-new-tag--new'
      case 'Improved':
        return 'whats-new-tag--improved'
      case 'Security':
        return 'whats-new-tag--security'
      default:
        return 'whats-new-tag--fix'
    }
  }

  return (
    <div className="whats-new-overlay" onClick={handleDismiss} data-testid="whats-new-overlay">
      <div
        className="whats-new-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="whats-new-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="whats-new-icon-badge">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="whats-new-title" className="whats-new-title">
                What's New <span className="whats-new-version-badge">v{release.version}</span>
              </h2>
              <p className="whats-new-subtitle">
                Latest releases and architectural updates ({release.date})
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            aria-label="Close What's New modal"
            className="whats-new-close-btn"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Highlight Items List */}
        <div className="whats-new-list">
          {release.highlights.map((item, idx) => {
            const tagClass = getTagClass(item.tag)
            return (
              <div key={idx} className="whats-new-item">
                <span className="whats-new-item-icon">{item.icon || '✨'}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span className="whats-new-item-title">{item.title}</span>
                    <span className={`whats-new-tag ${tagClass}`}>{item.tag}</span>
                  </div>
                  <p className="whats-new-item-desc">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer actions */}
        <div className="whats-new-footer">
          <Button
            variant="primary"
            size="md"
            onClick={handleDismiss}
            leftIcon={<Check size={16} />}
            style={{
              padding: '8px 22px',
              fontSize: '0.9rem',
            }}
          >
            Got It, Let's Go!
          </Button>
        </div>
      </div>
    </div>
  )
}
