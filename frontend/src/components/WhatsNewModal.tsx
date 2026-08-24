import React, { useEffect } from 'react';
import { LATEST_RELEASE_HIGHLIGHTS, WhatsNewVersionState } from './WhatsNewModel';

export interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    WhatsNewVersionState.markCurrentVersionSeen();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Icon Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Close What's New modal"
        >
          ✕
        </button>

        {/* Header Badge & Title */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-full border border-purple-500/30 uppercase tracking-wider">
              {LATEST_RELEASE_HIGHLIGHTS.badge}
            </span>
            <span className="text-slate-400 text-xs font-mono">{LATEST_RELEASE_HIGHLIGHTS.releaseDate}</span>
          </div>
          <h2 id="whats-new-title" className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400">
            What's New in AI Resume Analyzer
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {LATEST_RELEASE_HIGHLIGHTS.tagline}
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {LATEST_RELEASE_HIGHLIGHTS.features.map(item => (
            <div key={item.id} className="flex gap-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
              <span className="text-2xl select-none">{item.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  {item.title}
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                    item.category === 'FEATURE' ? 'bg-emerald-500/20 text-emerald-400' :
                    item.category === 'ENHANCEMENT' ? 'bg-cyan-500/20 text-cyan-400' :
                    item.category === 'SECURITY' ? 'bg-rose-500/20 text-rose-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {item.category}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500 font-mono">
            Check <a href="/CHANGELOG.md" className="text-purple-400 hover:underline">CHANGELOG.md</a> for detailed release notes.
          </span>
          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Got It, Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
};
