import { useState, useMemo, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ResumeSection {
  id: string;
  name: string;
  icon: string;
  score: number; // 0-100
  weight: number;
  findings: Finding[];
  tips: string[];
}

interface Finding {
  type: 'positive' | 'warning' | 'critical' | 'info';
  message: string;
  impact: 'high' | 'medium' | 'low';
}

interface OverallGrade {
  letter: string;
  label: string;
  color: string;
  description: string;
}

interface StrengthMeterData {
  overallScore: number;
  grade: OverallGrade;
  sections: ResumeSection[];
  topStrengths: string[];
  topWeaknesses: string[];
  estimatedAtsPass: number;
  competitivePosition: string;
}

/* ─── Analysis Engine ─────────────────────────────────────────────────── */
function analyzeContactInfo(text: string): ResumeSection {
  const findings: Finding[] = [];
  const tips: string[] = [];
  let score = 0;

  const hasEmail = /[\w.+-]+@[\w.-]+\.\w{2,}/.test(text);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
  const hasLinkedIn = /linkedin\.com/i.test(text);
  const hasGitHub = /github\.com/i.test(text);
  const hasLocation = /\b(New York|San Francisco|London|Berlin|Remote|etc\.|[A-Z][a-z]+,\s*[A-Z]{2})\b/.test(text);
  const hasName = /^[A-Z][a-z]+\s[A-Z][a-z]+/m.test(text);

  if (hasName) { score += 20; findings.push({ type: 'positive', message: 'Full name is prominently displayed', impact: 'high' }); }
  else { findings.push({ type: 'critical', message: 'No clear full name detected at the top', impact: 'high' }); tips.push('Add your full name as the first line in large, bold text'); }

  if (hasEmail) { score += 25; findings.push({ type: 'positive', message: 'Professional email address found', impact: 'high' }); }
  else { findings.push({ type: 'critical', message: 'No email address found', impact: 'high' }); tips.push('Add a professional email address (e.g., firstname.lastname@email.com)'); }

  if (hasPhone) { score += 20; findings.push({ type: 'positive', message: 'Phone number detected', impact: 'medium' }); }
  else { findings.push({ type: 'warning', message: 'No phone number found', impact: 'medium' }); tips.push('Include a phone number with area code'); }

  if (hasLinkedIn) { score += 15; findings.push({ type: 'positive', message: 'LinkedIn profile linked', impact: 'medium' }); }
  else { tips.push('Add your LinkedIn profile URL to increase credibility'); }

  if (hasGitHub) { score += 10; findings.push({ type: 'info', message: 'GitHub profile linked — great for technical roles', impact: 'low' }); }
  if (hasLocation) { score += 10; findings.push({ type: 'positive', message: 'Location information included', impact: 'low' }); }
  else { tips.push('Consider adding your city/state or "Open to Remote"'); }

  return { id: 'contact', name: 'Contact Information', icon: '📧', score: Math.min(score, 100), weight: 15, findings, tips };
}

function analyzeSummary(text: string): ResumeSection {
  const findings: Finding[] = [];
  const tips: string[] = [];
  let score = 0;

  const summaryPatterns = [/(?:summary|objective|profile|about)\s*(?:me|the candidate)?:?\s*\n/im, /(?:results[- ]driven|passionate|dedicated|experienced|accomplished|innovative|strategic)/i];
  const hasSummarySection = summaryPatterns[0].test(text);
  const summaryMatch = text.match(/(?:summary|objective|profile)[\s\S]{0,500}(?=\n\n|\nexperience|\neducation|\nskills)/i);
  const summaryText = summaryMatch?.[0] || '';

  if (hasSummarySection) { score += 30; findings.push({ type: 'positive', message: 'Professional summary section present', impact: 'high' }); }
  else { findings.push({ type: 'warning', message: 'No summary/objective section detected', impact: 'high' }); tips.push('Add a 2-3 line professional summary at the top of your resume'); }

  if (summaryText.length > 50) {
    score += 20;
    const wordCount = summaryText.split(/\s+/).length;
    if (wordCount >= 30 && wordCount <= 80) { score += 20; findings.push({ type: 'positive', message: `Summary is well-lengthed (${wordCount} words)`, impact: 'medium' }); }
    else if (wordCount < 30) { score += 10; findings.push({ type: 'warning', message: 'Summary is too brief', impact: 'medium' }); tips.push('Expand your summary to 30-60 words highlighting key achievements'); }
    else { score += 10; findings.push({ type: 'warning', message: 'Summary is too long', impact: 'medium' }); tips.push('Condense your summary to 30-60 words for maximum impact'); }
  }

  if (summaryPatterns[1].test(text)) { score += 15; findings.push({ type: 'positive', message: 'Strong action language detected', impact: 'medium' }); }
  else { tips.push('Use power words like "achieved", "led", "optimized" in your summary'); }

  const hasNumbers = /\d+[%KMB+]|\$\d+/i.test(summaryText);
  if (hasNumbers) { score += 15; findings.push({ type: 'positive', message: 'Quantified achievements in summary', impact: 'high' }); }
  else { tips.push('Add metrics and numbers to your summary (e.g., "increased revenue by 30%")'); }

  return { id: 'summary', name: 'Professional Summary', icon: '📝', score: Math.min(score, 100), weight: 15, findings, tips };
}

function analyzeExperience(text: string): ResumeSection {
  const findings: Finding[] = [];
  const tips: string[] = [];
  let score = 0;

  const experienceSection = text.match(/(?:experience|employment|work history)[\s\S]{0,3000}/i);
  const expText = experienceSection?.[0] || '';

  const hasExperience = /(?:experience|employment|work history)/i.test(text);
  if (hasExperience) { score += 15; findings.push({ type: 'positive', message: 'Work experience section found', impact: 'high' }); }
  else { findings.push({ type: 'critical', message: 'No work experience section detected', impact: 'high' }); tips.push('Add a "Work Experience" section with your employment history'); }

  const jobCount = (expText.match(/(?:company|inc\.|llc|corp|ltd|technologies|solutions)/gi) || []).length;
  if (jobCount >= 3) { score += 25; findings.push({ type: 'positive', message: `${Math.min(jobCount, 5)}+ positions listed`, impact: 'high' }); }
  else if (jobCount >= 1) { score += 15; findings.push({ type: 'info', message: `Only ${jobCount} position(s) found`, impact: 'medium' }); tips.push('Add more work experience entries to show career progression'); }
  else { score += 5; findings.push({ type: 'warning', message: 'Could not identify distinct job positions', impact: 'high' }); }

  const bulletPoints = (expText.match(/^[\s]*[•\-\*\►\▸\■]\s/gm) || []).length;
  if (bulletPoints >= 8) { score += 20; findings.push({ type: 'positive', message: `${bulletPoints} bullet points — good detail level`, impact: 'high' }); }
  else if (bulletPoints >= 4) { score += 10; findings.push({ type: 'warning', message: `Only ${bulletPoints} bullet points — could use more detail`, impact: 'medium' }); tips.push('Aim for 4-6 bullet points per position'); }
  else { findings.push({ type: 'warning', message: 'Very few bullet points found', impact: 'high' }); tips.push('Use bullet points to describe achievements, not just duties'); }

  const actionVerbs = /(?:led|managed|developed|implemented|designed|created|improved|increased|reduced|achieved|delivered|launched|optimized|automated|scaled|mentored|collaborated|architected)/gi;
  const verbMatches = expText.match(actionVerbs) || [];
  if (verbMatches.length >= 5) { score += 15; findings.push({ type: 'positive', message: `${verbMatches.length} strong action verbs used`, impact: 'medium' }); }
  else { tips.push('Start each bullet point with a strong action verb'); }

  const quantified = (expText.match(/\d+[%KMB+]|\$\d+|\d+x|\d+\+?\s*(?:users|customers|team|projects|sites)/gi) || []).length;
  if (quantified >= 4) { score += 15; findings.push({ type: 'positive', message: `${quantified} quantified achievements`, impact: 'high' }); }
  else if (quantified >= 1) { score += 7; findings.push({ type: 'info', message: 'Some quantified achievements found', impact: 'medium' }); tips.push('Add more metrics: revenue impact, team size, performance improvements'); }
  else { findings.push({ type: 'warning', message: 'No quantified achievements detected', impact: 'high' }); tips.push('Quantify your achievements with numbers, percentages, or dollar amounts'); }

  return { id: 'experience', name: 'Work Experience', icon: '💼', score: Math.min(score, 100), weight: 30, findings, tips };
}

function analyzeSkills(text: string): ResumeSection {
  const findings: Finding[] = [];
  const tips: string[] = [];
  let score = 0;

  const techSkills = text.match(/\b(javascript|typescript|python|java|react|angular|vue|node\.?js|html|css|sql|mongodb|aws|docker|kubernetes|git|rest|api|graphql|redis|postgresql|mysql|figma|photoshop|excel|powerpoint|word|agile|scrum|jira|confluence|linux|bash|c\+\+|ruby|php|swift|kotlin|flutter|dart|terraform|ci\/cd|machine learning|ai|data analysis|tensorflow|pytorch|pandas|numpy)\b/gi) || [];
  const uniqueSkills = [...new Set(techSkills.map(s => s.toLowerCase()))];

  if (uniqueSkills.length >= 8) { score += 40; findings.push({ type: 'positive', message: `${uniqueSkills.length} technical skills identified — strong coverage`, impact: 'high' }); }
  else if (uniqueSkills.length >= 4) { score += 25; findings.push({ type: 'info', message: `${uniqueSkills.length} technical skills found`, impact: 'medium' }); tips.push('Add more relevant technical skills to your skills section'); }
  else { score += 10; findings.push({ type: 'warning', message: `Only ${uniqueSkills.length} technical skills detected`, impact: 'high' }); tips.push('Include a dedicated skills section with relevant technologies'); }

  const hasSkillsSection = /(?:skills|technologies|competencies|tech stack|proficiencies)/i.test(text);
  if (hasSkillsSection) { score += 20; findings.push({ type: 'positive', message: 'Dedicated skills section found', impact: 'high' }); }
  else { findings.push({ type: 'warning', message: 'No dedicated skills section detected', impact: 'high' }); tips.push('Create a clear "Skills" or "Technical Skills" section'); }

  const softSkills = text.match(/\b(communication|leadership|teamwork|problem.solving|analytical|creative|adaptable|organized|detail.oriented|time.management|collaboration|mentoring|presentation|negotiation)\b/gi) || [];
  if (softSkills.length >= 2) { score += 15; findings.push({ type: 'positive', message: `${softSkills.length} soft skills mentioned`, impact: 'medium' }); }
  else { tips.push('Include 2-3 relevant soft skills alongside technical abilities'); }

  const hasCerts = /(?:certified|certification|certificate|aws certified|google certified|microsoft certified|pmp|scrum master|comptia)/i.test(text);
  if (hasCerts) { score += 15; findings.push({ type: 'positive', message: 'Professional certifications detected', impact: 'medium' }); }
  else { tips.push('Consider adding relevant certifications to stand out'); }

  if (uniqueSkills.length > 0) {
    findings.push({ type: 'info', message: `Key skills: ${uniqueSkills.slice(0, 5).join(', ')}${uniqueSkills.length > 5 ? '...' : ''}`, impact: 'low' });
  }

  return { id: 'skills', name: 'Skills & Technologies', icon: '🛠️', score: Math.min(score, 100), weight: 20, findings, tips };
}

function analyzeEducation(text: string): ResumeSection {
  const findings: Finding[] = [];
  const tips: string[] = [];
  let score = 0;

  const hasEducation = /(?:education|academic|university|college|degree|bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?)/i.test(text);
  if (hasEducation) { score += 40; findings.push({ type: 'positive', message: 'Education section found', impact: 'high' }); }
  else { findings.push({ type: 'warning', message: 'No education section detected', impact: 'high' }); tips.push('Add your educational background even if you have extensive experience'); }

  const hasDegree = /(?:bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|associate|diploma)/i.test(text);
  if (hasDegree) { score += 25; findings.push({ type: 'positive', message: 'Degree information included', impact: 'high' }); }

  const hasSchool = /(?:university|college|institute|school|academy)/i.test(text);
  if (hasSchool) { score += 15; findings.push({ type: 'positive', message: 'Institution name listed', impact: 'medium' }); }

  const hasYear = /(?:19|20)\d{2}/.test(text);
  if (hasYear) { score += 10; findings.push({ type: 'info', message: 'Graduation year included', impact: 'low' }); }

  const hasGPA = /gpa[:\s]*[\d.]+/i.test(text);
  if (hasGPA) { score += 10; findings.push({ type: 'info', message: 'GPA included', impact: 'low' }); tips.push('Only include GPA if it\'s 3.5+ and you\'re a recent graduate'); }

  return { id: 'education', name: 'Education', icon: '🎓', score: Math.min(score, 100), weight: 10, findings, tips };
}

function analyzeFormatting(text: string): ResumeSection {
  const findings: Finding[] = [];
  const tips: string[] = [];
  let score = 50; // Start at neutral

  const lines = text.split('\n');
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  if (wordCount >= 200 && wordCount <= 800) { score += 20; findings.push({ type: 'positive', message: `Optimal length (${wordCount} words)`, impact: 'high' }); }
  else if (wordCount < 200) { score -= 10; findings.push({ type: 'warning', message: 'Resume may be too short', impact: 'medium' }); tips.push('Aim for 400-600 words for optimal ATS and recruiter readability'); }
  else { score += 5; findings.push({ type: 'info', message: `Long resume (${wordCount} words) — consider trimming`, impact: 'low' }); tips.push('Keep resume concise; remove outdated or irrelevant experience'); }

  const sectionHeaders = lines.filter(l => /^(?:SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|CONTACT)/i.test(l.trim()));
  if (sectionHeaders.length >= 3) { score += 15; findings.push({ type: 'positive', message: `${sectionHeaders.length} clear section headers found`, impact: 'high' }); }
  else { tips.push('Use clear section headers (SUMMARY, EXPERIENCE, SKILLS, EDUCATION)'); }

  const hasConsistentFormatting = !/[^\x00-\x7F]{3,}/.test(text.replace(/[•\-\*\►\▸■]/g, ''));
  if (hasConsistentFormatting) { score += 10; findings.push({ type: 'positive', message: 'Consistent character encoding', impact: 'low' }); }

  const avgLineLength = text.length / Math.max(lines.length, 1);
  if (avgLineLength > 20 && avgLineLength < 200) { score += 5; findings.push({ type: 'positive', message: 'Good line length distribution', impact: 'low' }); }

  return { id: 'formatting', name: 'Format & Structure', icon: '📐', score: Math.min(Math.max(score, 0), 100), weight: 10, findings, tips };
}

/* ─── Grade Calculator ─────────────────────────────────────────────── */
function calculateGrade(score: number): OverallGrade {
  if (score >= 90) return { letter: 'A+', label: 'Exceptional', color: '#22c55e', description: 'Your resume is in the top tier — ready for senior roles at top companies.' };
  if (score >= 80) return { letter: 'A', label: 'Excellent', color: '#22c55e', description: 'Strong resume with minor room for polish.' };
  if (score >= 70) return { letter: 'B+', label: 'Very Good', color: '#3b82f6', description: 'Above average with some areas to strengthen.' };
  if (score >= 60) return { letter: 'B', label: 'Good', color: '#3b82f6', description: 'Solid foundation — a few improvements could make a big difference.' };
  if (score >= 50) return { letter: 'C+', label: 'Average', color: '#eab308', description: 'Decent but needs work in several areas to stand out.' };
  if (score >= 40) return { letter: 'C', label: 'Below Average', color: '#f97316', description: 'Significant improvements needed to compete effectively.' };
  if (score >= 30) return { letter: 'D', label: 'Needs Work', color: '#ef4444', description: 'Major gaps detected — prioritize the recommendations below.' };
  return { letter: 'F', label: 'Critical', color: '#ef4444', description: 'Resume needs substantial rework to be competitive.' };
}

/* ─── Main Analysis Function ──────────────────────────────────────── */
export function analyzeResume(resumeText: string): StrengthMeterData {
  const sections: ResumeSection[] = [
    analyzeContactInfo(resumeText),
    analyzeSummary(resumeText),
    analyzeExperience(resumeText),
    analyzeSkills(resumeText),
    analyzeEducation(resumeText),
    analyzeFormatting(resumeText),
  ];

  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
  const overallScore = Math.round(sections.reduce((sum, s) => sum + (s.score * s.weight), 0) / totalWeight);
  const grade = calculateGrade(overallScore);

  const allFindings = sections.flatMap(s => s.findings);
  const topStrengths = allFindings.filter(f => f.type === 'positive' && f.impact === 'high').slice(0, 3).map(f => f.message);
  const topWeaknesses = allFindings.filter(f => (f.type === 'critical' || f.type === 'warning') && f.impact === 'high').slice(0, 3).map(f => f.message);

  const estimatedAtsPass = Math.min(98, Math.round(overallScore * 0.9 + (allFindings.filter(f => f.type === 'positive').length * 2)));

  let competitivePosition = 'Bottom 50%';
  if (overallScore >= 85) competitivePosition = 'Top 10% — Highly Competitive';
  else if (overallScore >= 70) competitivePosition = 'Top 25% — Competitive';
  else if (overallScore >= 55) competitivePosition = 'Middle 50% — Average';
  else if (overallScore >= 40) competitivePosition = 'Bottom 25% — Needs Improvement';

  return { overallScore, grade, sections, topStrengths, topWeaknesses, estimatedAtsPass, competitivePosition };
}

/* ─── Component ─────────────────────────────────────────────────────── */
export default function ResumeStrengthMeter({ resumeText }: { resumeText: string }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const data = useMemo(() => analyzeResume(resumeText), [resumeText]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Resume Strength Meter
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>Comprehensive multi-dimensional analysis of your resume</p>
        </div>

        {/* Overall Score Card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Score Circle */}
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width={140} height={140} viewBox="0 0 140 140">
                <circle cx={70} cy={70} r={60} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
                <circle cx={70} cy={70} r={60} fill="none" stroke={data.grade.color} strokeWidth={12} strokeDasharray={`${(data.overallScore / 100) * 377} 377`} strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 1s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: data.grade.color }}>{data.overallScore}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>out of 100</div>
              </div>
            </div>

            {/* Grade & Info */}
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: data.grade.color }}>{data.grade.letter}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{data.grade.label}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{data.competitivePosition}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, maxWidth: 320 }}>{data.grade.description}</p>
            </div>
          </div>

          {/* ATS Pass Rate */}
          <div style={{ marginTop: 20, padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, display: 'inline-block' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Estimated ATS Pass Rate: </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: data.estimatedAtsPass >= 70 ? '#22c55e' : '#eab308' }}>{data.estimatedAtsPass}%</span>
          </div>
        </div>

        {/* Top Strengths & Weaknesses */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 14, padding: 18, border: '1px solid rgba(34,197,94,0.2)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px 0', color: '#22c55e' }}>✅ Top Strengths</h3>
            {data.topStrengths.length > 0 ? data.topStrengths.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #22c55e40' }}>{s}</div>
            )) : <div style={{ fontSize: 12, color: '#64748b' }}>No major strengths detected yet</div>}
          </div>
          <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 14, padding: 18, border: '1px solid rgba(239,68,68,0.2)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ Areas to Improve</h3>
            {data.topWeaknesses.length > 0 ? data.topWeaknesses.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #ef444440' }}>{w}</div>
            )) : <div style={{ fontSize: 12, color: '#64748b' }}>Looking good — no critical issues!</div>}
          </div>
        </div>

        {/* Section Breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>📋 Section Breakdown</h3>
          {data.sections.map(section => {
            const isExpanded = expandedSection === section.id;
            const barColor = section.score >= 70 ? '#22c55e' : section.score >= 40 ? '#eab308' : '#ef4444';
            return (
              <div key={section.id} style={{ marginBottom: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Header */}
                <div onClick={() => toggleSection(section.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{section.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{section.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Weight: {section.weight}% · {section.findings.length} findings</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 100, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${section.score}%`, background: barColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: barColor, minWidth: 36, textAlign: 'right' }}>{section.score}</span>
                    <span style={{ fontSize: 14, color: '#94a3b8', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Findings */}
                    <div style={{ marginTop: 12 }}>
                      {section.findings.map((finding, i) => {
                        const typeColors = { positive: '#22c55e', warning: '#eab308', critical: '#ef4444', info: '#3b82f6' };
                        const typeIcons = { positive: '✓', warning: '⚠', critical: '✗', info: 'ℹ' };
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '8px 10px', background: `${typeColors[finding.type]}10`, borderRadius: 8, borderLeft: `3px solid ${typeColors[finding.type]}` }}>
                            <span style={{ color: typeColors[finding.type], fontWeight: 700, fontSize: 14, lineHeight: '18px' }}>{typeIcons[finding.type]}</span>
                            <div>
                              <span style={{ fontSize: 12, color: '#e2e8f0' }}>{finding.message}</span>
                              <span style={{ fontSize: 10, color: '#64748b', marginLeft: 8, textTransform: 'uppercase', fontWeight: 600 }}>({finding.impact})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tips */}
                    {section.tips.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', marginBottom: 8 }}>💡 Recommendations</div>
                        {section.tips.map((tip, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #8b5cf640' }}>{tip}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Score Radar Summary */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: '#e2e8f0' }}>🎯 Quick Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {data.sections.map(section => (
              <div key={section.id} style={{ textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{section.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: section.score >= 70 ? '#22c55e' : section.score >= 40 ? '#eab308' : '#ef4444' }}>{section.score}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{section.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
