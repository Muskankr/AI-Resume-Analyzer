# Login Rate Limiting & Account Lockout Documentation

## Overview

To protect against credential stuffing and automated brute-force login attacks, the **AI Resume Analyzer** platform implements an account rate limiting and temporary lockout system.

---

## Security Policy Rules

1. **Maximum Failed Attempts**: 5 consecutive failed login attempts on a given account/email.
2. **Lockout Cooldown**: 15 minutes (900,000 ms) temporary lockout window upon reaching 5 failures.
3. **Attempt Reset Window**: Failed attempt counters automatically reset after 30 minutes of inactivity without triggering a lockout.
4. **Self-Service Unlock**: A 6-digit one-time unlock token is generated upon lockout, allowing legitimate users to bypass the cooldown.
5. **Successful Login Reset**: Any successful authentication immediately clears all recorded failed attempts.

---

## Technical Integration

```typescript
import { loginRateLimiter } from '../services/loginRateLimiter'

// Before processing login
const status = loginRateLimiter.getLockoutState(username)
if (status.isLocked) {
  throw new Error(status.message)
}

// On failed authentication
const updatedStatus = loginRateLimiter.recordFailedAttempt(username)

// On successful authentication
loginRateLimiter.recordSuccessfulLogin(username)
```
