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
