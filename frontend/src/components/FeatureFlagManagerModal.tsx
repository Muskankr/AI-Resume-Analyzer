import React, { useState } from 'react'
import { useFeatureFlags } from '../hooks/useFeatureFlag'
import { FlagCategory } from '../services/featureFlagService'
import './FeatureFlagManagerModal.css'

interface FeatureFlagManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export const FeatureFlagManagerModal: React.FC<FeatureFlagManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { flags, overrides, setOverride, resetOverrides } = useFeatureFlags()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  if (!isOpen) return null

  const categories: Array<FlagCategory | 'all'> = ['all', 'experimental', 'beta', 'ui', 'ai', 'analytics']

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch =
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || flag.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="ff-modal-overlay" onClick={onClose}>
      <div className="ff-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ff-modal-header">
          <div className="ff-modal-header-title">
            <span className="ff-modal-icon">🚩</span>
            <h2>Feature Flags & Experimental Toggles</h2>
          </div>
          <button className="ff-modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="ff-modal-toolbar">
          <input
            type="text"
            className="ff-search-input"
            placeholder="Search feature flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="ff-category-filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`ff-category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="ff-modal-body">
          {filteredFlags.length === 0 ? (
            <div className="ff-empty-state">
              <p>No feature flags found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="ff-flag-list">
              {filteredFlags.map((flag) => {
                const hasOverride = flag.key in overrides
                const currentOverride = overrides[flag.key]
                const isEffectiveEnabled = hasOverride ? currentOverride : flag.enabledByDefault

                return (
                  <div key={flag.key} className={`ff-flag-card ${isEffectiveEnabled ? 'enabled' : 'disabled'}`}>
                    <div className="ff-flag-main">
                      <div className="ff-flag-title-row">
                        <span className="ff-flag-name">{flag.name}</span>
                        <code className="ff-flag-key">{flag.key}</code>
                        {flag.experimental && (
                          <span className="ff-badge experimental">Experimental</span>
                        )}
                        <span className={`ff-badge category ${flag.category}`}>{flag.category}</span>
                      </div>
                      <p className="ff-flag-description">{flag.description}</p>
                    </div>

                    <div className="ff-flag-controls">
                      <label className="ff-toggle-switch">
                        <input
                          type="checkbox"
                          checked={isEffectiveEnabled}
                          onChange={(e) => setOverride(flag.key, e.target.checked)}
                        />
                        <span className="ff-slider round"></span>
                      </label>

                      {hasOverride && (
                        <button
                          className="ff-reset-single-btn"
                          title="Reset to default"
                          onClick={() => setOverride(flag.key, null)}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="ff-modal-footer">
          <span className="ff-override-count">
            Active Overrides: {Object.keys(overrides).length}
          </span>
          <div className="ff-footer-actions">
            {Object.keys(overrides).length > 0 && (
              <button className="ff-btn-secondary" onClick={resetOverrides}>
                Reset All Overrides
              </button>
            )}
            <button className="ff-btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
