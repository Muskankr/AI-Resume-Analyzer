/**
 * Configuration for k6 load tests
 */

export default {
  // Base URL - override with environment variable
  BASE_URL: __ENV.BASE_URL || 'http://localhost:8000',
  
  // Test user credentials
  TEST_USER: __ENV.TEST_USER || 'testuser',
  TEST_PASSWORD: __ENV.TEST_PASSWORD || 'testpass123',
  
  // Auth token (will be obtained during setup)
  TOKEN: '',
  
  // Test file sizes (in bytes)
  FILE_SIZES: {
    small: 1024 * 100,    // 100KB
    medium: 1024 * 500,   // 500KB
    large: 1024 * 1024,   // 1MB
    xlarge: 1024 * 2048,  // 2MB
  },
  
  // Timeouts
  TIMEOUTS: {
    upload: '30s',
    analysis: '60s',
  },
  
  // Retry configuration
  RETRY: {
    maxAttempts: 3,
    delay: 1000,
  },
};