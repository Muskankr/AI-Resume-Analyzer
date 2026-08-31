/**
 * KeywordDensityAnalyzer — React component
 *
 * Analyzes resume text for keyword frequency, density, and section
 * distribution. Highlights over/under-represented terms and shows
 * a visual heatmap of keyword density across resume sections.
 */

import { useState, useCallback, useMemo } from 'react';
import './KeywordDensityAnalyzer.css';

// ===== Stop words for filtering =====
const STOP_WORDS = new Set([
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
  'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'also',
  'well', 'back', 'even', 'still', 'new', 'one', 'two', 'use', 'used',
  'using', 'via', 'etc', 'e.g', 'i.e', 'include', 'including', 'like',
  'per', 'plus', 'set', 'work', 'working', 'worked', 'able', 'want',
]);

// ===== Section headers for distribution analysis =====
const SECTION_PATTERNS: Record<string, RegExp> = {
  'Contact': /\b(contact|email|phone|address|linkedin|portfolio)\b/i,
  'Summary': /\b(summary|objective|profile|about)\b/i,
  'Experience': /\b(experience|employment|work history|positions held)\b/i,
  'Education': /\b(education|degree|university|college|bachelor|master|phd|gpa)\b/i,
  'Skills': /\b(skills|competencies|technologies|proficiencies|technical)\b/i,
  'Projects': /\b(projects|portfolio|open source|contributions)\b/i,
  'Certifications': /\b(certification|certified|certificate|license|aws certified)\b/i,
};

// ===== Density category thresholds =====
interface DensityBucket {
  label: string;
  min: number;
  max: number;
  color: string;
}

const DENSITY_BUCKETS: DensityBucket[] = [
  { label: 'Low', min: 0, max: 1, color: '#64748b' },
  { label: 'Moderate', min: 1, max: 3, color: '#f59e0b' },
  { label: 'Good', min: 3, max: 5, color: '#10b981' },
  { label: 'High', min: 5, max: 10, color: '#06b6d4' },
  { label: 'Overused', min: 10, max: Infinity, color: '#f43f5e' },
];

// ===== Types =====
interface KeywordEntry {
  word: string;
  count: number;
  density: number;
  sectionHits: Record<string, number>;
  bucket: DensityBucket;
}

interface SectionInfo {
  name: string;
  charCount: number;
  keywordCount: number;
  densityScore: number;
}

interface AnalysisResult {
  totalWords: number;
  totalChars: number;
  uniqueKeywords: number;
  keywords: KeywordEntry[];
  sections: SectionInfo[];
  avgDensity: number;
  overusedCount: number;
  missingSections: string[];
}

// ===== Core Analysis Functions =====
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function detectSections(text: string): string[] {
  const lines = text.split('\n');
  const detected: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase().replace(/[:.]+$/, '');
    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(trimmed) && trimmed.length < 40) {
        if (!detected.includes(name)) detected.push(name);
      }
    }
  }
  return detected.length > 0 ? detected : ['General'];
}

function splitIntoSections(text: string): Record<string, string> {
  const lines = text.split('\n');
  const sections: Record<string, string> = { General: '' };
  let current = 'General';

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader = Object.entries(SECTION_PATTERNS).some(
      ([, pat]) => pat.test(trimmed.toLowerCase().replace(/[:.]+$/, '')) && trimmed.length < 40
    );
    if (isHeader) {
      current = Object.keys(SECTION_PATTERNS).find((k) =>
        SECTION_PATTERNS[k].test(trimmed.toLowerCase().replace(/[:.]+$/, ''))
      ) || 'General';
      if (!sections[current]) sections[current] = '';
    } else {
      sections[current] += line + '\n';
    }
  }
  return sections;
}

function classifyDensity(count: number, totalWords: number): DensityBucket {
  const density = totalWords > 0 ? (count / totalWords) * 100 : 0;
  return DENSITY_BUCKETS.find((b) => density >= b.min && density < b.max) || DENSITY_BUCKETS[0];
}

function analyzeText(text: string): AnalysisResult {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;
  const totalChars = text.length;

  const keywords = extractWords(text);
  const freq: Record<string, number> = {};
  keywords.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

  const sections = splitIntoSections(text);
  const detectedSections = Object.keys(sections).filter((s) => sections[s].trim().length > 0);

  const entries: KeywordEntry[] = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([word, count]) => {
      const density = totalWords > 0 ? (count / totalWords) * 100 : 0;
      const sectionHits: Record<string, number> = {};
      detectedSections.forEach((s) => {
        const sWords = sections[s].toLowerCase().split(/\s+/);
        sectionHits[s] = sWords.filter((w) => w === word).length;
      });
      return { word, count, density: Math.round(density * 100) / 100, sectionHits, bucket: classifyDensity(count, totalWords) };
    });

  const sectionInfos: SectionInfo[] = detectedSections.map((name) => {
    const sWords = sections[name].split(/\s+/).filter((w) => w.length > 0);
    const sKeywords = extractWords(sections[name]);
    return {
      name,
      charCount: sections[name].length,
      keywordCount: sKeywords.length,
      densityScore: sWords.length > 0 ? Math.round((sKeywords.length / sWords.length) * 100) : 0,
    };
  });

  const avgDensity = entries.length > 0
    ? Math.round((entries.reduce((s, e) => s + e.density, 0) / entries.length) * 100) / 100
    : 0;

  const allSectionNames = Object.keys(SECTION_PATTERNS);
  const detectedForMissing = detectSections(text);
  const missingSections = allSectionNames.filter((s) => !detectedForMissing.includes(s));

  return {
    totalWords, totalChars, uniqueKeywords: Object.keys(freq).length,
    keywords: entries, sections: sectionInfos, avgDensity,
    overusedCount: entries.filter((e) => e.bucket.label === 'Overused').length,
    missingSections,
  };
}

