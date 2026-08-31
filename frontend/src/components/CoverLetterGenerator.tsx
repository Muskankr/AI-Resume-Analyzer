/**
 * CoverLetterGenerator — React component
 *
 * Generates tailored cover letters from resume text + job description:
 *  - Multi-section template engine with role-aware phrasing
 *  - Skill matching and keyword injection from JD
 *  - Tone selector (professional / enthusiastic / concise)
 *  - Copy-to-clipboard and download as .txt
 *  - LocalStorage-backed generation history
 */

import { useState, useCallback, useRef } from 'react';
import './CoverLetterGenerator.css';

// ===== Role-Specific Templates =====
interface RoleTemplate {
  greetings: string[];
  opener: string[];
  body1: string[];
  body2: string[];
  closing: string[];
  signoffs: string[];
}

const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  'Software Engineer': {
    greetings: ['Dear Hiring Manager,', 'To the Engineering Team,', 'Dear [Company] Engineering Team,'],
    opener: [
      'I am writing to express my strong interest in the {role} position at {company}.',
      'I am excited to apply for the {role} opportunity at {company}.',
      'When I saw the {role} opening at {company}, I knew I had to apply.',
    ],
    body1: [
      'With my background in {skills}, I am well-prepared to contribute to your engineering team from day one.',
      'My experience with {skills} aligns closely with the requirements of this role, and I am eager to bring this expertise to {company}.',
      'Throughout my career, I have developed deep proficiency in {skills}, which I believe makes me an excellent fit for this position.',
    ],
    body2: [
      'I am particularly drawn to {company} because of your commitment to building scalable, impactful technology. I thrive in environments where clean code, collaboration, and continuous improvement are valued.',
      'What excites me most about {company} is the opportunity to work on challenging problems at scale. I am passionate about writing maintainable code and contributing to products that make a real difference.',
      'I admire {company}\'s approach to innovation and engineering excellence. I am looking for a role where I can leverage my skills in {skills} to drive meaningful technical outcomes.',
    ],
    closing: [
      'I would welcome the opportunity to discuss how my skills and experience can contribute to your team\'s success.',
      'I am confident that my technical background and passion for software engineering would make me a valuable addition to your team.',
      'I look forward to the possibility of contributing to {company}\'s continued growth and success.',
    ],
    signoffs: ['Best regards,', 'Sincerely,', 'Thank you for your consideration,'],
  },
  'Data Analyst': {
    greetings: ['Dear Hiring Manager,', 'To the Data Team,', 'Dear [Company] Analytics Team,'],
    opener: [
      'I am writing to express my interest in the {role} position at {company}.',
      'I am thrilled to apply for the {role} role at {company}.',
      'The {role} opportunity at {company} caught my attention immediately.',
    ],
    body1: [
      'My expertise in {skills} has equipped me to transform complex datasets into actionable business insights that drive strategic decisions.',
      'With hands-on experience in {skills}, I have a proven track record of delivering data-driven solutions that improve business outcomes.',
      'Throughout my career, I have leveraged {skills} to uncover trends, build dashboards, and present findings that directly influenced company strategy.',
    ],
    body2: [
      'I am drawn to {company} because of your data-driven culture. I believe that every business decision should be backed by evidence, and I am passionate about making data accessible and actionable for all stakeholders.',
      'What excites me about {company} is the scale of data challenges you tackle. I thrive on turning raw data into stories that move the needle, and I am eager to bring that energy to your analytics team.',
      'I admire {company}\'s commitment to leveraging data for impact. I am looking for an environment where I can apply my analytical skills to solve real-world problems at scale.',
    ],
    closing: [
      'I would love to discuss how my data expertise can contribute to {company}\'s analytics goals.',
      'I am excited about the possibility of joining your team and contributing to data-driven decision-making at {company}.',
      'I look forward to exploring how my background in data analysis aligns with your team\'s needs.',
    ],
    signoffs: ['Best regards,', 'Sincerely,', 'Thank you for your time,'],
  },
  'Product Manager': {
    greetings: ['Dear Hiring Manager,', 'To the Product Team,', 'Dear [Company] Product Leadership,'],
    opener: [
      'I am writing to express my enthusiasm for the {role} position at {company}.',
      'I am excited to apply for the {role} opportunity at {company}.',
      'The {role} role at {company} represents the exact kind of challenge I am looking for.',
    ],
    body1: [
      'My experience in {skills} has given me a strong foundation in translating user needs into product strategies that deliver measurable results.',
      'With expertise in {skills}, I have successfully launched and iterated on products that improved user engagement and drove business growth.',
      'I bring a unique combination of technical understanding and business acumen, with hands-on experience in {skills}.',
    ],
    body2: [
      'I am drawn to {company} because of your mission to solve meaningful problems through technology. I believe great products are built at the intersection of user empathy, data insight, and cross-functional collaboration.',
      'What excites me about {company} is the opportunity to work on products that impact millions of users. I am passionate about finding the right problems to solve and rallying teams around a clear vision.',
      'I admire {company}\'s product-led approach. I am looking for a role where I can combine strategic thinking with hands-on execution to ship products that matter.',
    ],
    closing: [
      'I would welcome the chance to discuss how my product management experience can drive impact at {company}.',
      'I am confident that my approach to product development — data-informed, user-centric, and execution-focused — would be a strong asset to your team.',
      'I look forward to the opportunity to contribute to {company}\'s product roadmap and user experience.',
    ],
    signoffs: ['Best regards,', 'Sincerely,', 'Thank you for your consideration,'],
  },
  'Default': {
    greetings: ['Dear Hiring Manager,', 'To the Recruitment Team,', 'Dear [Company] Team,'],
    opener: [
      'I am writing to express my interest in the {role} position at {company}.',
      'I am excited to apply for the {role} opportunity at {company}.',
      'The {role} role at {company} is a perfect match for my skills and experience.',
    ],
    body1: [
      'My background in {skills} has prepared me to make meaningful contributions to your team.',
      'With proficiency in {skills}, I am confident in my ability to excel in this role and add value from day one.',
      'Throughout my career, I have developed strong capabilities in {skills} that directly align with this position\'s requirements.',
    ],
    body2: [
      'I am drawn to {company} because of your reputation for excellence and innovation. I am looking for an environment where I can grow professionally while making a real impact.',
      'What excites me about {company} is the opportunity to work with talented people on challenging problems. I thrive in collaborative environments where I can continuously learn and contribute.',
      'I admire {company}\'s values and approach to building great products. I am eager to bring my skills and experience to your organization.',
    ],
    closing: [
      'I would welcome the opportunity to discuss how my qualifications align with your team\'s needs.',
      'I am confident that my skills and experience would make me a strong addition to your team.',
      'I look forward to the possibility of contributing to {company}\'s continued success.',
    ],
    signoffs: ['Best regards,', 'Sincerely,', 'Thank you for your consideration,'],
  },
};

