/**
 * Feature Flag Service
 * 
 * Provides a lightweight, highly configurable feature flag evaluation system
 * for experimental features (Template Gallery, Resume Roast Mode, AI Optimizer, etc.).
 * Supports local storage overrides, environment default overrides, user target attributes,
 * and event subscription for live UI updates.
 */

export type FlagCategory = 'experimental' | 'beta' | 'ui' | 'ai' | 'analytics'

export interface FeatureFlagUserContext {
  userId?: string
  role?: 'user' | 'admin' | 'maintainer'
  email?: string
  tier?: 'free' | 'pro' | 'enterprise'
  attributes?: Record<string, string | number | boolean>
}

export interface FeatureFlag {
  /** Unique key identifying the feature flag */
  key: string
  /** Human readable name of the feature */
  name: string
  /** Detailed description of what this feature enables */
  description: string
  /** Default enabled state if no override is present */
  enabledByDefault: boolean
  /** Indicates if this feature is considered experimental */
  experimental: boolean
  /** Category tag for grouping in UI/admin tools */
  category: FlagCategory
  /** Optional percentage rollout threshold (0-100) */
  rolloutPercentage?: number
  /** Restrict flag enablement to specific roles */
  allowedRoles?: Array<'user' | 'admin' | 'maintainer'>
  /** Date when the flag was introduced */
  createdAt: string
  /** Optional documentation link for contributors */
  docUrl?: string
}

export interface FeatureFlagOverrideMap {
  [flagKey: string]: boolean
}

/** Built-in feature flags dictionary */
export const DEFAULT_FEATURE_FLAGS: Record<string, FeatureFlag> = {
  roast_mode: {
    key: 'roast_mode',
    name: 'Resume Roast Mode',
    description: 'Enables humorously brutal AI resume roasting feedback mode.',
    enabledByDefault: true,
    experimental: true,
    category: 'experimental',
    createdAt: '2026-08-01',
    docUrl: 'docs/FEATURE_FLAGS.md#roast_mode',
  },
  template_gallery: {
    key: 'template_gallery',
    name: 'Resume Template Gallery',
    description: 'Allows users to pick from curated resume template designs.',
    enabledByDefault: true,
    experimental: true,
    category: 'ui',
    createdAt: '2026-08-05',
  },
  ai_bullet_optimizer: {
    key: 'ai_bullet_optimizer',
    name: 'AI Bullet Point Optimizer',
    description: 'Smart AI action verb and metrics suggestions for bullet points.',
    enabledByDefault: true,
    experimental: false,
    category: 'ai',
    createdAt: '2026-08-10',
  },
  what_if_simulator: {
    key: 'what_if_simulator',
    name: 'What-If Score Simulator',
    description: 'Interactive projected score calculator based on missing skill selection.',
    enabledByDefault: true,
    experimental: true,
    category: 'experimental',
    createdAt: '2026-08-15',
  },
  skills_matrix_v2: {
    key: 'skills_matrix_v2',
    name: 'Enhanced Skills Matrix V2',
    description: 'Advanced breakdown of hard vs soft skills and job market relevance.',
    enabledByDefault: false,
    experimental: true,
    category: 'beta',
    createdAt: '2026-08-20',
  },
  admin_panel: {
    key: 'admin_panel',
    name: 'Admin Dictionary & Track Management',
    description: 'Live CRUD management panels for skills dictionary and career tracks.',
    enabledByDefault: true,
    experimental: false,
    category: 'ui',
    allowedRoles: ['admin', 'maintainer'],
    createdAt: '2026-08-25',
  },
}

const STORAGE_KEY = 'ai_resume_analyzer_feature_flag_overrides'
type Listener = (flags: Record<string, boolean>) => void

class FeatureFlagService {
  private flags: Record<string, FeatureFlag> = { ...DEFAULT_FEATURE_FLAGS }
  private overrides: FeatureFlagOverrideMap = {}
  private listeners: Set<Listener> = new Set()

  constructor() {
    this.loadOverrides()
  }

  /** Load persistent flag overrides from localStorage if available */
  private loadOverrides(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        this.overrides = JSON.parse(raw)
      }
    } catch {
      this.overrides = {}
    }
  }

  /** Persist overrides to localStorage */
  private saveOverrides(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides))
    } catch {
      // Ignore storage errors in test / restricted environments
    }
  }

  /** Notify all subscribers when flags or overrides change */
  private notify(): void {
    const states = this.getAllEvaluatedStates()
    this.listeners.forEach((listener) => listener(states))
  }

  /** Register a custom feature flag dynamically */
  public registerFlag(flag: FeatureFlag): void {
    this.flags[flag.key] = flag
    this.notify()
  }

  /** Unregister a feature flag */
  public unregisterFlag(key: string): void {
    delete this.flags[key]
    delete this.overrides[key]
    this.saveOverrides()
    this.notify()
  }

  /** Evaluate if a feature flag is enabled for a given user context */
  public isEnabled(key: string, context?: FeatureFlagUserContext): boolean {
    // 1. LocalStorage override takes top priority
    if (key in this.overrides) {
      return this.overrides[key]
    }

    const flag = this.flags[key]
    if (!flag) {
      return false
    }

    // 2. Role restriction check
    if (flag.allowedRoles && flag.allowedRoles.length > 0) {
      if (!context?.role || !flag.allowedRoles.includes(context.role)) {
        return false
      }
    }

    // 3. Rollout percentage check if defined
    if (typeof flag.rolloutPercentage === 'number' && context?.userId) {
      const hash = this.simpleHash(`${key}:${context.userId}`)
      const bucket = hash % 100
      if (bucket >= flag.rolloutPercentage) {
        return false
      }
    }

    // 4. Fallback to flag default
    return flag.enabledByDefault
  }

  /** Set an override value for a feature flag */
  public setOverride(key: string, enabled: boolean | null): void {
    if (enabled === null) {
      delete this.overrides[key]
    } else {
      this.overrides[key] = enabled
    }
    this.saveOverrides()
    this.notify()
  }

  /** Clear all stored flag overrides */
  public resetAllOverrides(): void {
    this.overrides = {}
    this.saveOverrides()
    this.notify()
  }

  /** Get all registered feature flags */
  public getFlags(): FeatureFlag[] {
    return Object.values(this.flags)
  }

  /** Get current override map */
  public getOverrides(): FeatureFlagOverrideMap {
    return { ...this.overrides }
  }

  /** Get evaluated boolean state for all flags */
  public getAllEvaluatedStates(context?: FeatureFlagUserContext): Record<string, boolean> {
    const result: Record<string, boolean> = {}
    Object.keys(this.flags).forEach((key) => {
      result[key] = this.isEnabled(key, context)
    })
    return result
  }

  /** Subscribe to flag status changes */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Export configuration as JSON string */
  public exportConfig(): string {
    return JSON.stringify({
      flags: Object.values(this.flags),
      overrides: this.overrides,
    }, null, 2)
  }

  /** Deterministic string hash for rollout percentage calculation */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return Math.abs(hash)
  }
}

export const featureFlagService = new FeatureFlagService()
