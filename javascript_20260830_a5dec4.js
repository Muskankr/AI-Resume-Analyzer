/**
 * Spike Test - Sudden massive increase in load
 */

import { options as baseOptions } from './analysis-test.js';
import test from './analysis-test.js';

export const options = {
  ...baseOptions,
  stages: [
    { duration: '1m', target: 5 },
    { duration: '10s', target: 5 },
    { duration: '10s', target: 0 },
    { duration: '10s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 },
    { duration: '10s', target: 200 },
    { duration: '1m', target: 200 },
    { duration: '10s', target: 0 },
    { duration: '1m', target: 5 },
  ],
};

export default test;