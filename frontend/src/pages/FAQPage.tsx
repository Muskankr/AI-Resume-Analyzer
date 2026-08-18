import { useEffect, useState } from 'react'

interface FAQItem {
  question: string
  answer: React.ReactNode
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Is my resume stored after I upload it?',
    answer: (
      <>
        <strong>No, not by default.</strong> If you upload without logging in, your resume file
        is processed in memory and the temporary file is deleted immediately after analysis.
        If you are logged in, only your{' '}
        <em>file name, ATS score, detected skills, and suggestions</em> are saved to your
        history — the raw PDF is never stored permanently.
      </>
    ),
  },
  {
    question: 'What file types are supported?',
    answer: (
      <>
        Currently the analyzer supports <strong>PDF</strong> files. DOCX (Word) and plain-text
        TXT support is on the roadmap. For best results, ensure your PDF is text-based (not a
        scanned image). Image-only PDFs cannot be parsed and will return an empty text result.
      </>
    ),
  },
  {
    question: 'How is the ATS score calculated?',
    answer: (
      <>
        The score is calculated by matching keywords in your resume against a curated list of
        technical skills and buzzwords relevant to your selected <strong>career track</strong>{' '}
        (Frontend Developer, Backend Developer, Data Analyst, etc.). A higher percentage of
        matched keywords produces a higher score. The score is a rough proxy — real ATS systems
        vary by employer, but keyword density is always a key factor.
      </>
    ),
  },
  {
    question: 'Is the ATS score the same as what a real employer ATS would give me?',
    answer: (
      <>
        Not exactly. Real ATS products (Workday, Greenhouse, Lever, etc.) each have proprietary
        algorithms. Our score is a <strong>heuristic approximation</strong> designed to surface
        missing keywords and improvement opportunities. Think of it as a useful signal, not an
        official rating. Use it alongside other feedback.
      </>
    ),
  },
  {
    question: 'What career tracks are available?',
    answer: (
      <>
        Currently: <strong>Frontend Developer</strong>, <strong>Backend Developer</strong>, and{' '}
        <strong>Data Analyst</strong>. More tracks (DevOps, Machine Learning, Product Manager,
        etc.) are planned. If you would like a specific track added, open an issue on{' '}
        <a
          href="https://github.com/Muskankr/AI-Resume-Analyzer/issues"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#818cf8' }}
        >
          GitHub
        </a>
        .
      </>
    ),
  },
  {
    question: 'Do I need an account to use the analyzer?',
    answer: (
      <>
        <strong>No account is required</strong> for basic analysis. You can upload a resume and
        get an ATS score, skill breakdown, and suggestions without logging in. Creating an
        account unlocks <em>analysis history</em>, score tracking over time, resume version
        comparison, and the ability to share results with a link.
      </>
    ),
  },
  {
    question: 'Can I compare two versions of my resume?',
    answer: (
      <>
        Yes! Logged-in users can use the <strong>Compare Versions</strong> feature to upload two
        resume files side-by-side and see a diff of scores, matched skills, and suggestions.
        This is useful when iterating on your resume between job applications.
      </>
    ),
  },
  {
    question: 'Why does my resume score seem lower than I expected?',
    answer: (
      <>
        A few common reasons:
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>
            <strong>Wrong career track selected</strong> — make sure the track matches the role
            you are applying for.
          </li>
          <li>
            <strong>Skills listed differently</strong> — &ldquo;ReactJS&rdquo; vs
            &ldquo;React.js&rdquo; vs &ldquo;React&rdquo; may be treated differently. Use
            canonical names.
          </li>
          <li>
            <strong>Scanned/image PDF</strong> — text cannot be extracted from image-only PDFs.
          </li>
          <li>
            <strong>Missing keywords</strong> — check the &ldquo;Missing Skills&rdquo; section
            and add any applicable technologies to your resume.
          </li>
        </ul>
      </>
    ),
  },
  {
    question: 'What are the "Suggestions" I receive?',
    answer: (
      <>
        Suggestions are <strong>improvement recommendations</strong> generated based on your
        missing skills and detected gaps relative to the selected career track. They include
        missing keywords to add, formatting tips, and certification recommendations. You can
        copy all suggestions to your clipboard with one click.
      </>
    ),
  },
  {
    question: 'Is AI Resume Analyzer free and open source?',
    answer: (
      <>
        Yes — completely free and released under the{' '}
        <a
          href="https://github.com/Muskankr/AI-Resume-Analyzer/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#818cf8' }}
        >
          MIT License
        </a>
        . The full source code is available on{' '}
        <a
          href="https://github.com/Muskankr/AI-Resume-Analyzer"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#818cf8' }}
        >
          GitHub
        </a>
        . Contributions are welcome — see{' '}
        <a
          href="https://github.com/Muskankr/AI-Resume-Analyzer/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#818cf8' }}
        >
          CONTRIBUTING.md
        </a>{' '}
        to get started.
      </>
    ),
  },
  {
    question: 'How do I share my analysis results?',
    answer: (
      <>
        After running an analysis while logged in, use the <strong>Share Result</strong> button
        to generate a unique shareable link. Anyone with the link can view your score and
        suggestions — no account needed to view a shared result.
      </>
    ),
  },
  {
    question: 'I found a bug or have a feature request. Where do I report it?',
    answer: (
      <>
        Please open an issue on{' '}
        <a
          href="https://github.com/Muskankr/AI-Resume-Analyzer/issues"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#818cf8' }}
        >
          GitHub Issues
        </a>
        . For non-technical users, you can also use our{' '}
        <a href="/contact" style={{ color: '#818cf8' }}>
          Contact Us
        </a>{' '}
        form and we will triage it for you.
      </>
    ),
  },
]

