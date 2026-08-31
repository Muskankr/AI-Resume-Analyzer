import React from 'react'
import { Link } from 'react-router-dom'
import { Footer } from '../../Footer'

export const AppFooterSection: React.FC = () => {
  return (
    <footer className="app-footer-wrapper mt-16 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
      <Footer />
    </footer>
  )
}
