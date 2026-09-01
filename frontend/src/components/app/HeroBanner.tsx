import React from 'react'
import { Sparkles, FileText, CheckCircle2, Shield } from 'lucide-react'

export interface HeroBannerProps {
  title?: string
  subtitle?: string
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  title = 'AI-Powered Resume Analysis & ATS Optimization',
  subtitle = 'Upload your resume to get instant ATS scores, missing keyword detection, formatting checks, and AI-tailored suggestions.',
}) => {
  return (
    <section className="hero-banner-section text-center max-w-4xl mx-auto py-8 px-4">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4 shadow-sm">
        <Sparkles size={14} className="animate-pulse" />
        <span>Instant Free Resume Scoring</span>
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
        {title}
      </h2>
      <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6 leading-relaxed">
        {subtitle}
      </p>

      <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <span>No Credit Card Required</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText size={15} className="text-blue-500" />
          <span>PDF, DOCX, TXT Supported</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield size={15} className="text-indigo-500" />
          <span>100% Secure & Private</span>
        </div>
      </div>
    </section>
  )
}
