import { Link } from 'react-router-dom'
import '../ReleaseNotes.css'

interface ReleaseItem {
  icon: string
  title: string
  description: string
  type: 'New' | 'Improved' | 'Fixed'
  issue?: string
}

interface Release {
  version: string
  date: string
  items: ReleaseItem[]
}

const releases: Release[] = [
  {
    version: 'Unreleased',
    date: 'August 2026',
    items: [
      {
        icon: '🔥',
        title: 'Opt-in Resume Roast Feedback',
        description:
          'Try a playful feedback mode that gives humorously constructive suggestions while keeping your resume improvement advice useful.',
        type: 'New',
        issue: '#497',
      },
      {
        icon: '📋',
        title: 'Action Plan & Checklist Export',
        description:
          'Export a prioritized improvement plan ranked by estimated ATS score impact in Markdown or PDF format.',
        type: 'New',
        issue: '#379',
      },
      {
        icon: '📦',
        title: 'Multi-Resume ZIP Export',
        description:
          'Download reports for multiple resumes at once in a single ZIP file containing individual PDF and JSON reports.',
        type: 'New',
        issue: '#495',
      },
      {
        icon: '📨',
        title: 'Weekly Resume Tips',
        description:
          'Opt in to a weekly email with a practical resume tip and a personalized suggestion for improving your ATS score.',
        type: 'New',
        issue: '#496',
      },
      {
        icon: '💾',
        title: 'Automatic Job Description Saving',
        description:
          'Your Job Description is automatically saved as a draft so you do not lose your work after refreshing or navigating away.',
        type: 'New',
        issue: '#533',
      },
      {
        icon: '🔒',
        title: 'Privacy & Consent Controls',
        description:
          'Choose whether to opt in to optional analytics and Resume Roast features. Optional data collection is off by default.',
        type: 'New',
        issue: '#536',
      },
      {
        icon: '🛡️',
        title: 'Privacy Policy',
        description:
          'A dedicated Privacy Policy explains data collection, document deletion, history controls, and cookie usage.',
        type: 'New',
        issue: '#470',
      },
      {
        icon: '📜',
        title: 'Terms of Service',
        description:
          'A new Terms of Service page explains acceptable use, account terms, data handling, intellectual property, and disclaimers.',
        type: 'New',
        issue: '#469',
      },
      {
        icon: '📱',
        title: 'Responsive Navigation',
        description:
          'Use the new mobile navigation menu with smooth animations, a backdrop overlay, Escape-key dismissal, and automatic closing on resize.',
        type: 'New',
        issue: '#245',
      },
      {
        icon: '🧭',
        title: 'First-Time Onboarding',
        description:
          'New users can now follow a guided walkthrough to understand the main Resume Analyzer features.',
        type: 'New',
      },
      {
        icon: '📈',
        title: 'Analysis Progress Indicator',
        description:
          'See your progress while your resume is being analyzed.',
        type: 'New',
      },
      {
        icon: '🔍',
        title: 'SEO Improvements',
        description:
          'Added sitemap and robots files to make the application easier for search engines to discover.',
        type: 'New',
        issue: '#354',
      },
      {
        icon: '📄',
        title: 'Improved Resume Preview',
        description:
          'See your selected resume name, file size, and file type immediately after choosing a file.',
        type: 'New',
        issue: '#140',
      },
      {
        icon: '⬆️',
        title: 'Improved Upload Experience',
        description:
          'The resume upload screen now has clearer steps, structured cards, and a more prominent call to action.',
        type: 'Improved',
        issue: '#67',
      },
      {
        icon: '🎯',
        title: 'Better Skill Matching',
        description:
          'Skill matching and missing-skill visualizations have been improved to make job requirements easier to understand.',
        type: 'Improved',
      },
      {
        icon: '📊',
        title: 'Refined Resume Analysis',
        description:
          'Improved the resume analysis workflow with clearer suggestions and a smoother overall experience.',
        type: 'Improved',
      },
      {
        icon: '🎨',
        title: 'UI & Visual Improvements',
        description:
          'Updated styling, landing page layout, scrollbars, navigation elements, and overall interface consistency.',
        type: 'Improved',
      },
      {
        icon: '⚡',
        title: 'Performance Improvements',
        description:
          'Optimized static images and reduced the total image bundle size by approximately 16.8% without visible quality loss.',
        type: 'Improved',
        issue: '#353',
      },
      {
        icon: '🔐',
        title: 'Stronger Password Security',
        description:
          'Password hashing now uses Argon2 as the primary method, while existing users can be transparently migrated from the previous method.',
        type: 'Improved',
        issue: '#478',
      },
      {
        icon: '🧪',
        title: 'Better Test Coverage',
        description:
          'Added frontend and backend coverage reporting and documented coverage thresholds.',
        type: 'Improved',
        issue: '#214',
      },
      {
        icon: '👓',
        title: 'Improved Text Readability',
        description:
          'Fixed faded or low-opacity text across statistics, How It Works cards, the upload area, and footer.',
        type: 'Fixed',
        issue: '#242',
      },
      {
        icon: '🔑',
        title: 'Better Password Manager Support',
        description:
          'Added appropriate autocomplete attributes to authentication and account forms for better password manager compatibility.',
        type: 'Fixed',
        issue: '#531',
      },
      {
        icon: '🐛',
        title: 'UI & Responsiveness Fixes',
        description:
          'Resolved various styling, responsiveness, and rendering issues across the application.',
        type: 'Fixed',
      },
      {
        icon: '🔧',
        title: 'Resume Analysis Fixes',
        description:
          'Fixed several bugs affecting resume analysis and result rendering.',
        type: 'Fixed',
      },
    ],
  },
]

