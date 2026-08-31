/**
 * Smoke Test - Minimal load to verify system works
 * Used for CI/CD validation
 */

import { options as baseOptions } from './analysis-test.js';
import test from './analysis-test.js';

export const options = {
  ...baseOptions,
  stages: [
    { duration: '30s', target: 1 },
    { duration: '1m', target: 2 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...baseOptions.thresholds,
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default test;