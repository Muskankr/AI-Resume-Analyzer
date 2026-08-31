# CAPTCHA Service & Bot Protection Documentation

## Overview

The **AI Resume Analyzer** platform uses an enterprise CAPTCHA integration layer supporting hCaptcha, Google reCAPTCHA v2/v3, Cloudflare Turnstile, and an accessible fallback math challenge mode.

---

## Configuration & Environment Variables

Provider site keys are configured via environment variables:

```bash
# .env / .env.local
VITE_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

---

## Server-Side Verification Protocol

Upon client challenge completion, a token is emitted and sent to the backend authentication endpoint (`/api/auth/verify-captcha/`):

```json
{
  "token": "10000000-ffff-ffff-ffff-000000000001",
  "provider": "hcaptcha",
  "siteKey": "10000000-ffff-ffff-ffff-000000000001"
}
```

Backend responds with validation status and risk score:

```json
{
  "success": true,
  "timestamp": "2026-08-31T21:24:00Z",
  "score": 0.95
}
```
