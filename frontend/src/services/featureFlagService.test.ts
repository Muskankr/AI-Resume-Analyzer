import { describe, it, expect, beforeEach, vi } from 'vitest'
import { featureFlagService, DEFAULT_FEATURE_FLAGS, FeatureFlag } from './featureFlagService'

describe('featureFlagService', () => {
  beforeEach(() => {
    featureFlagService.resetAllOverrides()
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
  })

  it('evaluates built-in feature flags by default', () => {
    expect(featureFlagService.isEnabled('roast_mode')).toBe(true)
    expect(featureFlagService.isEnabled('skills_matrix_v2')).toBe(false)
    expect(featureFlagService.isEnabled('non_existent_flag')).toBe(false)
  })

  it('allows overriding feature flag status', () => {
    featureFlagService.setOverride('skills_matrix_v2', true)
    expect(featureFlagService.isEnabled('skills_matrix_v2')).toBe(true)

    featureFlagService.setOverride('roast_mode', false)
    expect(featureFlagService.isEnabled('roast_mode')).toBe(false)
  })

  it('resets overrides properly', () => {
    featureFlagService.setOverride('skills_matrix_v2', true)
    expect(featureFlagService.isEnabled('skills_matrix_v2')).toBe(true)

    featureFlagService.resetAllOverrides()
    expect(featureFlagService.isEnabled('skills_matrix_v2')).toBe(false)
  })

  it('supports registering new experimental flags dynamically', () => {
    const customFlag: FeatureFlag = {
      key: 'test_experiment',
      name: 'Test Experiment',
      description: 'Temporary experimental feature flag for testing',
      enabledByDefault: true,
      experimental: true,
      category: 'experimental',
      createdAt: '2026-08-30',
    }

    featureFlagService.registerFlag(customFlag)
    expect(featureFlagService.isEnabled('test_experiment')).toBe(true)

    featureFlagService.unregisterFlag('test_experiment')
    expect(featureFlagService.isEnabled('test_experiment')).toBe(false)
  })

  it('notifies subscribers on override changes', () => {
    const listener = vi.fn()
    const unsubscribe = featureFlagService.subscribe(listener)

    featureFlagService.setOverride('template_gallery', false)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('enforces allowedRoles restriction when context is provided', () => {
    expect(featureFlagService.isEnabled('admin_panel')).toBe(false)
    expect(featureFlagService.isEnabled('admin_panel', { role: 'user' })).toBe(false)
    expect(featureFlagService.isEnabled('admin_panel', { role: 'admin' })).toBe(true)
  })
})
