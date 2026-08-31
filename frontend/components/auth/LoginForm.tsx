'use client'

import React, { useState } from 'react'
import { User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'

export const LoginForm: React.FC = () => {
  const [identifier, setIdentifier] = useState('') // Can be username or email
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!identifier.trim()) {
      setError('Please enter your username or email address.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    // Submit login request with the flexible identifier
    setSuccess(true)
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl">
      <h2 className="text-xl font-bold mb-1 text-teal-400">Welcome Back</h2>
      <p className="text-xs text-slate-400 mb-6">Log in using your username or registered email.</p>

      {success ? (
        <div className="p-4 bg-teal-950/60 border border-teal-800 rounded-xl flex items-center gap-3 text-teal-300 text-sm">
          <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
          <span>Login successful! Redirecting to your dashboard...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Identifier Field (Username or Email) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Username or Email</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="johndoe or john@example.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 mt-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-sm rounded-lg transition-colors"
          >
            Sign In
          </button>
        </form>
      )}
    </div>
  )
}
