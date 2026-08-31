import React from 'react';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

export default function SuggestionSpeaker({ suggestionText }) {
  const { isSupported, isPlaying, toggleSpeech } = useTextToSpeech();

  // Gracefully fallback without UI distortion if the user's browser sandbox lacks SpeechSynthesis
  if (!isSupported) {
    return (
      <span className="text-[10px] text-slate-500 italic" title="Web Speech API not supported on this browser context.">
        🎙️ Audio unavailable
      </span>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => toggleSpeech(suggestionText)}
        className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
          isPlaying 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/80'
        }`}
        aria-label={isPlaying ? "Stop reading suggestion aloud" : "Read suggestion aloud via Text-to-Speech"}
      >
        <span>{isPlaying ? '⏹️ Pause Readback' : '🔊 Listen'}</span>
      </button>
    </div>
  );
}