// ===== Tone Presets =====
interface TonePreset {
  label: string;
  description: string;
  modifiers: {
    openerIntensity: number;
    bodyLength: number;
    formality: string;
  };
}

const TONE_PRESETS: Record<string, TonePreset> = {
  professional: {
    label: 'Professional',
    description: 'Balanced, polished, and respectful',
    modifiers: { openerIntensity: 1, bodyLength: 1, formality: 'formal' },
  },
  enthusiastic: {
    label: 'Enthusiastic',
    description: 'High energy, passionate, and eager',
    modifiers: { openerIntensity: 2, bodyLength: 1.2, formality: 'semi-formal' },
  },
  concise: {
    label: 'Concise',
    description: 'Short, direct, and to the point',
    modifiers: { openerIntensity: 0.8, bodyLength: 0.7, formality: 'formal' },
  },
};

// ===== Keyword Extraction =====
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
    'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
    'they', 'them', 'their', 'what', 'which', 'who', 'whom',
  ]);
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    const clean = w.replace(/[^a-z0-9+#]/g, '');
    if (clean.length > 2 && !stopWords.has(clean)) {
      freq[clean] = (freq[clean] || 0) + 1;
    }
  });
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 12);
}

function extractCompanyMention(jd: string): string {
  const patterns = [
    /at\s+([A-Z][A-Za-z&\s]{2,20}?)(?:\s|,|\.|:)/,
    /join\s+([A-Z][A-Za-z&\s]{2,20}?)(?:\s|,|\.|:)/,
    /([A-Z][A-Za-z]{2,20})\s+is\s+looking/,
    /([A-Z][A-Za-z]{2,20})\s+team/,
  ];
  for (const pat of patterns) {
    const m = jd.match(pat);
    if (m && m[1]) return m[1].trim();
  }
  return 'your company';
}

