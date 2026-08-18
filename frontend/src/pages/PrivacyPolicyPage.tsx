import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

export const PrivacyPolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | AI Resume Analyzer'
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0)
    }
  }, [])

  return (
    <main
      className="privacy-policy-page container my-5 px-3"
      style={{ maxWidth: '900px', margin: '0 auto', color: 'var(--card-text)' }}
    >
      <div
        className="card p-4 p-md-5"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Header Navigation Link */}
        <div className="mb-4">
          <Link
            to="/"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Back to Resume Analyzer
          </Link>
        </div>

        {/* Title */}
        <header
          className="mb-4 border-bottom pb-3"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <h1
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--heading-text)',
              marginBottom: '8px',
            }}
          >
            🔒 Privacy Policy
          </h1>
          <p style={{ color: 'var(--muted-text)', fontSize: 'var(--text-sm)', margin: 0 }}>
            Last Updated: August 2026 &bull; Effective Immediately
          </p>
        </header>

        {/* Summary Highlights */}
        <div
          className="p-3 mb-4 rounded"
          style={{
            background: 'var(--banner-bg)',
            border: '1px solid var(--banner-border)',
            color: 'var(--banner-text)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.6,
          }}
        >
          <strong>💡 Privacy Commitment Summary:</strong> We prioritize document confidentiality.
          Original uploaded resume files (PDF, DOCX, TXT) are processed temporarily in memory/server
          temporary storage solely for text extraction and are <strong>immediately deleted</strong>{' '}
          from server storage. We do not sell your personal data or keep permanent copies of your
          original files.
        </div>

        {/* Section 1: Introduction */}
        <section className="mb-4">
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--heading-text)', fontWeight: 600 }}>
            1. Overview
          </h2>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}>
            Welcome to <strong>AI Resume Analyzer</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or
            &ldquo;us&rdquo;). This Privacy Policy explains how our application collects, processes,
            stores, and protects your information when you upload resumes, create an account, or use
            our ATS scoring features.
          </p>
        </section>

        {/* Section 2: Resume File Handling & Retention */}
        <section className="mb-4 border-top pt-4" style={{ borderColor: 'var(--surface-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--heading-text)', fontWeight: 600 }}>
            2. Resume File Handling & Retention
          </h2>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}>
            We adhere strictly to a minimal data retention model for document files:
          </p>
          <ul style={{ paddingLeft: '1.25rem', fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
            <li className="mb-2">
              <strong>Temporary Processing &amp; Immediate File Deletion:</strong> When you upload a
              resume file (PDF, DOCX, or TXT) or provide a shareable document URL, the file is saved
              temporarily in server storage (<code>tmp/</code>) for the sole purpose of extracting
              plain text. Immediately after text extraction completes (or if an error occurs), the
              uploaded document file is <strong>permanently deleted from disk</strong>.
            </li>
            <li className="mb-2">
              <strong>No Raw File Storage:</strong> We do <em>not</em> store your original PDF,
              DOCX, or text files on our servers or cloud storage after the analysis request
              finishes.
            </li>
            <li className="mb-2">
              <strong>Extracted Analysis Data:</strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '6px' }}>
                <li>
                  <strong>Authenticated Users:</strong> The extracted text snippet, detected skills,
                  score, target career track, suggestions, and optional job description/cover letter
                  feedback are saved in our database to populate your personal analysis history and
                  enable version comparison features.
                </li>
                <li>
                  <strong>Guest Users:</strong> Analysis metrics are processed in real-time and
                  returned directly to your browser. No analysis records are created or saved in our
                  database for unauthenticated guest sessions.
                </li>
              </ul>
            </li>
          </ul>
        </section>

        {/* Section 3: Data We Collect */}
        <section className="mb-4 border-top pt-4" style={{ borderColor: 'var(--surface-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--heading-text)', fontWeight: 600 }}>
            3. Information We Collect
          </h2>
          <ul style={{ paddingLeft: '1.25rem', fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
            <li className="mb-2">
              <strong>Account Information:</strong> If you register an account, we collect your
              username, password (stored securely using PBKDF2 password hashing), and optional email
              address/profile avatar.
            </li>
            <li className="mb-2">
              <strong>Resume Content &amp; Job Details:</strong> Text content extracted from
              uploaded resumes, targeted career tracks, and job descriptions submitted for ATS
              evaluation.
            </li>
            <li className="mb-2">
              <strong>Security &amp; Bot Prevention:</strong> CAPTCHA validation tokens are verified
              server-side during signup and login to protect against automated spam attacks.
            </li>
            <li className="mb-2">
              <strong>Application Logs &amp; Error Monitoring:</strong> In the event of system
              errors, diagnostic telemetry (e.g., Sentry) redacts sensitive personal fields (such as
              email, phone numbers, addresses, and resume text) before logging.
            </li>
          </ul>
        </section>

        {/* Section 4: How We Use Your Data */}
        <section className="mb-4 border-top pt-4" style={{ borderColor: 'var(--surface-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--heading-text)', fontWeight: 600 }}>
            4. How We Use Your Information
          </h2>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}>
            Your information is processed strictly for the following purposes:
          </p>
          <ul style={{ paddingLeft: '1.25rem', fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
            <li>
              Calculating ATS compatibility scores and identifying skill gaps against targeted
              career roles.
            </li>
            <li>
              Providing actionable recommendations, cover letter feedback, and interview preparation
              questions.
            </li>
            <li>
              Maintaining account authentication and enabling analysis history tracking for
              logged-in users.
            </li>
            <li>
              Preventing abuse, rate-limiting spam requests, and maintaining platform security.
            </li>
          </ul>
          <p
            className="mt-2"
            style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}
          >
            <strong>
              We never sell, rent, share, or monetize your resume data or personal information to
              third-party recruiters, advertisers, or data brokers.
            </strong>
          </p>
        </section>

        {/* Section 5: Data Deletion & User Rights */}
        <section className="mb-4 border-top pt-4" style={{ borderColor: 'var(--surface-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--heading-text)', fontWeight: 600 }}>
            5. Your Data Control &amp; Deletion Rights
          </h2>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}>
            You maintain complete control over your stored analysis data:
          </p>
          <ul style={{ paddingLeft: '1.25rem', fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
            <li className="mb-2">
              <strong>Delete Individual Analysis Entries:</strong> Registered users can remove
              specific past resume analyses at any time via the History sidebar.
            </li>
            <li className="mb-2">
              <strong>Clear Entire History:</strong> You can wipe your entire analysis history in
              one click through the History panel settings.
            </li>
            <li className="mb-2">
              <strong>Account Removal:</strong> You may request account or profile data removal by
              contacting project maintainers.
            </li>
          </ul>
        </section>

        {/* Section 6: Cookies & Local Storage */}
        <section className="mb-4 border-top pt-4" style={{ borderColor: 'var(--surface-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--heading-text)', fontWeight: 600 }}>
            6. Cookies &amp; Local Storage
          </h2>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}>
            We use browser local storage and essential cookies solely for core application features:
          </p>
          <ul style={{ paddingLeft: '1.25rem', fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
            <li>Storing your UI display preferences (e.g., Light or Dark mode setting).</li>
            <li>Maintaining secure authentication sessions via JSON Web Tokens (JWT).</li>
            <li>Storing temporary cookie consent preferences.</li>
          </ul>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}>
            We do not use advertising, tracking, or cross-site profiling cookies.
          </p>
        </section>

        {/* Section 7: Updates & Contact */}
        <section className="border-top pt-4" style={{ borderColor: 'var(--surface-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--heading-text)', fontWeight: 600 }}>
            7. Contact &amp; Open Source Notice
          </h2>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--card-text)' }}>
            AI Resume Analyzer is an open-source project. If you have questions regarding this
            Privacy Policy or data security practices, please open an issue on our official{' '}
            <a
              href="https://github.com/Muskankr/AI-Resume-Analyzer"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary)' }}
            >
              GitHub Repository
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}

export default PrivacyPolicyPage