function TypeBadge({ type }: { type: ReleaseItem['type'] }) {
  const badgeClass =
    type === 'New'
      ? 'release-badge release-badge--new'
      : type === 'Improved'
        ? 'release-badge release-badge--improved'
        : 'release-badge release-badge--fixed'

  return <span className={badgeClass}>{type}</span>
}

function ReleaseCard({
  release,
  latest = false,
}: {
  release: Release
  latest?: boolean
}) {
  return (
    <section
      className={`release-version ${
        latest ? 'release-version--latest' : ''
      }`}
    >
      <div className="release-version__header">
        <div>
          <div className="release-version__title-row">
            <h2>{release.version}</h2>

            {latest && (
              <span className="release-latest-badge">Latest</span>
            )}
          </div>

          <p className="release-version__date">{release.date}</p>
        </div>
      </div>

      <div className="release-items">
        {release.items.map((item) => (
          <article
            className="release-item"
            key={`${release.version}-${item.title}`}
          >
            <div className="release-item__icon" aria-hidden="true">
              {item.icon}
            </div>

            <div className="release-item__content">
              <div className="release-item__title">
                <h3>{item.title}</h3>
                <TypeBadge type={item.type} />
              </div>

              <p>{item.description}</p>

              {item.issue && (
                <span className="release-item__issue">
                  {item.issue}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function ReleaseNotes() {
  return (
    <div className="release-notes-page">
      <div className="release-notes-page__background" />

      <main className="release-notes-container">
        <header className="release-notes-header">
          <Link to="/" className="release-back-link">
            ← Back to Resume Analyzer
          </Link>

          <div className="release-notes-heading">
            <div className="release-notes-icon" aria-hidden="true">
              ✨
            </div>

            <div>
              <div className="release-notes-title-row">
                <h1>What's New</h1>
                <span className="release-current-version">
                  Latest
                </span>
              </div>

              <p>
                Latest releases and improvements to help you build a
                stronger resume.
              </p>
            </div>
          </div>

          <div className="release-header-divider" />
        </header>

        <section className="release-intro">
          <h2>Release Notes</h2>
          <p>
            See what&apos;s new, what&apos;s improved, and what we&apos;ve
            fixed across Resume Analyzer.
          </p>
        </section>

        <div className="release-list">
          {releases.map((release, index) => (
            <ReleaseCard
              key={release.version}
              release={release}
              latest={index === 0}
            />
          ))}
        </div>

        <footer className="release-notes-footer">
          <div>
            <span className="release-footer-icon">🚀</span>
            <strong>Stay tuned for more updates</strong>
          </div>

          <p>
            We&apos;re continuously improving Resume Analyzer to help you
            land more interviews.
          </p>
        </footer>
      </main>
    </div>
  )
}