// ===== Cover Letter Generation =====
function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  targetRole: string,
  tone: string,
  companyName: string,
): string {
  const template = ROLE_TEMPLATES[targetRole] || ROLE_TEMPLATES['Default'];
  const toneConfig = TONE_PRESETS[tone] || TONE_PRESETS['professional'];

  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = jobDescription ? extractKeywords(jobDescription) : [];
  const allKeywords = [...new Set([...resumeKeywords, ...jdKeywords])].slice(0, 6);

  const skillsPhrase = allKeywords.length > 0
    ? allKeywords.slice(0, 5).join(', ')
    : 'software development, problem-solving, and teamwork';

  const company = companyName || extractCompanyMention(jobDescription) || 'your company';

  const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  // Build sections
  const greeting = rand(template.greetings);
  const opener = rand(template.opener)
    .replace('{role}', targetRole)
    .replace('{company}', company);

  let body1 = rand(template.body1).replace('{skills}', skillsPhrase);
  let body2 = rand(template.body2).replace('{company}', company).replace('{skills}', skillsPhrase);

  // Tone adjustments
  if (toneConfig.modifiers.bodyLength < 1) {
    // Concise mode: trim sentences
    body1 = body1.replace(/\.\s.*$/, '.');
    body2 = body2.replace(/\.\s.*$/, '.');
  }

  if (toneConfig.modifiers.formality === 'semi-formal') {
    // Enthusiastic: add energy
    body1 = body1.replace('I am confident', 'I am genuinely excited');
    body2 = body2.replace('I admire', 'I am truly inspired by');
  }

  const closing = rand(template.closing)
    .replace('{company}', company);
  const signoff = rand(template.signoffs);

  // Add JD-specific paragraph if JD is long enough
  let jdParagraph = '';
  if (jobDescription.length > 100) {
    const jdTopSkills = jdKeywords.slice(0, 3);
    if (jdTopSkills.length > 0) {
      jdParagraph = `\n\nI noticed your emphasis on ${jdTopSkills.join(', ')} in the job description, and I am particularly excited about these areas. In my recent work, I have applied these skills to deliver impactful results that I am eager to bring to your team.`;
    }
  }

  // Build final letter
  const letter = [
    greeting,
    '',
    opener,
    '',
    body1,
    '',
    body2,
    jdParagraph,
    '',
    closing,
    '',
    signoff,
    '[Your Name]',
    '[Your Email] | [Your Phone]',
    '[Your LinkedIn / Portfolio]',
  ].join('\n');

  return letter.trim();
}

// ===== History =====
interface HistoryEntry {
  id: string;
  timestamp: number;
  role: string;
  tone: string;
  company: string;
  preview: string;
  full: string;
}

function loadLetterHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem('clg_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLetterHistory(history: HistoryEntry[]): void {
  try {
    localStorage.setItem('clg_history', JSON.stringify(history.slice(-20)));
  } catch { /* ignore */ }
}

