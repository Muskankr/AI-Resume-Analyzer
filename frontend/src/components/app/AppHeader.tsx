import React from 'react'
import { Sparkles, Sun, Moon, Eye, User as UserIcon, History, Layers } from 'lucide-react'
import type { AuthUser } from '../../hooks/useAuth'

export type Theme = 'light' | 'dark' | 'high-contrast'

export interface AppHeaderProps {
  theme: Theme
  onToggleTheme: () => void
  user: AuthUser | null
  onOpenAuthModal: () => void
  onOpenProfile: () => void
  onOpenHistory: () => void
  onOpenCompare: () => void
  onOpenBulkModal: () => void
  unreadCount?: number
  hasWhatsNewUpdate?: boolean
  onOpenWhatsNew?: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  onToggleTheme,
  user,
  onOpenAuthModal,
  onOpenProfile,
  onOpenHistory,
  onOpenCompare,
  onOpenBulkModal,
  unreadCount = 0,
  hasWhatsNewUpdate = false,
  onOpenWhatsNew,
}) => {
  return (
    <header className="app-header-container" data-testid="app-header">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              AI Resume Analyzer
            </h1>
            <p className="text-xs text-slate-400 font-medium">Smart ATS Optimization & Insights</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasWhatsNewUpdate && onOpenWhatsNew && (
            <button
              type="button"
              onClick={onOpenWhatsNew}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              aria-label="What's New updates"
            >
              <Sparkles size={14} />
              <span>What's New</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBulkModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Bulk Analysis"
          >
            <Layers size={15} />
            <span className="hidden sm:inline">Bulk Compare</span>
          </button>

          <button
            type="button"
            onClick={onOpenCompare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Compare Saved Versions"
          >
            <span>Compare Versions</span>
          </button>

          {/* History Sidebar Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="relative inline-flex items-center justify-center p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Analysis History"
            aria-label="Toggle analysis history"
          >
            <History size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={`Switch theme (current: ${theme})`}
            title={`Switch theme (current: ${theme})`}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-amber-400" />
            ) : theme === 'high-contrast' ? (
              <Eye size={18} className="text-indigo-400" />
            ) : (
              <Moon size={18} className="text-slate-600" />
            )}
          </button>

          {/* User Auth Profile Button */}
          {user ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase">
                {user.username.charAt(0)}
              </div>
              <span className="max-w-[100px] truncate">{user.username}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <UserIcon size={15} />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
