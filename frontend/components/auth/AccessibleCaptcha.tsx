'use client'

import React, { useState, useEffect } from 'react'
import { Volume2, RefreshCw, Check, ShieldCheck } from 'lucide-react'

interface AccessibleCaptchaProps {
  onVerify: (verified: boolean) => void
}

export const AccessibleCaptcha: React.FC<AccessibleCaptchaProps> = ({ onVerify }) => {
  const [num1, setNum1] = useState(0)
  const [num2, setNum2] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [isAudioMode, setIsAudioMode] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState(false)

  // Generate a random simple math puzzle on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    generateNewPuzzle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generateNewPuzzle = () => {
    const n1 = Math.floor(Math.random() * 10) + 1
    const n2 = Math.floor(Math.random() * 10) + 1
    setNum1(n1)
    setNum2(n2)
    setUserAnswer('')
    setIsVerified(false)
    setError(false)
    onVerify(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setUserAnswer(val)

    const expected = num1 + num2
    if (parseInt(val, 10) === expected) {
      setIsVerified(true)
      setError(false)
      onVerify(true)
    } else {
      setIsVerified(false)
      onVerify(false)
    }
  }

  // Simulate or execute Web Speech API for audio accessibility
  const playAudioChallenge = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Security verification challenge. What is ${num1} plus ${num2}? Please type your answer.`
      )
      window.speechSynthesis.speak(utterance)
    } else {
      alert(`Audio Challenge: What is ${num1} plus ${num2}?`)
    }
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="captcha-input"
          className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
        >
          <ShieldCheck className="h-4 w-4 text-teal-400" />
          Security Verification (Anti-Bot)
        </label>

        {/* Mode Switcher / Accessible Alternative Trigger */}
        <button
          type="button"
          onClick={() => {
            setIsAudioMode(!isAudioMode)
            if (!isAudioMode) playAudioChallenge()
          }}
          className="text-xs font-medium text-teal-400 hover:underline flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded px-1"
          aria-label="Switch to audio challenge alternative"
        >
          <Volume2 className="h-3.5 w-3.5" />
          {isAudioMode ? 'Visual Puzzle' : 'Audio Challenge'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Challenge Prompt */}
        <div
          tabIndex={0}
          aria-live="polite"
          className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-sm font-mono text-teal-300 tracking-wider select-none flex items-center gap-2"
        >
          <span>
            What is {num1} + {num2}?
          </span>
          <button
            type="button"
            onClick={generateNewPuzzle}
            title="Generate new challenge"
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Input Field */}
        <div className="relative flex-1">
          <input
            id="captcha-input"
            type="number"
            value={userAnswer}
            onChange={handleInputChange}
            placeholder="Enter sum"
            aria-label={`Security verification: What is ${num1} plus ${num2}?`}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {isVerified && (
          <div className="text-teal-400 flex items-center gap-1 text-xs font-bold bg-teal-950/60 border border-teal-800 px-3 py-2 rounded-lg">
            <Check className="h-4 w-4" /> Verified
          </div>
        )}
      </div>

      {isAudioMode && (
        <p className="text-[11px] text-slate-400">
          Audio challenge active. Click the speaker icon or use your screen reader to hear the math
          problem read aloud.
        </p>
      )}
    </div>
  )
}
