/**
 * Soak Test - Sustained load over long period
 */

import { options as baseOptions } from './analysis-test.js';
import test from './analysis-test.js';

export const options = {
  ...baseOptions,
  stages: [
    { duration: '5m', target: 20 },
    { duration: '1h', target: 50 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    ...baseOptions.thresholds,
    http_req_duration: ['p(95)<6000'],
    http_req_failed: ['rate<0.02'],
  },
};

export default test;