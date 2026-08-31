'use client'

import React, { useState } from 'react'
import { Mail, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'

export const SignupForm: React.FC = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Please provide a valid username.')
      return
    }

    if (!email.trim() || !validateEmail(email)) {
      setError('Please enter a valid email address format (e.g., user@example.com).')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    // Proceed with registration API call
    setSuccess(true)
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl">
      <h2 className="text-xl font-bold mb-1 text-teal-400">Create Account</h2>
      <p className="text-xs text-slate-400 mb-6">
        Enter your details to register for AI-Resume-Analyzer.
      </p>

      {success ? (
        <div className="p-4 bg-teal-950/60 border border-teal-800 rounded-xl flex items-center gap-3 text-teal-300 text-sm">
          <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
          <span>Registration successful! Please verify your inbox for confirmation.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <span className="text-[10px] text-slate-500">Your unique public profile handle.</span>
          </div>

          {/* Distinct Email Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <span className="text-[10px] text-slate-500">
              Used for login, notifications, and password recovery.
            </span>
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
            Create Account
          </button>
        </form>
      )}
    </div>
  )
}
