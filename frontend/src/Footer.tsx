import {  } from 'lucide-react'

const REPO_URL = 'https://github.com/Muskankr/AI-Resume-Analyzer'
const LINKEDIN_URL = 'https://www.linkedin.com/in/muskan-kumari-76361b378'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="app-footer"
      style={{
        marginTop: '80px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(30, 30, 47, 0.8)',
        padding: '40px 20px 20px',
      }}
    >
      <div
        className="container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          textAlign: 'left',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Column 1: Brand & Info */}
        <div>
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: 'var(--font-size-base)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🚀 AI Resume Analyzer
          </h4>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--footer-text)',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            Helping you beat ATS filters and land more interviews.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h5
            style={{
              margin: '0 0 16px 0',
              fontSize: 'var(--font-size-sm)',
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Navigation
          </h5>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <li>
              <a
                href="#"
                style={{
                  color: '#94a3b8',
                  fontSize: 'var(--font-size-sm)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                className="footer-link"
              >
                Workspace Top
              </a>
            </li>
            <li>
              <a
                href="#roleSelect"
                style={{
                  color: '#94a3b8',
                  fontSize: 'var(--font-size-sm)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                className="footer-link"
              >
                Career Tracks
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Repository & Meta */}
        <div>
          <h5
            style={{
              margin: '0 0 16px 0',
              fontSize: 'var(--font-size-sm)',
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Repository Details
          </h5>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <li>
              <a
                href={`${REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#94a3b8',
                  fontSize: 'var(--font-size-sm)',
                  textDecoration: 'none',
                }}
                className="footer-link"
              >
                📄 MIT License
              </a>
            </li>
            <li>
              <a
                href={`${REPO_URL}/commits/main`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#94a3b8',
                  fontSize: 'var(--font-size-sm)',
                  textDecoration: 'none',
                }}
                className="footer-link"
              >
                🔧 System Changelog
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: Social Interfaces */}
        <div>
          <h5
            style={{
              margin: '0 0 16px 0',
              fontSize: 'var(--font-size-sm)',
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Connect
          </h5>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              style={{
                fontSize: '20px',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              className="footer-icon-link"
            >
              🐙
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn Profile"
              style={{
                fontSize: '20px',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              className="footer-icon-link"
            >
              💼
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Section */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '40px auto 0',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
          &copy; {currentYear} AI Resume Analyzer. All architectural systems operational.
        </p>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
          Built with React & TypeScript
        </p>
      </div>
    </footer>
  )
}