// ===== Component =====
export function KeywordDensityAnalyzer() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = useCallback(() => {
    if (!inputText.trim()) return;
    const r = analyzeText(inputText);
    setResult(r);
  }, [inputText]);

  const maxCount = useMemo(() => {
    if (!result || result.keywords.length === 0) return 1;
    return Math.max(...result.keywords.map((k) => k.count));
  }, [result]);

  return (
    <div className="kda-container">
      <header className="kda-header">
        <h1>🔍 Keyword Density Analyzer</h1>
        <p>Paste your resume text to analyze keyword frequency, density distribution, and section coverage for ATS optimization.</p>
        <span className="kda-badge">NLP Keyword Engine v1.0</span>
      </header>

      <div className="kda-input-section">
        <textarea
          className="kda-textarea"
          placeholder="Paste your resume text here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={10}
        />
        <div className="kda-input-footer">
          <span className="kda-char-count">{inputText.length} characters · {inputText.split(/\s+/).filter((w) => w).length} words</span>
          <button className="kda-analyze-btn" disabled={!inputText.trim()} onClick={handleAnalyze}>
            🔬 Analyze Keywords
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Summary Metrics */}
          <div className="kda-metrics-row">
            <div className="kda-metric">
              <span className="kda-metric-val">{result.totalWords}</span>
              <span className="kda-metric-lbl">Total Words</span>
            </div>
            <div className="kda-metric">
              <span className="kda-metric-val">{result.uniqueKeywords}</span>
              <span className="kda-metric-lbl">Unique Keywords</span>
            </div>
            <div className="kda-metric">
              <span className="kda-metric-val">{result.avgDensity}%</span>
              <span className="kda-metric-lbl">Avg Density</span>
            </div>
            <div className="kda-metric">
              <span className="kda-metric-val" style={{ color: result.overusedCount > 0 ? '#f43f5e' : '#10b981' }}>{result.overusedCount}</span>
              <span className="kda-metric-lbl">Overused Terms</span>
            </div>
          </div>

          {/* Keyword Table */}
          <div className="kda-panel">
            <h3 className="kda-section-title">📊 Top Keywords by Frequency</h3>
            <div className="kda-keyword-list">
              {result.keywords.map((kw) => (
                <div key={kw.word} className="kda-keyword-row">
                  <span className="kda-kw-word">{kw.word}</span>
                  <div className="kda-kw-bar-wrap">
                    <div
                      className="kda-kw-bar"
                      style={{
                        width: `${(kw.count / maxCount) * 100}%`,
                        background: kw.bucket.color,
                      }}
                    />
                  </div>
                  <span className="kda-kw-count">{kw.count}</span>
                  <span className="kda-kw-density">{kw.density}%</span>
                  <span className="kda-kw-badge" style={{ background: kw.bucket.color + '22', color: kw.bucket.color, borderColor: kw.bucket.color + '44' }}>
                    {kw.bucket.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section Distribution */}
          <div className="kda-panel">
            <h3 className="kda-section-title">📑 Section Distribution</h3>
            <div className="kda-section-list">
              {result.sections.map((s) => (
                <div key={s.name} className="kda-section-row">
                  <span className="kda-sec-name">{s.name}</span>
                  <div className="kda-sec-bar-wrap">
                    <div
                      className="kda-sec-bar"
                      style={{
                        width: `${Math.min(100, s.densityScore)}%`,
                        background: s.densityScore >= 40 ? '#10b981' : s.densityScore >= 20 ? '#f59e0b' : '#64748b',
                      }}
                    />
                  </div>
                  <span className="kda-sec-keywords">{s.keywordCount} kw</span>
                  <span className="kda-sec-density">{s.densityScore}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Sections */}
          {result.missingSections.length > 0 && (
            <div className="kda-panel kda-warnings">
              <h3 className="kda-section-title">⚠️ Missing Resume Sections</h3>
              <div className="kda-missing-tags">
                {result.missingSections.map((s) => (
                  <span key={s} className="kda-missing-tag">{s}</span>
                ))}
              </div>
              <p className="kda-missing-note">Adding these sections can improve ATS parsing and readability.</p>
            </div>
          )}
        </>
      )}

      <footer className="kda-footer">
        Keyword Density Analyzer · Part of AI Resume Analyzer · Built with ❤️
      </footer>
    </div>
  );
}

export default KeywordDensityAnalyzer;
