import React, { useState, useEffect } from 'react';

interface JobDescriptionInputProps {
  value: string;
  onChange: (newValue: string) => void;
  maxCharacters?: number;
}

export const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value = '',
  onChange,
  maxCharacters = 2000,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isClipboardSupported, setIsClipboardSupported] = useState<boolean>(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    // Gracefully detect if the platform supports secure context clipboard reading
    if (typeof window !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      setIsClipboardSupported(true);
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // Enforce the strict backend character ceiling boundary right at the input loop
    if (text.length <= maxCharacters) {
      onChange(text);
    }
  };

  const handlePasteFromClipboard = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setPasteError(null);

    try {
      // Prompt user for explicit reading permissions 
      const textFromClipboard = await navigator.clipboard.readText();
      
      if (!textFromClipboard) {
        setPasteError('Clipboard is empty.');
        return;
      }

      // Enforce the backend character cap limit
      const currentLength = value.length;
      const spaceRemaining = maxCharacters - currentLength;

      if (spaceRemaining <= 0) {
        setPasteError('Character limit already reached.');
        return;
      }

      // Intercept and slice overflowing data segments
      const safeAppendText = textFromClipboard.slice(0, spaceRemaining);
      const consolidatedValue = value + safeAppendText;

      // Propagate the state change upstream
      onChange(consolidatedValue);

      if (textFromClipboard.length > spaceRemaining) {
        setPasteError(`Pasted text was truncated to fit the ${maxCharacters} character limit.`);
      }
    } catch (err: any) {
      console.warn('[CLIPBOARD_API_DENIED]:', err);
      // Fail safely if security exceptions or blockages occur
      setPasteError('Permission denied or clipboard access blocked.');
    }
  };

  const characterCount = value.length;
  const isNearLimit = characterCount >= maxCharacters * 0.9;
  const isAtLimit = characterCount === maxCharacters;

  return (
    <div 
      className={`w-full max-w-2xl rounded-xl border p-4 bg-white shadow-sm transition-all duration-200 ${
        isFocused 
          ? 'border-blue-500 ring-1 ring-blue-500/30' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Label and New Redesigned Icon Section */}
      <div className="mb-2.5 flex items-center justify-between text-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-base text-slate-500 flex items-center justify-center">
            📄
          </span>
          <label htmlFor="jobDescription" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Target Job Description
          </label>
        </div>
        
        {/* Quick Paste Context Button */}
        {isClipboardSupported && (
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            title="Paste text instantly from your system clipboard"
          >
            <span>📥</span>
            <span>Paste from Clipboard</span>
          </button>
        )}
      </div>

      {/* Input Text Area Wrapper */}
      <div className="relative">
        <textarea
          id="jobDescription"
          rows={6}
          value={value}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Redesigned Placeholder: Paste or type the core engineering skills, requirements, or complete job description profile here to begin analysis..."
          className="w-full resize-none bg-transparent py-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed min-h-[120px]"
        />
      </div>

      {/* Bottom Status Bar holding the validated Character Counter */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-2">
        <div className="flex items-center gap-3">
          {pasteError ? (
            <span className="text-[11px] font-medium text-amber-600 animate-fadeIn">{pasteError}</span>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              ATS analytical engine parses keywords automatically below.
            </p>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11px] text-slate-500 hover:text-slate-700 underline focus:outline-none cursor-pointer"
            >
              Clear Draft
            </button>
          )}
        </div>

        {/* Live Character Limit Counter Utility Element */}
        <div 
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded transition-colors duration-150 ${
            isAtLimit 
              ? 'bg-rose-50 text-rose-600' 
              : isNearLimit 
                ? 'bg-amber-50 text-amber-600' 
                : 'text-slate-400'
          }`}
          aria-label={`Character count: ${characterCount} out of ${maxCharacters}`}
        >
          {characterCount.toLocaleString()}/{maxCharacters.toLocaleString()}
        </div>
      </div>
    </div>
  );
};
