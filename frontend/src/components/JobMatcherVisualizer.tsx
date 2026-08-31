import React, { useState, useMemo } from 'react';
import { JobMatcherService } from './JobMatcherService';

export default function JobMatcherVisualizer() {
  const [service] = useState(() => new JobMatcherService());
  const [jdInput, setJdInput] = useState<string>(service.getState().getDefaultJdText());
  const [resumeInput, setResumeInput] = useState<string>(
    'Experienced Frontend Engineer skilled in React, TypeScript, Node.js, and Jest. Focused on UI performance and responsive design.'
  );

  const result = useMemo(() => {
    return service.analyzeJobMatch(resumeInput, jdInput);
  }, [service, resumeInput, jdInput]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30 uppercase tracking-wider">
              JD Matcher & Keyword Gap Engine
            </span>
            <span className="text-slate-400 text-xs font-mono">v2.6.0 • Semantic Keyword Frequency Analysis</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Job Description Matcher Suite
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Compare your resume text against targeted job postings to uncover missing technical skills, soft skills, and keyword density gaps.
          </p>
        </div>
      </header>

      {/* Match Score KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Overall JD Match Score</div>
          <div className="text-3xl font-extrabold text-emerald-400">{result.matchPercentage}%</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">{result.matchedKeywordsCount} of {result.totalJdKeywords} Keywords Matched</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Missing Keywords</div>
          <div className="text-3xl font-extrabold text-rose-400">{result.missingKeywordsCount}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Hard Skills & Certifications</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Action Items</div>
          <div className="text-3xl font-extrabold text-cyan-300">{result.suggestedActionItems.length}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Targeted Bullet Suggestions</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Target Job Description</h2>
          <textarea
            value={jdInput}
            onChange={e => setJdInput(e.target.value)}
            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Paste target Job Description here..."
          />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Your Resume Content</h2>
          <textarea
            value={resumeInput}
            onChange={e => setResumeInput(e.target.value)}
            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Paste your resume content here..."
          />
        </div>
      </div>

      {/* Keyword Gap Matrix */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Keyword Match Matrix</h2>
        <div className="flex flex-wrap gap-3">
          {result.keywords.map(kw => (
            <div
              key={kw.keyword}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                kw.foundInResume
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <span>{kw.foundInResume ? '✓' : '✗'}</span>
              <span className="font-semibold">{kw.keyword}</span>
              <span className="text-[10px] opacity-70">({kw.frequencyInJd}x in JD)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
