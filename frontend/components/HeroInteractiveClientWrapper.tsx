'use client'

import React, { useState } from 'react'

export const HeroInteractiveClientWrapper = () => {
  const [demoState, setDemoState] = useState(false)

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center">
      <p className="text-xs text-teal-400 font-semibold uppercase tracking-wider mb-2">
        Interactive App Preview
      </p>
      <button
        onClick={() => setDemoState(!demoState)}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
      >
        {demoState ? 'Interactive Widget Active 🚀' : 'Click to Test Interactive State'}
      </button>
    </div>
  )
}
