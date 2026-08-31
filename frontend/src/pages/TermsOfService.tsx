import { useEffect } from 'react'

const EFFECTIVE_DATE = 'August 1, 2026'
const CONTACT_EMAIL = 'support@ai-resume-analyzer.dev'

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: '40px' }}>
    <h2
      style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--color-primary, #818cf8)',
        marginBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '8px',
      }}
    >
      {title}
    </h2>
    <div style={{ lineHeight: '1.8', color: 'var(--text-secondary, #94a3b8)' }}>{children}</div>
  </section>
)

export const TermsOfService: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms of Service | AI Resume Analyzer'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <main
      id="main-content"
      style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '60px 24px 80px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '48px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
          }}
        >
          Terms of Service
        </h1>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
          Effective date:{' '}
          <strong style={{ color: 'var(--color-primary, #818cf8)' }}>{EFFECTIVE_DATE}</strong>
        </p>
        <p
          style={{
            color: 'var(--text-secondary, #94a3b8)',
            marginTop: '16px',
            maxWidth: '600px',
            margin: '16px auto 0',
          }}
        >
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of AI Resume Analyzer
          (&ldquo;the Service&rdquo;). By using the Service you agree to these Terms. If you
          disagree, please do not use the Service.
        </p>
      </div>

      {/* Sections */}
      <Section title="1. Who Can Use AI Resume Analyzer">
        <p>
          The Service is open to anyone aged <strong>13 or older</strong>. If you are under 18, you
          confirm that a parent or legal guardian has reviewed and agreed to these Terms on your
          behalf.
        </p>
        <p style={{ marginTop: '10px' }}>
          You may not use the Service if you are prohibited from doing so under the laws of your
          country or jurisdiction.
        </p>
      </Section>

      <Section title="2. What the Service Does">
        <p>
          AI Resume Analyzer is an <strong>open-source tool</strong> that parses your resume,
          calculates an ATS compatibility score, extracts detected skills, and generates improvement
          suggestions. All processing happens server-side via our Django REST API.
        </p>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>PDF resume files are parsed using PDFPlumber.</li>
          <li>ATS scores are computed against curated keyword sets per career track.</li>
          <li>No AI-generated content is claimed to be career or legal advice.</li>
        </ul>
        <p style={{ marginTop: '10px' }}>
          Results are informational only. We make no guarantees about interview outcomes or job
          placement.
        </p>
      </Section>

      <Section title="3. Your Account">
        <p>
          Creating an account is <strong>optional</strong>. Registered users get access to analysis
          history, score tracking, and sharing features.
        </p>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>You are responsible for keeping your password secure.</li>
          <li>You must not share your account credentials with others.</li>
          <li>Notify us immediately if you suspect unauthorized access to your account.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree to use the Service only for lawful, personal purposes. You must not:</p>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Upload files that contain malware, exploits, or harmful content.</li>
          <li>Attempt to reverse-engineer, scrape, or automate bulk requests to the API.</li>
          <li>
            Impersonate another person or upload someone else&rsquo;s resume without their consent.
          </li>
          <li>Use the Service to generate spam, misleading profiles, or fraudulent content.</li>
          <li>Circumvent rate limits or access controls intentionally.</li>
        </ul>
        <p style={{ marginTop: '10px' }}>
          Violations may result in immediate account suspension and, where applicable, reporting to
          relevant authorities.
        </p>
      </Section>

      <Section title="5. Resume Data and Privacy">
        <p>
          Resume files you upload are processed to generate analysis results.{' '}
          <strong>Files are not permanently stored</strong> unless you are a logged-in user who has
          opted into history. Temporary files are deleted after processing.
        </p>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>
            Logged-in users: your file name, score, detected skills, and suggestions are stored in
            our database to power history and comparison features.
          </li>
          <li>
            Logged-out users: no personally identifiable data is retained after the session ends.
          </li>
        </ul>
        <p style={{ marginTop: '10px' }}>
          We do not sell or share your resume data with third parties. For more details, please read
          our Privacy Policy (coming soon).
        </p>
      </Section>

      <Section title="6. Intellectual Property">
        <p>
          AI Resume Analyzer is released under the{' '}
          <a
            href="https://github.com/Muskankr/AI-Resume-Analyzer/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#818cf8', textDecoration: 'underline' }}
          >
            MIT License
          </a>
          . The source code is freely available on GitHub. You are welcome to fork, modify, and
          contribute under the terms of that license.
        </p>
        <p style={{ marginTop: '10px' }}>
          You retain full ownership of your resume content. By uploading, you grant us a limited,
          non-exclusive, royalty-free license to process your file solely to provide the Service.
        </p>
      </Section>

      <Section title="7. Disclaimer of Warranties">
        <p>
          The Service is provided <strong>&ldquo;as is&rdquo;</strong> and{' '}
          <strong>&ldquo;as available&rdquo;</strong> without warranties of any kind, express or
          implied. We do not warrant that:
        </p>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>
            ATS scores are accurate or reflect any specific employer&rsquo;s screening system.
          </li>
          <li>The Service will be uninterrupted, error-free, or secure at all times.</li>
          <li>Suggestions will result in employment outcomes.</li>
        </ul>
        <p style={{ marginTop: '10px' }}>
          Use the Service as one of many tools in your job-search process, not as the only measure
          of your resume quality.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          To the fullest extent permitted by applicable law, AI Resume Analyzer and its contributors
          shall not be liable for any indirect, incidental, special, or consequential damages
          arising from your use of (or inability to use) the Service. Our total liability to you for
          any cause shall not exceed <strong>USD $0</strong> (the Service is free to use).
        </p>
      </Section>

      <Section title="9. Changes to These Terms">
        <p>
          We may update these Terms from time to time. When we do, we will update the effective date
          at the top and, for material changes, provide notice via the application or repository.
          Continued use after changes constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          If you have questions about these Terms, please reach out at{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            style={{ color: '#818cf8', textDecoration: 'underline' }}
          >
            {CONTACT_EMAIL}
          </a>{' '}
          or open an issue in our{' '}
          <a
            href="https://github.com/Muskankr/AI-Resume-Analyzer/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#818cf8', textDecoration: 'underline' }}
          >
            GitHub repository
          </a>
          .
        </p>
      </Section>

      <div
        style={{
          marginTop: '48px',
          padding: '20px',
          background: 'rgba(129,140,248,0.08)',
          borderRadius: '10px',
          border: '1px solid rgba(129,140,248,0.2)',
          textAlign: 'center',
          color: 'var(--text-secondary, #94a3b8)',
          fontSize: '0.88rem',
        }}
      >
        These Terms are written in plain language to be accessible to all users. They are not a
        substitute for legal counsel. If you are uncertain about anything, please contact us.
      </div>
    </main>
  )
}