const FAQAccordion: React.FC<{ item: FAQItem; index: number }> = ({ item, index }) => {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        borderRadius: '10px',
        overflow: 'hidden',
        border: `1px solid ${open ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.07)'}`,
        marginBottom: '12px',
        transition: 'border-color 0.25s ease',
        background: open ? 'rgba(129,140,248,0.06)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <button
        id={`faq-question-${index}`}
        aria-expanded={open}
        aria-controls={`faq-answer-${index}`}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          color: open ? '#c7d2fe' : 'var(--text-primary, #e2e8f0)',
          fontWeight: 600,
          fontSize: '0.97rem',
          lineHeight: '1.5',
          transition: 'color 0.2s',
        }}
      >
        <span>
          <span style={{ color: '#818cf8', marginRight: '10px', fontWeight: 700 }}>
            Q{index + 1}.
          </span>
          {item.question}
        </span>
        <span
          style={{
            fontSize: '1.1rem',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
            flexShrink: 0,
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          id={`faq-answer-${index}`}
          role="region"
          aria-labelledby={`faq-question-${index}`}
          style={{
            padding: '0 20px 18px 20px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: '1.8',
            fontSize: '0.93rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '14px',
          }}
        >
          {item.answer}
        </div>
      )}
    </div>
  )
}

export const FAQPage: React.FC = () => {
  useEffect(() => {
    document.title = 'FAQ | AI Resume Analyzer'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <main
      id="main-content"
      style={{
        maxWidth: '820px',
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
            marginBottom: '12px',
          }}
        >
          Frequently Asked Questions
        </h1>
        <p
          style={{
            color: 'var(--text-secondary, #94a3b8)',
            maxWidth: '560px',
            margin: '0 auto',
            lineHeight: '1.7',
          }}
        >
          Everything you need to know about how AI Resume Analyzer works. Click any question to
          expand the answer.
        </p>
      </div>

      {/* Accordion */}
      <div>
        {FAQ_ITEMS.map((item, i) => (
          <FAQAccordion key={i} item={item} index={i} />
        ))}
      </div>

      {/* Still have questions? */}
      <div
        style={{
          marginTop: '48px',
          padding: '28px',
          background: 'rgba(56,189,248,0.07)',
          border: '1px solid rgba(56,189,248,0.2)',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: '16px',
            fontSize: '0.95rem',
          }}
        >
          Still have a question that&rsquo;s not answered here?
        </p>
        <a
          href="/contact"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.93rem',
          }}
        >
          ✉️ Contact Us
        </a>
      </div>
    </main>
  )
}