// ===== Component =====
export function CoverLetterGenerator() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [tone, setTone] = useState('professional');
  const [companyName, setCompanyName] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadLetterHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const letterRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = useCallback(() => {
    if (!resumeText.trim()) {
      alert('Please paste your resume text first.');
      return;
    }
    setGenerating(true);

    setTimeout(() => {
      const letter = generateCoverLetter(resumeText, jobDescription, targetRole, tone, companyName);
      setGeneratedLetter(letter);
      setCopied(false);

      const entry: HistoryEntry = {
        id: Date.now().toString(36),
        timestamp: Date.now(),
        role: targetRole,
        tone,
        company: companyName || 'Unknown',
        preview: letter.substring(0, 120) + '...',
        full: letter,
      };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      saveLetterHistory(updated);
      setGenerating(false);
    }, 500);
  }, [resumeText, jobDescription, targetRole, tone, companyName, history]);

  const handleCopy = useCallback(() => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedLetter]);

  const handleDownload = useCallback(() => {
    if (!generatedLetter) return;
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${targetRole.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedLetter, targetRole]);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setGeneratedLetter(entry.full);
    setTargetRole(entry.role);
    setTone(entry.tone);
    setCompanyName(entry.company);
    setShowHistory(false);
    setCopied(false);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveLetterHistory([]);
  }, []);

  return (
    <div className="clg-container">
      <header className="clg-header">
        <h1>✉️ Cover Letter Generator</h1>
        <p>Paste your resume and a job description to generate a tailored, role-specific cover letter in seconds.</p>
        <span className="clg-badge">AI-Powered Template Engine v1.0</span>
      </header>

      {/* Config Row */}
      <div className="clg-config-row">
        <div className="clg-config-field">
          <label htmlFor="clgTargetRole">Target Role</label>
          <select id="clgTargetRole" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
            <option>Software Engineer</option>
            <option>Data Analyst</option>
            <option>Product Manager</option>
            <option>Frontend Developer</option>
            <option>Backend Developer</option>
            <option>DevOps Engineer</option>
            <option>Full Stack Developer</option>
            <option>Machine Learning Engineer</option>
            <option>Data Scientist</option>
            <option>Mobile Developer</option>
          </select>
        </div>
        <div className="clg-config-field">
          <label htmlFor="clgTone">Tone</label>
          <select id="clgTone" value={tone} onChange={(e) => setTone(e.target.value)}>
            {Object.keys(TONE_PRESETS).map((k) => (
              <option key={k} value={k}>{TONE_PRESETS[k].label} — {TONE_PRESETS[k].description}</option>
            ))}
          </select>
        </div>
        <div className="clg-config-field">
          <label htmlFor="clgCompany">Company Name (optional)</label>
          <input
            id="clgCompany"
            type="text"
            placeholder="e.g. Google, Stripe, Acme Inc."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
      </div>

      {/* Input Panels */}
      <div className="clg-two-col">
        <div className="clg-panel">
          <h3 className="clg-section-title">📄 Your Resume Text</h3>
          <textarea
            className="clg-textarea"
            placeholder="Paste your resume text here...&#10;&#10;Include your skills, experience, education, and projects."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={12}
          />
          <div className="clg-char-count">{resumeText.length} characters</div>
        </div>
        <div className="clg-panel">
          <h3 className="clg-section-title">💼 Job Description (optional)</h3>
          <textarea
            className="clg-textarea"
            placeholder="Paste the job description here...&#10;&#10;This helps tailor the cover letter to the specific role."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
          />
          <div className="clg-char-count">{jobDescription.length} characters</div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="clg-generate-btn"
        disabled={!resumeText.trim() || generating}
        onClick={handleGenerate}
      >
        {generating ? <><span className="clg-spinner" />Generating...</> : '✨ Generate Cover Letter'}
      </button>

      {/* Output */}
      {generatedLetter && (
        <div className="clg-output-section">
          <div className="clg-output-header">
            <h3 className="clg-section-title">📝 Generated Cover Letter</h3>
            <div className="clg-output-actions">
              <button className="clg-action-btn" onClick={handleCopy}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
              <button className="clg-action-btn" onClick={handleDownload}>
                ⬇ Download .txt
              </button>
            </div>
          </div>
          <textarea
            ref={letterRef}
            className="clg-output-text"
            readOnly
            value={generatedLetter}
            rows={20}
          />
          <div className="clg-output-meta">
            <span>{generatedLetter.split(/\s+/).length} words</span>
            <span>·</span>
            <span>{generatedLetter.split('\n').filter(l => l.trim()).length} paragraphs</span>
            <span>·</span>
            <span>{targetRole} · {TONE_PRESETS[tone]?.label}</span>
          </div>
        </div>
      )}

      {/* History */}
      <div className="clg-history-section">
        <div className="clg-history-header" onClick={() => setShowHistory(!showHistory)}>
          <h3 className="clg-section-title" style={{ margin: 0 }}>
            📚 Generation History ({history.length})
          </h3>
          <span className="clg-history-toggle">{showHistory ? '▲' : '▼'}</span>
        </div>
        {showHistory && (
          <div className="clg-history-list">
            {history.length === 0 && (
              <div className="clg-history-empty">No generated letters yet.</div>
            )}
            {history.map((entry) => (
              <div
                key={entry.id}
                className="clg-history-item"
                onClick={() => handleHistorySelect(entry)}
              >
                <div className="clg-history-item-header">
                  <span className="clg-history-role">{entry.role}</span>
                  <span className="clg-history-company">{entry.company}</span>
                  <span className="clg-history-time">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="clg-history-preview">{entry.preview}</div>
              </div>
            ))}
            {history.length > 0 && (
              <button className="clg-clear-btn" onClick={handleClearHistory}>
                🗑 Clear History
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="clg-footer">
        Cover Letter Generator · Part of AI Resume Analyzer · Built with ❤️
      </footer>
    </div>
  );
}

export default CoverLetterGenerator;
