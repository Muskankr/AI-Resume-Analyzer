import React, { useState } from 'react';
import type { ExperienceLevel } from '../utils/experienceParser';

interface ExperienceLevelSelectorProps {
  selectedLevel: ExperienceLevel | null;
  onSelectLevel: (level: ExperienceLevel) => void;
  autoDetectedSuggestion: {
    estimatedYears: number;
    suggestedLevel: ExperienceLevel;
  } | null;
}

export const ExperienceLevelSelector: React.FC<ExperienceLevelSelectorProps> = ({
  selectedLevel,
  onSelectLevel,
  autoDetectedSuggestion,
}) => {
  // Lock tracking parameter once a user interacts directly with the input nodes
  const [hasManuallySelected, setHasManuallySelected] = useState<boolean>(false);

  const levels: ExperienceLevel[] = ['Junior', 'Mid', 'Senior', 'Lead'];

  const handleLevelSelection = (level: ExperienceLevel) => {
    setHasManuallySelected(true);
    onSelectLevel(level);
  };

  const handleAcceptSuggestion = () => {
    if (autoDetectedSuggestion) {
      onSelectLevel(autoDetectedSuggestion.suggestedLevel);
      setHasManuallySelected(true);
    }
  };

  // Surface suggestion prompts only if the user hasn't explicitly locking a choice yet
  const showSuggestionBanner = 
    autoDetectedSuggestion && 
    !hasManuallySelected && 
    selectedLevel !== autoDetectedSuggestion.suggestedLevel;

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">Target Experience Level</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleLevelSelection(level)}
              className={`rounded-lg p-3 text-sm font-medium border text-center transition-all ${
                selectedLevel === level
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestion System Banner */}
      {showSuggestionBanner && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5 text-blue-900 leading-normal">
            <span className="text-base">🚀</span>
            <div>
              <p className="font-semibold text-blue-950">We detected history metrics!</p>
              <p className="text-blue-800">
                Your resume reveals approximately <strong>{autoDetectedSuggestion.estimatedYears} years</strong> of activity. We suggest selecting <strong>{autoDetectedSuggestion.suggestedLevel}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAcceptSuggestion}
            className="shrink-0 ml-4 rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            Accept Suggestion
          </button>
        </div>
      )}
    </div>
  );
};
