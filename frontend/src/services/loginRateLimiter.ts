/**
 * Login Rate Limiter & Account Lockout Engine
 * 
 * Protects against brute-force authentication attacks by tracking repeated
 * failed login attempts by account username/email or IP address, enforcing
 * progressive lockout cooldowns, and providing a safe self-service unlock path.
 */

export interface LockoutRecord {
  identifier: string
  failedAttempts: number
  lastAttemptTimestamp: number
  lockoutExpiresAt: number | null
  unlockToken: string | null
}

export interface LockoutState {
  isLocked: boolean
  failedAttempts: number
  attemptsRemaining: number
  lockoutExpiresAt: number | null
  cooldownSecondsRemaining: number
  unlockToken: string | null
  message: string
}

export interface RateLimiterConfig {
  maxAttempts: number // e.g. 5
  lockoutDurationMs: number // e.g. 15 minutes (900000 ms)
  attemptResetWindowMs: number // e.g. 30 minutes (1800000 ms)
}

export const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  attemptResetWindowMs: 30 * 60 * 1000, // 30 minutes
}

const STORAGE_KEY = 'ai_resume_analyzer_login_lockout_records_v1'
type RateLimiterListener = (records: Record<string, LockoutRecord>) => void

class LoginRateLimiter {
  private records: Map<string, LockoutRecord> = new Map()
  private config: RateLimiterConfig = { ...DEFAULT_RATE_LIMITER_CONFIG }
  private listeners: Set<RateLimiterListener> = new Set()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: Record<string, LockoutRecord> = JSON.parse(raw)
        Object.entries(parsed).forEach(([key, rec]) => {
          this.records.set(key, rec)
        })
      }
    } catch {
      this.records.clear()
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const obj: Record<string, LockoutRecord> = {}
      this.records.forEach((rec, key) => {
        obj[key] = rec
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    } catch {
      // Storage error ignored
    }
  }

  private notify(): void {
    const obj: Record<string, LockoutRecord> = {}
    this.records.forEach((rec, key) => {
      obj[key] = rec
    })
    this.listeners.forEach((listener) => listener(obj))
  }

  public subscribe(listener: RateLimiterListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private generateUnlockToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private normalizeIdentifier(raw: string): string {
    return raw.trim().toLowerCase()
  }

  /** Gets current lockout state for a given username or IP */
  public getLockoutState(rawIdentifier: string): LockoutState {
    const id = this.normalizeIdentifier(rawIdentifier)
    const now = Date.now()
    const record = this.records.get(id)

    if (!record) {
      return {
        isLocked: false,
        failedAttempts: 0,
        attemptsRemaining: this.config.maxAttempts,
        lockoutExpiresAt: null,
        cooldownSecondsRemaining: 0,
        unlockToken: null,
        message: '',
      }
    }

    // Check if lockout has expired
    if (record.lockoutExpiresAt && now >= record.lockoutExpiresAt) {
      // Lockout expired, reset record
      this.records.delete(id)
      this.saveToStorage()
      this.notify()
      return {
        isLocked: false,
        failedAttempts: 0,
        attemptsRemaining: this.config.maxAttempts,
        lockoutExpiresAt: null,
        cooldownSecondsRemaining: 0,
        unlockToken: null,
        message: '',
      }
    }

    // Check if attempt reset window passed without reaching lockout
    if (!record.lockoutExpiresAt && now - record.lastAttemptTimestamp > this.config.attemptResetWindowMs) {
      this.records.delete(id)
      this.saveToStorage()
      this.notify()
      return {
        isLocked: false,
        failedAttempts: 0,
        attemptsRemaining: this.config.maxAttempts,
        lockoutExpiresAt: null,
        cooldownSecondsRemaining: 0,
        unlockToken: null,
        message: '',
      }
    }

    const isLocked = Boolean(record.lockoutExpiresAt && now < record.lockoutExpiresAt)
    const cooldownSecondsRemaining = isLocked && record.lockoutExpiresAt
      ? Math.ceil((record.lockoutExpiresAt - now) / 1000)
      : 0

    const attemptsRemaining = Math.max(0, this.config.maxAttempts - record.failedAttempts)

    let message = ''
    if (isLocked) {
      const minutes = Math.floor(cooldownSecondsRemaining / 60)
      const seconds = cooldownSecondsRemaining % 60
      message = `Account temporarily locked due to 5 consecutive failed login attempts. Please try again in ${minutes}m ${seconds}s or enter your unlock code.`
    } else if (record.failedAttempts > 0) {
      message = `Warning: ${record.failedAttempts} failed login attempt(s). ${attemptsRemaining} attempt(s) remaining before temporary lockout.`
    }

    return {
      isLocked,
      failedAttempts: record.failedAttempts,
      attemptsRemaining,
      lockoutExpiresAt: record.lockoutExpiresAt,
      cooldownSecondsRemaining,
      unlockToken: record.unlockToken,
      message,
    }
  }

  /** Record a failed login attempt and update lockout status */
  public recordFailedAttempt(rawIdentifier: string): LockoutState {
    const id = this.normalizeIdentifier(rawIdentifier)
    if (!id) return this.getLockoutState(id)

    const now = Date.now()
    let record = this.records.get(id)

    if (!record) {
      record = {
        identifier: id,
        failedAttempts: 1,
        lastAttemptTimestamp: now,
        lockoutExpiresAt: null,
        unlockToken: null,
      }
    } else {
      // If already locked and not expired, return current state
      if (record.lockoutExpiresAt && now < record.lockoutExpiresAt) {
        return this.getLockoutState(id)
      }

      record.failedAttempts += 1
      record.lastAttemptTimestamp = now
    }

    // Trigger lockout if max attempts reached
    if (record.failedAttempts >= this.config.maxAttempts) {
      record.lockoutExpiresAt = now + this.config.lockoutDurationMs
      record.unlockToken = this.generateUnlockToken()
    }

    this.records.set(id, record)
    this.saveToStorage()
    this.notify()

    return this.getLockoutState(id)
  }

  /** Reset attempts upon a successful login */
  public recordSuccessfulLogin(rawIdentifier: string): void {
    const id = this.normalizeIdentifier(rawIdentifier)
    if (this.records.has(id)) {
      this.records.delete(id)
      this.saveToStorage()
      this.notify()
    }
  }

  /** Self-service unlock with token verification */
  public unlockWithToken(rawIdentifier: string, token: string): boolean {
    const id = this.normalizeIdentifier(rawIdentifier)
    const record = this.records.get(id)

    if (record && record.unlockToken && record.unlockToken === token.trim()) {
      this.records.delete(id)
      this.saveToStorage()
      this.notify()
      return true
    }

    return false
  }

  /** Clear all lockout records (admin function) */
  public clearAllRecords(): void {
    this.records.clear()
    this.saveToStorage()
    this.notify()
  }
}

export const loginRateLimiter = new LoginRateLimiter()
