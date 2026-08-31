# Password Hashing Audit — Issue #478

## Scope
Reviewed how user passwords are hashed, stored, and verified across
signup, login, and password-reset flows.

## Findings

- The project uses Django's built-in `django.contrib.auth.models.User`.
- No `PASSWORD_HASHERS` override existed previously, so Django's
  default hasher list applied — headed by `PBKDF2PasswordHasher`
  (SHA256), which on Django >=4.2 uses 720,000+ iterations. This
  already meets OWASP's minimum recommendation and was **not** weak
  or outdated.
- Signup (`SignupSerializer.create`) uses
  `User.objects.create_user(**validated_data)`, which calls Django's
  `set_password()` internally — passwords are always hashed, never
  stored in plaintext.
- Password reset (`PasswordResetConfirmView`) calls
  `user.set_password(new_password)` — also correctly hashed.
- No plaintext or reversibly-encrypted password storage was found
  anywhere in the codebase.

## Change made

`PASSWORD_HASHERS` in `settings.py` now explicitly lists
`Argon2PasswordHasher` first (OWASP's top recommendation), keeping
`PBKDF2PasswordHasher` / `PBKDF2SHA1PasswordHasher` as fallback
verifiers.

## Migration path for existing users

No bulk migration is required. Django checks a user's stored hash
against the *first* hasher in `PASSWORD_HASHERS` on every login; if it
was hashed with an older algorithm still present in the list (PBKDF2),
it verifies successfully and is transparently re-hashed to Argon2
before the request completes. Users who never log in again keep their
PBKDF2 hash, which remains valid and secure.

## Dependency

Added `argon2-cffi` to `backend/requirements.txt` (required by Django
for `Argon2PasswordHasher` to function).

# Signup Abuse Detection — Issue #972

## Scope
Implemented a mechanism to detect, flag, and prevent abusive signup volume from identical IP addresses without negatively impacting legitimate shared network environments (e.g., universities, libraries).

## Findings
- Previously, signups were throttled blindly by DRF's `AnonRateThrottle`, which returns a 429 and drops requests.
- This didn't allow for graduated responses, maintaining logs for manual review, or safely bypassing the throttle for shared networks.

## Change made
- Added `SignupAbuseEvent` model to track and log suspicious signup attempts, with statuses: `flagged`, `throttled`, and `reviewed`.
- Added `check_signup_abuse` logic (in `analyzer/abuse_detection.py`) to the signup flow.
- Improved network evaluation: uses IP + user-agent entropy to determine if repeated signup volume is from a legitimate shared network or a bot. High-volume signups with high user-agent entropy are flagged for maintainer review but *not* blocked.

## Configuration
Controlled by the following environment variables (defined in `settings.py`):
- `SIGNUP_ABUSE_ENABLED` (default: 'True'): Master toggle.
- `SIGNUP_ABUSE_THRESHOLD` (default: 50): Number of signups allowed per window before abuse logic triggers.
- `SIGNUP_ABUSE_WINDOW_MINUTES` (default: 60): The tracking window.
- `SIGNUP_ABUSE_COOLDOWN_MINUTES` (default: 60): The cooldown period for blocking after threshold is exceeded (if not a shared network).

## Deployment & Proxy Considerations
- IP addresses are determined via `get_client_ip()` which respects `HTTP_X_FORWARDED_FOR` if your load balancer / proxy forwards it.
- Maintainers can review blocked/flagged events in the database using the `SignupAbuseEvent` model.
