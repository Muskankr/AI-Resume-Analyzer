import React, { useState, useEffect } from 'react'
import {
  skillsDictionaryManager,
  SkillDictionaryEntry,
  SkillCategory,
} from '../../services/skillsDictionaryManager'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import './AdminSkillsDictionaryPanel.css'

export const AdminSkillsDictionaryPanel: React.FC = () => {
  const { user, isAdminOrMaintainer, setRole } = useAdminAuth()
  const [skills, setSkills] = useState<SkillDictionaryEntry[]>(() =>
    skillsDictionaryManager.getSkills()
  )
  const [categories, setCategories] = useState<SkillCategory[]>(() =>
    skillsDictionaryManager.getCategories()
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'frontend',
    patterns: '',
    description: '',
    demandScore: 80,
  })

  useEffect(() => {
    const unsubscribe = skillsDictionaryManager.subscribe(() => {
      setSkills(skillsDictionaryManager.getSkills())
      setCategories(skillsDictionaryManager.getCategories())
    })
    return unsubscribe
  }, [])

  if (!isAdminOrMaintainer) {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-card">
          <span className="denied-icon">🔒</span>
          <h2>Access Restricted</h2>
          <p>
            You must be logged in as an <strong>Admin</strong> or <strong>Maintainer</strong> to access the Skills Dictionary Management Panel.
          </p>
          <div className="demo-auth-actions">
            <p className="demo-label">Simulate Admin Role for Testing:</p>
            <button className="btn-admin-login" onClick={() => setRole('admin')}>
              Authenticate as Admin
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filteredSkills = skillsDictionaryManager.searchSkills(searchQuery, selectedCategory)

  const handleOpenAddModal = () => {
    setEditingSkillId(null)
    setFormData({
      name: '',
      category: categories[0]?.id || 'frontend',
      patterns: '',
      description: '',
      demandScore: 80,
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (skill: SkillDictionaryEntry) => {
    setEditingSkillId(skill.id)
    setFormData({
      name: skill.name,
      category: skill.category,
      patterns: skill.patterns.join(', '),
      description: skill.description,
      demandScore: skill.demandScore,
    })
    setIsModalOpen(true)
  }

  const handleSaveSkill = (e: React.FormEvent) => {
    e.preventDefault()
    const patternsArray = formData.patterns
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)

    if (editingSkillId) {
      skillsDictionaryManager.updateSkill(editingSkillId, {
        name: formData.name,
        category: formData.category,
        patterns: patternsArray,
        description: formData.description,
        demandScore: formData.demandScore,
      })
    } else {
      skillsDictionaryManager.addSkill({
        name: formData.name,
        category: formData.category,
        patterns: patternsArray,
        description: formData.description,
        demandScore: formData.demandScore,
      })
    }

    setIsModalOpen(false)
  }

  const handleDeleteSkill = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the Skills Dictionary?`)) {
      skillsDictionaryManager.deleteSkill(id)
    }
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset all skills and categories to default system configuration?')) {
      skillsDictionaryManager.resetToDefaults()
    }
  }

  return (
    <div className="admin-panel-container">
      <div className="admin-panel-header">
        <div className="admin-header-title">
          <span className="admin-header-icon">📚</span>
          <div>
            <h2>Skills Dictionary Admin Panel</h2>
            <p>Manage skill entries, detection patterns, and categories without redeploying.</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <button className="btn-secondary-reset" onClick={handleResetDefaults}>
            Reset Defaults
          </button>
          <button className="btn-primary-add" onClick={handleOpenAddModal}>
            + Add New Skill
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search skills by name, pattern, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-pills">
          <button
            className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories ({skills.length})
          </button>
          {categories.map((cat) => {
            const count = skills.filter((s) => s.category === cat.id).length
            return (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <div className="skills-grid">
        {filteredSkills.length === 0 ? (
          <div className="admin-empty-state">
            <p>No skills found matching your criteria.</p>
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const categoryObj = categories.find((c) => c.id === skill.category)
            return (
              <div key={skill.id} className="skill-admin-card">
                <div className="skill-card-header">
                  <div>
                    <h3 className="skill-card-name">{skill.name}</h3>
                    <span className="skill-category-tag" style={{ borderColor: categoryObj?.color }}>
                      {categoryObj?.icon} {categoryObj?.label || skill.category}
                    </span>
                  </div>
                  <div className="demand-score-badge" title="Market Demand Score">
                    ⚡ {skill.demandScore}%
                  </div>
                </div>

                <p className="skill-card-description">{skill.description}</p>

                <div className="skill-patterns-list">
                  <span className="patterns-label">Detection Patterns:</span>
                  <div className="patterns-tags">
                    {skill.patterns.map((pat, idx) => (
                      <code key={idx} className="pattern-tag">
                        {pat}
                      </code>
                    ))}
                  </div>
                </div>

                <div className="skill-card-footer">
                  <span className="updated-date">Updated: {skill.updatedAt}</span>
                  <div className="skill-card-actions">
                    <button className="btn-icon-edit" onClick={() => handleOpenEditModal(skill)}>
                      Edit
                    </button>
                    <button
                      className="btn-icon-delete"
                      onClick={() => handleDeleteSkill(skill.id, skill.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingSkillId ? 'Edit Skill Entry' : 'Add New Skill Entry'}</h3>
              <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSkill} className="admin-form">
              <div className="form-group">
                <label>Skill Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React.js"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Detection Patterns (comma-separated aliases)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. react, reactjs, react.js, jsx"
                  value={formData.patterns}
                  onChange={(e) => setFormData({ ...formData, patterns: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Brief summary of the skill..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Market Demand Score (1 - 100): {formData.demandScore}</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.demandScore}
                  onChange={(e) =>
                    setFormData({ ...formData, demandScore: parseInt(e.target.value, 10) })
                  }
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
