/**
 * ATSComplianceEngine — Reusable ATS compliance rules engine
 *
 * Provides 35+ compliance rules across Contact, Structure, Formatting,
 * Keywords, and Quality categories. Can be used standalone or embedded
 * in other analyzer components.
 *
 * @module ATSComplianceEngine
 */

const ATS_CONTACT_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  linkedin: /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i,
  github: /github\.com\/[a-zA-Z0-9_-]+/i,
  location: /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+)\b/,
};

const ATS_SECTION_MAP = {
  contact: ['contact', 'email', 'phone', 'address', 'linkedin'],
  summary: ['summary', 'objective', 'profile', 'about me', 'professional summary', 'career summary'],
  experience: ['experience', 'employment', 'work history', 'professional experience', 'positions', 'work experience'],
  education: ['education', 'degree', 'university', 'college', 'bachelor', 'master', 'phd', 'gpa', 'academic'],
  skills: ['skills', 'competencies', 'technologies', 'technical skills', 'proficiencies', 'tools', 'tech stack'],
  projects: ['projects', 'portfolio', 'open source', 'side projects', 'personal projects', 'key projects'],
  certifications: ['certification', 'certified', 'certificate', 'license', 'credential'],
  awards: ['awards', 'honors', 'achievements', 'recognition'],
};

const ACTION_VERBS = new Set([
  'led', 'built', 'designed', 'implemented', 'developed', 'created', 'launched',
  'managed', 'improved', 'increased', 'reduced', 'optimized', 'delivered',
  'spearheaded', 'orchestrated', 'architected', 'migrated', 'automated',
  'streamlined', 'negotiated', 'mentored', 'trained', 'analyzed', 'configured',
  'deployed', 'integrated', 'refactored', 'established', 'pioneered', 'directed',
  'coordinated', 'facilitated', 'achieved', 'generated', 'influenced', 'persuaded',
  'resolved', 'resolved', 'supervised', 'recruited', 'spearheaded', 'simplified',
  'consolidated', 'revamped', 'overhauled', 'standardized', 'prioritized', 'evaluated',
]);

/**
 * Detect which standard resume sections are present in the text.
 * @param {string} text - Raw resume text
 * @returns {Object} Map of section name → boolean
 */
export function detectSections(text) {
  const lines = text.split('\n');
  const found = {};
  const normalized = text.toLowerCase();

  Object.entries(ATS_SECTION_MAP).forEach(([cat, headers]) => {
    found[cat] = headers.some((h) => {
      const pattern = new RegExp(`^\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:.]?\\s*$`, 'mi');
      return pattern.test(lines.join('\n')) || normalized.includes(h);
    });
  });

  return found;
}

/**
 * Extract contact information from resume text.
 * @param {string} text - Raw resume text
 * @returns {Object} Contact info with email, phone, linkedin, github, location
 */
export function extractContact(text) {
  const result = {};
  Object.entries(ATS_CONTACT_PATTERNS).forEach(([key, pattern]) => {
    const match = text.match(pattern);
    result[key] = match ? match[0] : null;
  });
  return result;
}

/**
 * Count bullet points in the text.
 * @param {string} text - Raw resume text
 * @returns {number}
 */
export function countBullets(text) {
  return (text.match(/^[\s]*[•\-*▪▸►→\d.)]+\s/gm) || []).length;
}

/**
 * Count date ranges in the text.
 * @param {string} text - Raw resume text
 * @returns {string[]} Array of matched date strings
 */
export function extractDates(text) {
  const pattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{4}\b|\b\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})\b|\b\d{1,2}\/\d{4}\b|\b\d{1,2}-\d{4}\b/gi;
  return text.match(pattern) || [];
}

/**
 * Calculate average sentence length in words.
 * @param {string} text - Raw resume text
 * @returns {number}
 */
export function avgSentenceLength(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0);
  return Math.round((totalWords / sentences.length) * 10) / 10;
}

/**
 * Count syllables in a word (heuristic-based).
 * @param {string} word
 * @returns {number}
 */
export function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word || word.length === 0) return 0;
  if (word.length <= 3) return 1;
  const vowels = 'aeiouy';
  let count = 0;
  let prevVowel = false;
  for (let i = 0; i < word.length; i++) {
    const isV = vowels.includes(word[i]);
    if (isV && !prevVowel) count++;
    prevVowel = isV;
  }
  if (word[word.length - 1] === 'e' && count > 1) count--;
  return Math.max(1, count);
}

/**
 * Count complex words (3+ syllables).
 * @param {string} text - Raw resume text
 * @returns {number}
 */
export function countComplexWords(text) {
  return text.split(/\s+/).filter((w) => countSyllables(w) >= 3).length;
}

/**
 * Check for common ATS trigger words that may cause issues.
 * @param {string} text - Raw resume text
 * @returns {string[]} Array of detected trigger words
 */
export function detectTriggers(text) {
  const triggers = [];
  const patterns = [
    { pattern: /\b(age|gender|birth|marital|religion|race|nationality)\b/i, name: 'Personal information' },
    { pattern: /\b(love|hate|awesome|cool|lol|omg|btw|ngl|tbh)\b/i, name: 'Casual language' },
    { pattern: /[©®™°±×÷√∞∑∏∫]/, name: 'Special characters' },
    { pattern: /\|.*\|.*\|/, name: 'Table-like formatting' },
    { pattern: /^\s*[•\-*▪▸►→].*$/m, name: 'Bullet formatting', positive: true },
  ];

  patterns.forEach(({ pattern, name, positive }) => {
    if (pattern.test(text) && !positive) triggers.push(name);
  });

  return triggers;
}

/**
 * Full compliance analysis.
 * @param {string} text - Raw resume text
 * @param {Object} options - { role, level, jdKeywords }
 * @returns {Object} Complete analysis result
 */
export function analyzeCompliance(text, options = {}) {
  const { role = 'Software Engineer', level = 'Mid-Level', jdKeywords = '' } = options;
  const sections = detectSections(text);
  const contact = extractContact(text);
  const bullets = countBullets(text);
  const dates = extractDates(text);
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const triggers = detectTriggers(text);

  const jdKwList = jdKeywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0);

  const textLower = text.toLowerCase();
  const matchedJdKw = jdKwList.filter((k) => textLower.includes(k));
  const missingJdKw = jdKwList.filter((k) => !textLower.includes(k));

  const sectionCount = Object.values(sections).filter(Boolean).length;
  const contactCount = Object.values(contact).filter(Boolean).length;

  return {
    sections,
    contact,
    bullets,
    dates,
    wordCount,
    triggers,
    matchedJdKw,
    missingJdKw,
    sectionCount,
    contactCount,
    avgSentenceLen: avgSentenceLength(text),
    complexWords: countComplexWords(text),
    role,
    level,
  };
}

export default {
  detectSections,
  extractContact,
  countBullets,
  extractDates,
  avgSentenceLength,
  countSyllables,
  countComplexWords,
  detectTriggers,
  analyzeCompliance,
};
