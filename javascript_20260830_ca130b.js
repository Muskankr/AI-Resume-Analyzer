/**
 * k6 Load Test Script for Resume Analysis Pipeline
 * Tests /api/upload/ endpoint under various load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { generateTestResume, getRandomFile } from './utils/helpers.js';
import config from './utils/config.js';

// Custom metrics
const uploadSuccessRate = new Rate('upload_success_rate');
const uploadDuration = new Trend('upload_duration');
const errorCount = new Counter('error_count');
const totalRequests = new Counter('total_requests');

// Load test data
const testFiles = new SharedArray('test_files', function () {
  return [
    { name: 'resume1.pdf', size: 1024 * 200 },  // 200KB
    { name: 'resume2.pdf', size: 1024 * 500 },  // 500KB
    { name: 'resume3.pdf', size: 1024 * 1024 }, // 1MB
    { name: 'resume4.pdf', size: 1024 * 2048 }, // 2MB
  ];
});

// Test configurations
const STAGES = {
  smoke: [
    { duration: '1m', target: 2 },
    { duration: '1m', target: 5 },
    { duration: '1m', target: 0 },
  ],
  load: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 20 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  spike: [
    { duration: '1m', target: 10 },
    { duration: '1m', target: 0 },
    { duration: '10s', target: 200 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  soak: [
    { duration: '5m', target: 20 },
    { duration: '30m', target: 50 },
    { duration: '5m', target: 0 },
  ],
};

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.05'],
    upload_success_rate: ['rate>0.95'],
    upload_duration: ['p(90)<3000'],
    error_count: ['count<10'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const userType = Math.random();
  
  if (userType < 0.7) {
    testStandardUpload();
  } else if (userType < 0.9) {
    testUploadWithJobDescription();
  } else {
    testBulkUpload();
  }
  
  sleep(Math.random() * 2 + 1);
}

function testStandardUpload() {
  const file = getRandomFile(testFiles);
  const url = `${config.BASE_URL}/api/upload/`;
  
  const formData = generateTestResume(file);
  
  const params = {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${config.TOKEN}`,
    },
    tags: { name: 'upload_resume' },
  };
  
  const startTime = Date.now();
  const response = http.post(url, formData, params);
  const duration = Date.now() - startTime;
  
  totalRequests.add(1);
  uploadDuration.add(duration);
  
  const success = check(response, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'has score': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.score !== undefined && body.score !== null;
      } catch (e) {
        return false;
      }
    },
    'has skills_found': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.skills_found);
      } catch (e) {
        return false;
      }
    },
    'response time < 5s': () => duration < 5000,
  });
  
  uploadSuccessRate.add(success);
  
  if (!success) {
    errorCount.add(1);
    console.error(`Request failed: ${response.status} - ${response.body}`);
  }
}

function testUploadWithJobDescription() {
  const file = getRandomFile(testFiles);
  const url = `${config.BASE_URL}/api/upload/`;
  
  const formData = generateTestResume(file);
  formData.append('job_description', 'We are looking for a Senior Software Engineer with 5+ years of experience in Python, Django, React, and AWS. The ideal candidate should have experience with microservices, Docker, Kubernetes, and CI/CD pipelines.');
  
  const params = {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${config.TOKEN}`,
    },
    tags: { name: 'upload_with_job_description' },
  };
  
  const startTime = Date.now();
  const response = http.post(url, formData, params);
  const duration = Date.now() - startTime;
  
  totalRequests.add(1);
  uploadDuration.add(duration);
  
  const success = check(response, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'has ATS score': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ats_score !== undefined;
      } catch (e) {
        return false;
      }
    },
    'has suggestions': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.suggestions);
      } catch (e) {
        return false;
      }
    },
  });
  
  uploadSuccessRate.add(success);
  if (!success) errorCount.add(1);
}

function testBulkUpload() {
  const url = `${config.BASE_URL}/api/upload/bulk/`;
  const formData = new FormData();
  
  const numFiles = Math.floor(Math.random() * 3) + 3;
  for (let i = 0; i < numFiles; i++) {
    const file = getRandomFile(testFiles);
    const fileData = generateTestResume(file);
    formData.append('resumes', fileData.get('resume'), `resume_${i+1}.pdf`);
  }
  
  const params = {
    headers: {
      'Authorization': `Bearer ${config.TOKEN}`,
    },
    tags: { name: 'bulk_upload' },
  };
  
  const startTime = Date.now();
  const response = http.post(url, formData, params);
  const duration = Date.now() - startTime;
  
  totalRequests.add(1);
  uploadDuration.add(duration);
  
  const success = check(response, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'has results array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results);
      } catch (e) {
        return false;
      }
    },
  });
  
  uploadSuccessRate.add(success);
  if (!success) errorCount.add(1);
}

export function setup() {
  const loginUrl = `${config.BASE_URL}/api/auth/login/`;
  const payload = JSON.stringify({
    username: config.TEST_USER,
    password: config.TEST_PASSWORD,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.post(loginUrl, payload, params);
  
  if (response.status !== 200) {
    throw new Error(`Failed to authenticate: ${response.body}`);
  }
  
  const token = JSON.parse(response.body).access;
  
  return {
    token: token,
  };
}

export function teardown(data) {
  console.log('Test completed. Cleaning up...');
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  const testType = __ENV.TEST_TYPE || 'load';
  
  return {
    [`results/reports/k6-${testType}-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': `
╔════════════════════════════════════════════════════════════════════╗
║                    k6 Load Test Results                          ║
╠════════════════════════════════════════════════════════════════════╣
║ Test Type: ${testType.padEnd(48)}║
║ Timestamp: ${timestamp.padEnd(48)}║
╠════════════════════════════════════════════════════════════════════╣
║ Total Requests: ${data.metrics.http_reqs.values.count.toString().padEnd(42)}║
║ Success Rate: ${(data.metrics.upload_success_rate.values.rate * 100).toFixed(2)}%${' '.padEnd(37)}║
║ Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%${' '.padEnd(38)}║
╠════════════════════════════════════════════════════════════════════╣
║ Response Times (ms):                                             ║
║   Avg: ${data.metrics.http_req_duration.values.avg.toFixed(0).padEnd(42)}║
║   P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(0).padEnd(42)}║
║   P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(0).padEnd(42)}║
║   Max: ${data.metrics.http_req_duration.values.max.toFixed(0).padEnd(42)}║
╠════════════════════════════════════════════════════════════════════╣
║ VUs: ${data.metrics.vus.values.value.padEnd(51)}║
║ Iterations: ${data.metrics.iterations.values.count.toString().padEnd(42)}║
╚════════════════════════════════════════════════════════════════════╝
    `,
  };
}