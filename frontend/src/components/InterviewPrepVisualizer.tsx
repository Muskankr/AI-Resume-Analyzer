import { useState, useMemo } from 'react';
import { InterviewPrepService } from './InterviewPrepService';

export default function InterviewPrepVisualizer() {
  const [service] = useState(() => new InterviewPrepService());
  const [role, setRole] = useState<string>(service.getState().getDefaultRole());

  const prepSet = useMemo(() => {
    return service.generatePrepSet(role);
  }, [service, role]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-violet-500/20 text-violet-400 text-xs font-semibold rounded-full border border-violet-500/30 uppercase tracking-wider">
              AI Interview Prep & STAR Method Generator
            </span>
            <span className="text-slate-400 text-xs font-mono">v2.9.0 • Resume-Tailored Questions</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400">
            Interview Question & STAR Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Generate tailored technical and behavioral interview questions paired with structured STAR method answer templates based on your target role.
          </p>
        </div>
      </header>

      {/* Role Input */}
      <div className="mb-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl max-w-xl">
        <label className="text-xs text-slate-400 block mb-2 font-medium">Target Engineering Role</label>
        <input
          type="text"
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Questions & STAR Method List */}
      <div className="space-y-6">
        {prepSet.questions.map(q => (
          <div key={q.questionId} className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 bg-violet-500/20 text-violet-300 text-xs font-bold rounded font-mono">
                  {q.questionId}
                </span>
                <span className="text-xs text-slate-400 font-mono font-semibold uppercase">{q.category.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-xs text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                Target: {q.targetSkill}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-100">{q.questionText}</h3>

            {/* STAR Framework */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-1">Situation</div>
                <p className="text-xs text-slate-300 leading-relaxed">{q.starOutline.situation}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1">Task</div>
                <p className="text-xs text-slate-300 leading-relaxed">{q.starOutline.task}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Action</div>
                <p className="text-xs text-slate-300 leading-relaxed">{q.starOutline.action}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Result</div>
                <p className="text-xs text-slate-300 leading-relaxed">{q.starOutline.result}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
