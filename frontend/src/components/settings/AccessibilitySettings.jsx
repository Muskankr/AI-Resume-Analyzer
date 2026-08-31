import React from 'react';
import { useMotion } from '../../context/MotionContext';

export default function AccessibilitySettings() {
  const { isReducedMotion, toggleReducedMotion } = useMotion();

  return (
    <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-white max-w-md shadow-lg">
      <h3 className="text-md font-bold mb-1">Display & Accessibility</h3>
      <p className="text-xs text-slate-400 mb-6">Customize visual behaviors to mitigate tracking latency or dynamic motion strain parameters.</p>

      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/60">
        <div>
          <span className="block text-sm font-semibold">Reduce Motion Mode</span>
          <span className="block text-[11px] text-slate-400 mt-0.5">Minimizes complex animations, score reveals, and theme sliding micro-interactions.</span>
        </div>
        
        <button
          onClick={toggleReducedMotion}
          aria-pressed={isReducedMotion}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${isReducedMotion ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ease-in-out ${isReducedMotion ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
}
