export const ENV_CONFIG = {
  development: {
    BACKEND_URL: 'http://127.0.0.1:8000',
  },
  staging: {
    BACKEND_URL: 'https://staging-api.airesumeanalyzer.com',
  },
  production: {
    BACKEND_URL: 'https://api.airesumeanalyzer.com',
  },
}

const getEnvMode = () => {
  const mode = import.meta.env.MODE || 'development'
  return mode as keyof typeof ENV_CONFIG
}

const currentConfig = ENV_CONFIG[getEnvMode()] || ENV_CONFIG.development

/**
 * BACKEND_URL prioritizes the explicit VITE_BACKEND_URL environment variable.
 * If not provided, it falls back to the configured URL for the current environment mode (dev/staging/prod).
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || currentConfig.BACKEND_URL
