from pathlib import Path
import os
import sentry_sdk

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file
_env_path = BASE_DIR / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set. Add it to your .env file.")

DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.environ.get(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1"
).split(",")


# Application definition

INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'analyzer',
    
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'resume_analyzer.middleware.ContentSecurityPolicyMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # ← Add this line
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'resume_analyzer.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'resume_analyzer.wsgi.application'

SPECTACULAR_SETTINGS = {
    "TITLE": "AI Resume Analyzer API",
    "DESCRIPTION": (
        "REST API for resume analysis, job description analysis, "
        "resume comparison, user profiles, analysis history, "
        "and related services."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,

    "SECURITY": [
        {
            "bearerAuth": [],
        }
    ],

    "APPEND_COMPONENTS": {
        "securitySchemes": {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }
    },
    "COMPONENT_SPLIT_REQUEST": True,

    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,
    },
    
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password hashing: Argon2 (OWASP-recommended, winner of the Password
# Hashing Competition) is tried first for all new/changed passwords.
# PBKDF2 hashers stay listed so existing users' current PBKDF2 hashes
# still verify correctly on login. Django transparently re-hashes each
# user's password to Argon2 the moment they next log in successfully —
# no bulk migration script needed. See SECURITY_AUDIT.md for the full
# audit writeup (issue #478).
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend'
)

# Address password-reset and support mail is sent from. Overridable because the
# console backend ignores it but a real SMTP provider will not.
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL', 'noreply@ai-resume-analyzer.dev'
)

PASSWORD_RESET_TIMEOUT = 3600
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
)
WHITENOISE_MAX_AGE = 31536000  # 1 year caching for hashed static assets

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Celery configuration
CELERY_BROKER_URL = 'redis://localhost:6379/1'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/1'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

CORS_ALLOWED_ORIGINS = [
    "https://ai-resume-analyzer-nine-brown.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# The frontend is on a different origin, so any header it sets that is not one
# of the CORS-safelisted ones has to be named here or the browser's preflight
# refuses the request. `X-Analysis-Token` carries the claim that authorises a
# status poll (see analyzer.task_claims); without this the header is simply
# dropped and every poll looks unclaimed.
from corsheaders.defaults import default_headers  # noqa: E402

CORS_ALLOW_HEADERS = (*default_headers, "x-analysis-token")


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    # Every AllowAny endpoint that does real work needs a ceiling. The two
    # password-reset scopes came first (#585); the rest were added because they
    # were entirely unlimited: /api/contact/ sends an email per request,
    # /api/analyze-jd/ tokenises an unbounded body and then compares each of the
    # top 30 words against the whole skill set, and signup had nothing but the
    # CAPTCHA in front of it.
    #
    # All overridable by environment variable, because the right number depends
    # on the deployment and nobody should have to edit code to raise one.
    'DEFAULT_THROTTLE_RATES': {
        'password_reset': os.environ.get('PASSWORD_RESET_RATE', '5/hour'),
        'password_reset_confirm': os.environ.get(
            'PASSWORD_RESET_CONFIRM_RATE', '20/hour'
        ),
        'contact': os.environ.get('CONTACT_RATE', '5/hour'),
        'analyze_jd': os.environ.get('ANALYZE_JD_RATE', '30/hour'),
        'mock_interview': os.environ.get('MOCK_INTERVIEW_RATE', '30/hour'),
        'signup': os.environ.get('SIGNUP_RATE', '10/hour'),
        'skills_leaderboard': os.environ.get(
            'SKILLS_LEADERBOARD_RATE', '100/hour'
        ),
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# JWT lifetimes. These were previously inherited from SimpleJWT's defaults
# rather than chosen, which meant a 5-minute access token — fine in itself, but
# the frontend was discarding the refresh token, so a session simply stopped
# working after five minutes. Stated explicitly so the values are visible and
# reviewable rather than implied.
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=int(os.environ.get('ACCESS_TOKEN_LIFETIME_MINUTES', '15'))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=int(os.environ.get('REFRESH_TOKEN_LIFETIME_DAYS', '7'))
    ),
    # Each refresh issues a new refresh token. Limits how long a stolen one is
    # useful; the client handles rotation because it stores whatever comes back.
    'ROTATE_REFRESH_TOKENS': True,
    # Blacklisting the old token on rotation needs the token_blacklist app and
    # a migration, so it stays off here. Without it a rotated-away refresh
    # token keeps working until it expires on its own.
    'BLACKLIST_AFTER_ROTATION': False,
}

# Rate limiting: resume upload endpoint
RESUME_UPLOAD_RATE = os.environ.get('RESUME_UPLOAD_RATE', '10/hour')
# Retention (in days) for uploaded resume files and temporary storage
RESUME_RETENTION_DAYS = int(os.environ.get('RESUME_RETENTION_DAYS', '30'))

# Public URL of the frontend, used to build links that go out by email
# (currently the weekly digest unsubscribe link).
# Whether `/api/status/<task_id>/` refuses a poll that carries no claim.
#
# Defaults to on. The switch exists so the backend can be deployed ahead of a
# frontend that sends the header, and so a client mid-analysis at deploy time is
# not locked out -- not as a supported way to run. See analyzer.task_claims.
ANALYSIS_CLAIM_REQUIRED = os.environ.get('ANALYSIS_CLAIM_REQUIRED', 'true').lower() not in (
    'false',
    '0',
    'no',
)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# How long a signed unsubscribe link stays usable. Digests are weekly and
# people read email late, so this is deliberately generous.
UNSUBSCRIBE_TOKEN_MAX_AGE_DAYS = int(os.environ.get('UNSUBSCRIBE_TOKEN_MAX_AGE_DAYS', '90'))

SENTRY_DSN = os.environ.get('SENTRY_DSN')

if SENTRY_DSN:
    def sentry_before_send(event, hint):
        # Redact sensitive request bodies (resume text, uploaded PDFs, auth tokens)
        if 'request' in event:
            request = event['request']
            
            # Redact data (request body/form parameters)
            if 'data' in request and isinstance(request['data'], dict):
                redact_keys = ['file', 'resume', 'target_role', 'email', 'phone', 'address']
                for key in redact_keys:
                    if key in request['data']:
                        request['data'][key] = '[Filtered]'
            
            # Redact auth headers
            if 'headers' in request and isinstance(request['headers'], dict):
                for header_name in list(request['headers'].keys()):
                    if header_name.lower() in ('authorization', 'cookie'):
                        request['headers'][header_name] = '[Filtered]'
                        
        return event

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        before_send=sentry_before_send,
    )
# Security Headers Configuration (Issue #319)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'

