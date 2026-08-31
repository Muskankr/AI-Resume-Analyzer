import React from 'react';
import type { ReadinessReport } from '../utils/readinessEngine';

interface ReadinessDisplayProps {
  report: ReadinessReport;
  atsScore: number;
}

export const ReadinessDisplay: React.FC<ReadinessDisplayProps> = ({ report, atsScore }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">Holistic Readiness Summary</h3>
          <p className="text-xs text-slate-500 mt-0.5">{report.formulaApplied}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            report.label === 'Excellent Fit' ? 'bg-emerald-100 text-emerald-800' :
            report.label === 'Strong Fit' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {report.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Readiness Metric Block */}
        <div className="rounded-lg bg-white p-4 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Readiness Score</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{report.score}%</p>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        {/* Existing Baseline ATS Metric Block */}
        <div className="rounded-lg bg-white p-4 border border-slate-100 flex items-center justify-between opacity-80">
          <div>
            <p className="text-xs font-semibold text-slate-400">Raw ATS Keyword Fit</p>
            <p className="text-2xl font-black text-slate-600 mt-1">{atsScore}%</p>
          </div>
          <span className="text-2xl">🔍</span>
        </div>
      </div>

      {/* Explanatory Educational Disclaimer Block */}
      <div className="rounded-lg bg-blue-50 p-3 border border-blue-100 flex gap-2.5">
        <span className="text-sm">💡</span>
        <div className="text-xs text-blue-800 leading-relaxed">
          <p className="font-semibold">How is this different from the ATS score?</p>
          <p className="mt-0.5 text-blue-700">
            While your <strong>Raw ATS score</strong> measures direct keyword matching to the text layer, the 
            <strong> Readiness Score</strong> is a composite calculation. It combines your career path alignment, chronological 
            seniority timeline benchmarks, and text depth to evaluate your overall background suitability.
          </p>
          <p className="mt-1 text-slate-500 italic">{report.diagnosticFeedback}</p>
        </div>
      </div>
    </div>
  );
};
