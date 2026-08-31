/**
 * Helper functions for k6 load tests
 */

import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Generate random resume data
export function generateTestResume(file) {
  const formData = new FormData();
  
  // Create a mock PDF file
  const mockFile = {
    name: file.name || 'resume.pdf',
    content: generateMockPDFContent(),
    type: 'application/pdf',
  };
  
  formData.append('resume', mockFile);
  return formData;
}

// Generate mock PDF content
function generateMockPDFContent() {
  const candidates = [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      skills: ['Python', 'Django', 'React', 'AWS', 'Docker'],
      experience: '5 years',
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1 (555) 987-6543',
      skills: ['JavaScript', 'Node.js', 'Vue.js', 'MongoDB', 'Kubernetes'],
      experience: '3 years',
    },
    {
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      phone: '+1 (555) 456-7890',
      skills: ['Java', 'Spring Boot', 'Angular', 'PostgreSQL', 'Azure'],
      experience: '7 years',
    },
  ];
  
  const candidate = randomItem(candidates);
  
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT
/F1 24 Tf
100 700 Td
(${candidate.name}) Tj
/F1 16 Tf
100 670 Td
(Email: ${candidate.email}) Tj
100 650 Td
(Phone: ${candidate.phone}) Tj
100 630 Td
(Experience: ${candidate.experience}) Tj
100 610 Td
(Skills: ${candidate.skills.join(', ')}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000000 00000 n
0000000000 00000 n
0000000000 00000 n
0000000000 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
0000000000
%%EOF`;
}

// Get random file from list
export function getRandomFile(files) {
  return files[Math.floor(Math.random() * files.length)];
}

// Sleep function
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate random string
export function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}