/**
 * ResumeQualityDashboard — React component
 *
 * Provides a full resume quality analysis dashboard:
 *  - PDF upload with drag-and-drop
 *  - ATS scoring engine with category breakdown
 *  - Keyword density analysis
 *  - Skills detection and gap analysis
 *  - Score history tracking with localStorage
 *  - Improvement suggestions with priority levels
 *  - Canvas-based trend chart (no external dependencies)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import './ResumeQualityDashboard.css';
import BulletPointOptimizer from './BulletPointOptimizer';
import { PhotoResumeUploader } from './PhotoResumeUploader';

// ===== Role Skill Database =====
interface RoleCategory {
  weight: number;
  keywords: string[];
}

interface RoleConfig {
  keywords: string[];
  categories: Record<string, RoleCategory>;
}

const ROLE_SKILLS: Record<string, RoleConfig> = {
  'Frontend Developer': {
    keywords: [
      'react', 'javascript', 'typescript', 'html', 'css', 'sass', 'less',
      'webpack', 'vite', 'next.js', 'vue', 'angular', 'redux', 'zustand',
      'tailwind', 'bootstrap', 'figma', 'responsive', 'accessibility',
      'graphql', 'rest api', 'json', 'jest', 'vitest', 'cypress', 'playwright',
      'git', 'npm', 'ci/cd',
    ],
    categories: {
      'Languages': { weight: 25, keywords: ['javascript', 'typescript', 'es6', 'html', 'css'] },
      'Frameworks': { weight: 25, keywords: ['react', 'vue', 'angular', 'next.js', 'redux', 'svelte'] },
      'Styling': { weight: 15, keywords: ['css', 'sass', 'less', 'tailwind', 'bootstrap'] },
      'Tools': { weight: 15, keywords: ['webpack', 'vite', 'git', 'npm', 'ci/cd', 'storybook'] },
      'Testing': { weight: 10, keywords: ['jest', 'vitest', 'cypress', 'playwright'] },
      'Soft Skills': { weight: 10, keywords: ['responsive', 'accessibility', 'performance', 'figma'] },
    },
  },
  'Backend Developer': {
    keywords: [
      'python', 'django', 'node.js', 'express', 'java', 'spring', 'go',
      'ruby', 'rails', 'php', 'laravel', 'sql', 'postgresql', 'mysql',
      'mongodb', 'redis', 'docker', 'kubernetes', 'rest api', 'graphql',
      'microservices', 'authentication', 'jwt', 'celery', 'kafka',
      'ci/cd', 'aws', 'gcp', 'azure', 'git', 'linux', 'nginx',
    ],
    categories: {
      'Languages': { weight: 25, keywords: ['python', 'java', 'go', 'ruby', 'php', 'node.js'] },
      'Frameworks': { weight: 20, keywords: ['django', 'flask', 'express', 'spring', 'rails', 'laravel'] },
      'Databases': { weight: 20, keywords: ['sql', 'postgresql', 'mysql', 'mongodb', 'redis'] },
      'Infrastructure': { weight: 15, keywords: ['docker', 'kubernetes', 'aws', 'gcp', 'nginx', 'linux'] },
      'Architecture': { weight: 10, keywords: ['rest api', 'graphql', 'microservices', 'jwt', 'oauth'] },
      'Messaging': { weight: 10, keywords: ['celery', 'rabbitmq', 'kafka', 'redis'] },
    },
  },
  'Full Stack Developer': {
    keywords: [
      'react', 'javascript', 'typescript', 'node.js', 'express', 'python',
      'django', 'html', 'css', 'sql', 'postgresql', 'mongodb', 'redis',
      'docker', 'git', 'rest api', 'graphql', 'aws', 'ci/cd', 'next.js',
      'vue', 'angular', 'webpack', 'vite', 'jest', 'cypress',
    ],
    categories: {
      'Frontend': { weight: 25, keywords: ['react', 'vue', 'angular', 'javascript', 'typescript', 'next.js'] },
      'Backend': { weight: 25, keywords: ['node.js', 'express', 'python', 'django', 'java', 'spring'] },
      'Databases': { weight: 15, keywords: ['sql', 'postgresql', 'mongodb', 'redis'] },
      'DevOps': { weight: 15, keywords: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux'] },
      'Architecture': { weight: 10, keywords: ['rest api', 'graphql', 'microservices'] },
      'Testing': { weight: 10, keywords: ['jest', 'cypress', 'playwright', 'vitest'] },
    },
  },
  'Data Analyst': {
    keywords: [
      'python', 'sql', 'excel', 'tableau', 'power bi', 'pandas', 'numpy',
      'matplotlib', 'seaborn', 'jupyter', 'statistics', 'a/b testing',
      'data visualization', 'etl', 'mysql', 'postgresql', 'google analytics',
      'data cleaning', 'machine learning', 'r', 'snowflake', 'bigquery',
    ],
    categories: {
      'Languages': { weight: 25, keywords: ['python', 'r', 'sql', 'vba'] },
      'Libraries': { weight: 20, keywords: ['pandas', 'numpy', 'matplotlib', 'seaborn', 'scipy'] },
      'Visualization': { weight: 20, keywords: ['tableau', 'power bi', 'looker', 'plotly'] },
      'Databases': { weight: 15, keywords: ['sql', 'mysql', 'postgresql', 'snowflake', 'bigquery'] },
      'Analytics': { weight: 10, keywords: ['statistics', 'a/b testing', 'google analytics'] },
      'Tools': { weight: 10, keywords: ['excel', 'jupyter', 'etl', 'data cleaning'] },
    },
  },
  'Data Scientist': {
    keywords: [
      'python', 'r', 'sql', 'machine learning', 'deep learning', 'tensorflow',
      'pytorch', 'scikit-learn', 'pandas', 'numpy', 'statistics', 'nlp',
      'computer vision', 'jupyter', 'docker', 'aws', 'spark', 'mlflow',
      'feature engineering', 'model deployment', 'data visualization', 'git',
    ],
    categories: {
      'Languages': { weight: 20, keywords: ['python', 'r', 'sql', 'scala'] },
      'ML/DL Frameworks': { weight: 25, keywords: ['tensorflow', 'pytorch', 'scikit-learn', 'keras', 'xgboost'] },
      'Data Processing': { weight: 15, keywords: ['pandas', 'numpy', 'spark', 'dask'] },
      'Statistics': { weight: 15, keywords: ['statistics', 'probability', 'a/b testing', 'regression'] },
      'MLOps': { weight: 15, keywords: ['docker', 'mlflow', 'aws', 'model deployment'] },
      'Visualization': { weight: 10, keywords: ['matplotlib', 'seaborn', 'plotly', 'tableau'] },
    },
  },
  'DevOps Engineer': {
    keywords: [
      'docker', 'kubernetes', 'terraform', 'ansible', 'aws', 'gcp', 'azure',
      'linux', 'bash', 'python', 'jenkins', 'gitlab ci', 'github actions',
      'ci/cd', 'prometheus', 'grafana', 'elk stack', 'nginx', 'helm',
      'argocd', 'vault', 'cloudformation', 'pulumi',
    ],
    categories: {
      'Containerization': { weight: 25, keywords: ['docker', 'kubernetes', 'helm', 'container'] },
      'IaC': { weight: 20, keywords: ['terraform', 'ansible', 'pulumi', 'cloudformation'] },
      'Cloud': { weight: 20, keywords: ['aws', 'gcp', 'azure', 'ec2', 's3', 'lambda'] },
      'CI/CD': { weight: 15, keywords: ['jenkins', 'github actions', 'gitlab ci', 'argocd'] },
      'Monitoring': { weight: 10, keywords: ['prometheus', 'grafana', 'elk stack'] },
      'Scripting': { weight: 10, keywords: ['bash', 'python', 'powershell', 'shell'] },
    },
  },
};

// ===== Types =====
interface CategoryScore {
  name: string;
  score: number;
}

interface KeywordDensity {
  keyword: string;
  count: number;
  density: string;
}

interface Suggestion {
  text: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

interface AnalysisResult {
  score: number;
  keywordScore: number;
  categoryScore: number;
  formatScore: number;
  expScore: number;
  categoryScores: CategoryScore[];
  foundSkills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordDensity: KeywordDensity[];
  suggestions: Suggestion[];
  timestamp: number;
}

interface HistoryEntry {
  score: number;
  keywordScore: number;
  categoryScore: number;
  timestamp: number;
  skillsCount: number;
  role: string;
}

// ===== Helper Functions =====
function calculateFormattingScore(text: string): number {
  let score = 50;
  if (text.includes('@')) score += 10;
  if (/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/.test(text)) score += 10;
  const sections = ['experience', 'education', 'skills', 'projects', 'summary'];
  sections.forEach((s) => { if (text.includes(s)) score += 3; });
  const bullets = text.match(/[\n•\-]/g);
  if (bullets && bullets.length > 5) score += 7;
  if (text.length > 500) score += 10;
  if (text.length > 2000) score += 10;
  return Math.min(100, score);
}

function calculateExperienceScore(text: string, level: string): number {
  let score = 40;
  const yearMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10);
    if (level === 'Junior' && years <= 3) score += 15;
    else if (level === 'Mid-Level' && years >= 2 && years <= 6) score += 15;
    else if (level === 'Senior' && years >= 5) score += 15;
  }
  if (level === 'Senior') {
    ['led', 'managed', 'mentored', 'architected'].forEach((kw) => {
      if (text.includes(kw)) score += 10;
    });
  }
  return Math.min(100, score);
}

function analyzeKeywordDensity(text: string): KeywordDensity[] {
  const words = text.split(/\s+/);
  const total = words.length || 1;
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    const clean = w.replace(/[^a-z0-9+#.]/g, '').toLowerCase();
    if (clean.length > 1) freq[clean] = (freq[clean] || 0) + 1;
  });
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 15)
    .map((kw) => ({
      keyword: kw,
      count: freq[kw],
      density: ((freq[kw] / total) * 100).toFixed(2),
    }));
}

function performAnalysis(
  textLower: string,
  roleConfig: RoleConfig,
  experienceLevel: string,
): AnalysisResult {
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  roleConfig.keywords.forEach((kw) => {
    if (textLower.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  const keywordScore = Math.min(100, (matchedKeywords.length / Math.max(roleConfig.keywords.length, 1)) * 100);

  const categoryScores: CategoryScore[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  Object.keys(roleConfig.categories).forEach((cat) => {
    const catConfig = roleConfig.categories[cat];
    let catMatched = 0;
    catConfig.keywords.forEach((kw) => {
      if (textLower.includes(kw.toLowerCase())) catMatched++;
    });
    const catScore = Math.min(100, (catMatched / Math.max(catConfig.keywords.length, 1)) * 100);
    categoryScores.push({ name: cat, score: Math.round(catScore) });
    totalWeight += catConfig.weight;
    weightedScore += (catScore * catConfig.weight) / 100;
  });

  const categoryScore = totalWeight > 0 ? Math.round(weightedScore) : 0;
  const formatScore = calculateFormattingScore(textLower);
  const expScore = calculateExperienceScore(textLower, experienceLevel);
  const score = Math.round(keywordScore * 0.35 + categoryScore * 0.30 + formatScore * 0.20 + expScore * 0.15);

  const keywordDensity = analyzeKeywordDensity(textLower);

  const suggestions: Suggestion[] = [];
  categoryScores.forEach((cs) => {
    if (cs.score < 30) {
      suggestions.push({ text: `Add skills related to "${cs.name}" to strengthen your profile.`, priority: 'high', icon: '🔴' });
    } else if (cs.score < 60) {
      suggestions.push({ text: `Expand your "${cs.name}" section with more specific technologies.`, priority: 'medium', icon: '🟡' });
    }
  });

  if (missingKeywords.length > 3) {
    suggestions.push({
      text: `Missing ${missingKeywords.length} key skills. Focus on: ${missingKeywords.slice(0, 3).join(', ')}.`,
      priority: 'high',
      icon: '🔴',
    });
  }

  if (score < 50) {
    suggestions.push({ text: 'ATS score below 50 — likely automatic rejection. Review category breakdown.', priority: 'high', icon: '🔴' });
  } else if (score < 70) {
    suggestions.push({ text: 'Score is moderate. Adding 2-3 more keywords could reach the strong range.', priority: 'medium', icon: '🟡' });
  }

  if (score >= 70) {
    suggestions.push({ text: 'Great score! Consider tailoring further for specific job descriptions.', priority: 'low', icon: '🟢' });
  }

  const foundSkills = [...matchedKeywords];

  return {
    score, keywordScore: Math.round(keywordScore), categoryScore, formatScore, expScore,
    categoryScores, foundSkills, matchedKeywords, missingKeywords, keywordDensity, suggestions,
    timestamp: Date.now(),
  };
}

function saveToHistory(entry: HistoryEntry): HistoryEntry[] {
  try {
    const stored = localStorage.getItem('rqd_history');
    const history: HistoryEntry[] = stored ? JSON.parse(stored) : [];
    history.push(entry);
    const trimmed = history.slice(-30);
    localStorage.setItem('rqd_history', JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem('rqd_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ===== Component =====
export function ResumeQualityDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetRole, setTargetRole] = useState('Frontend Developer');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) {
      alert('Please upload a PDF file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5 MB limit.');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setResumeText(text || '');
    };
    reader.readAsText(f);
  }, []);

  const runAnalysis = useCallback(() => {
    if (!resumeText && !file) return;
    setLoading(true);

    setTimeout(() => {
      const textLower = (resumeText || '').toLowerCase();
      const roleConfig = ROLE_SKILLS[targetRole] || ROLE_SKILLS['Frontend Developer'];
      const result = performAnalysis(textLower, roleConfig, experienceLevel);
      setAnalysis(result);

      const entry: HistoryEntry = {
        score: result.score,
        keywordScore: result.keywordScore,
        categoryScore: result.categoryScore,
        timestamp: result.timestamp,
        skillsCount: result.foundSkills.length,
        role: targetRole,
      };
      const updated = saveToHistory(entry);
      setHistory(updated);
      setLoading(false);
    }, 600);
  }, [resumeText, file, targetRole, experienceLevel]);

  // Draw history chart
  useEffect(() => {
    if (!canvasRef.current || history.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = history.slice(-20);
    const w = canvas.parentElement?.clientWidth || 700;
    const h = 220;
    canvas.width = w;
    canvas.height = h;

    const pad = { top: 28, right: 18, bottom: 36, left: 44 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(51,65,85,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 25}`, pad.left - 6, y + 3);
    }

    const step = cw / (data.length - 1);

    // Area fill
    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    areaGrad.addColorStop(0, 'rgba(99,102,241,0.18)');
    areaGrad.addColorStop(1, 'rgba(99,102,241,0.0)');
    ctx.fillStyle = areaGrad;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = pad.left + i * step;
      const y = pad.top + ch - (d.score / 100) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (data.length - 1) * step, h - pad.bottom);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.closePath();
    ctx.fill();

    // Line
    const lineGrad = ctx.createLinearGradient(pad.left, 0, w - pad.right, 0);
    lineGrad.addColorStop(0, '#6366f1');
    lineGrad.addColorStop(1, '#10b981');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = pad.left + i * step;
      const y = pad.top + ch - (d.score / 100) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    data.forEach((d) => {
      const x = pad.left + data.indexOf(d) * step;
      const y = pad.top + ch - (d.score / 100) * ch;
      const color = d.score >= 70 ? '#10b981' : d.score >= 50 ? '#f59e0b' : '#f43f5e';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // X labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      if (i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) {
        const dt = new Date(d.timestamp);
        ctx.fillText(`${dt.getMonth() + 1}/${dt.getDate()}`, pad.left + i * step, h - pad.bottom + 14);
      }
    });

    // Trend
    if (data.length >= 2) {
      const diff = data[data.length - 1].score - data[0].score;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillStyle = diff >= 0 ? '#10b981' : '#f43f5e';
      ctx.fillText(
        `${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff)} pts since first`,
        w - pad.right, 16,
      );
    }
  }, [history]);

  const scoreColor = (s: number) => s >= 70 ? '#10b981' : s >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="rqd-container">
      <header className="rqd-header">
        <h1>📊 Resume Quality Dashboard</h1>
        <p>Upload your resume to get a detailed quality breakdown, track ATS readiness, and monitor improvement over time.</p>
        <span className="rqd-badge">Quality Intelligence Engine v1.0</span>
      </header>

      {/* Upload Zone */}
      <div
        className={`rqd-upload-zone${isDragging ? ' dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="rqd-upload-icon">📄</span>
        <h3>{file ? `✓ ${file.name}` : 'Drop your Resume or Printed Photo here'}</h3>
        <p>{file ? `${(file.size / 1024).toFixed(1)} KB — Ready to analyze` : 'PDF, Word, Text or Printed Resume Photo (PNG, JPG, WEBP) · Max 5 MB'}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,image/*"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.length) handleFile(e.target.files[0]); }}
        />
      </div>

      {/* Camera / Photo OCR Upload Section (#976) */}
      <PhotoResumeUploader
        selectedFile={file}
        onPhotoCaptured={(capturedFile) => handleFile(capturedFile)}
      />

      {/* Config */}
      <div className="rqd-config-row">
        <div className="rqd-config-field">
          <label htmlFor="rqdTargetRole">Target Role</label>
          <select id="rqdTargetRole" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
            {Object.keys(ROLE_SKILLS).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="rqd-config-field">
          <label htmlFor="rqdExpLevel">Experience Level</label>
          <select id="rqdExpLevel" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
            <option value="Junior">Junior (0–2 yrs)</option>
            <option value="Mid-Level">Mid-Level (2–5 yrs)</option>
            <option value="Senior">Senior (5+ yrs)</option>
          </select>
        </div>
      </div>

      <button
        className="rqd-analyze-btn"
        disabled={!file || loading}
        onClick={runAnalysis}
      >
        {loading ? <><span className="rqd-spinner" />Analyzing...</> : '🚀 Analyze Resume Quality'}
      </button>

      {/* Results */}
      {analysis && (
        <>
          {/* Score Ring */}
          <div className="rqd-score-section">
            <div className="rqd-score-ring">
              <svg viewBox="0 0 170 170">
                <defs>
                  <linearGradient id="rqdScoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle className="rqd-ring-bg" cx="85" cy="85" r="75" />
                <circle
                  className="rqd-ring-fill"
                  cx="85" cy="85" r="75"
                  style={{ strokeDashoffset: 471 - (analysis.score / 100) * 471 }}
                />
              </svg>
              <div className="rqd-score-label">
                <span className="rqd-score-value" style={{ color: scoreColor(analysis.score) }}>{analysis.score}</span>
                <span className="rqd-score-text">ATS Score</span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="rqd-metrics-grid">
            {[
              { icon: '🏷️', value: `${analysis.keywordScore}%`, label: 'Keyword Match' },
              { icon: '📋', value: `${analysis.categoryScore}%`, label: 'Category Coverage' },
              { icon: '📐', value: `${analysis.formatScore}%`, label: 'Formatting' },
              { icon: '🎯', value: `${analysis.expScore}%`, label: 'Experience Fit' },
              { icon: '🛠️', value: String(analysis.foundSkills.length), label: 'Skills Detected' },
              { icon: '⚠️', value: String(analysis.suggestions.length), label: 'Suggestions' },
            ].map((m, i) => (
              <div key={i} className="rqd-metric-card">
                <div className="rqd-metric-icon">{m.icon}</div>
                <div className="rqd-metric-value">{m.value}</div>
                <div className="rqd-metric-label">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Two-column: Categories + Suggestions */}
          <div className="rqd-two-col">
            <div className="rqd-panel">
              <h3 className="rqd-section-title">📈 Category Breakdown</h3>
              <div className="rqd-bar-list">
                {analysis.categoryScores.map((cs) => (
                  <div key={cs.name} className="rqd-bar-item">
                    <span className="rqd-bar-label">{cs.name}</span>
                    <div className="rqd-bar-track">
                      <div
                        className="rqd-bar-fill"
                        style={{
                          width: `${cs.score}%`,
                          background: scoreColor(cs.score),
                        }}
                      />
                    </div>
                    <span className="rqd-bar-score" style={{ color: scoreColor(cs.score) }}>{cs.score}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rqd-panel">
              <h3 className="rqd-section-title">💡 Suggestions</h3>
              <div className="rqd-suggestions">
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className="rqd-suggestion-item">
                    <span>{s.icon}</span>
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="rqd-panel" style={{ marginBottom: 28 }}>
            <h3 className="rqd-section-title">🛠️ Skills Detected ({analysis.foundSkills.length})</h3>
            <div className="rqd-skills-grid">
              {analysis.foundSkills.map((skill) => (
                <span key={skill} className="rqd-skill-chip">✓ {skill}</span>
              ))}
            </div>
          </div>

          {/* Keyword Table */}
          <div className="rqd-panel" style={{ marginBottom: 28 }}>
            <h3 className="rqd-section-title">🔍 Keyword Density</h3>
            <table className="rqd-keyword-table">
              <thead>
                <tr><th>Keyword</th><th>Count</th><th>Density</th><th>Status</th></tr>
              </thead>
              <tbody>
                {analysis.keywordDensity.slice(0, 10).map((kw) => {
                  const isTarget = analysis.matchedKeywords.includes(kw.keyword);
                  return (
                    <tr key={kw.keyword}>
                      <td style={{ fontWeight: 600 }}>{kw.keyword}</td>
                      <td>{kw.count}</td>
                      <td>{kw.density}%</td>
                      <td>
                        <span className={`rqd-status-badge ${isTarget ? 'green' : 'empty'}`}>
                          {isTarget ? '✓ Target' : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bullet Point Optimizer */}
          <div style={{ marginTop: 28 }}>
            <BulletPointOptimizer targetRole={selectedRole} />
          </div>

          {/* History Chart */}
          <div className="rqd-history-container">
            <h3 className="rqd-section-title">📉 Score History</h3>
            {history.length < 2 ? (
              <div className="rqd-chart-placeholder">
                Analyze at least 2 resumes to see your improvement trend.
              </div>
            ) : (
              <canvas ref={canvasRef} />
            )}
          </div>
        </>
      )}
      <footer className="rqd-footer" style={{ marginTop: '2rem', padding: '1rem 0', opacity: 0.5, fontSize: '0.85rem' }}>
        Resume Quality Dashboard · Part of AI Resume Analyzer · Built with ❤️
      </footer>
    </div>
  );
}

export default ResumeQualityDashboard;
