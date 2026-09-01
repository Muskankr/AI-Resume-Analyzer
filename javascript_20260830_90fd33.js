/**
 * Stress Test - Gradually increase load to find breaking point
 */

import { options as baseOptions } from './analysis-test.js';
import test from './analysis-test.js';

export const options = {
  ...baseOptions,
  stages: [
    { duration: '2m', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '3m', target: 300 },
    { duration: '2m', target: 0 },
  ],
};

export default test;