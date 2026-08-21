import React from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallBanner() {
  const { showBanner, handleInstallClick, handleDismiss } = useInstallPrompt();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex items-center justify-between gap-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Install AI-Resume-Analyzer</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add to your home screen for quick and easy access!</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
