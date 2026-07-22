import { Target } from 'lucide-react'

export function NotFound() {
  return (
    <div
      className="container mt-5 px-3"
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="main-card text-center mx-auto p-5"
        style={{ width: '100%', maxWidth: '600px' }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>
          <Target size={64} style={{ color: '#6366f1' }} />
        </div>

        <h1
          className="mb-3 app-main-title"
          style={{ fontSize: 'calc(1.5rem + 1vw)', wordBreak: 'break-word' }}
        >
          404 — Page Not Found
        </h1>

        {/* Using actual existing CSS variables like var(--card-text) */}
        <p
          className="hero-description mb-4"
          style={{ color: 'var(--card-text)', opacity: 0.8, fontSize: 'var(--font-size-base)' }}
        >
          Oops! It looks like you've navigated off the tracking path. The page you are looking for
          doesn't exist or has been moved.
        </p>

        <div>
          <a
            href="/"
            className="analyze-btn"
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              fontSize: 'var(--font-size-base)',
              fontWeight: '700',
              backgroundColor: '#6366f1',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)',
              transition: 'transform 0.2s ease, background-color 0.2s ease',
            }}
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}

export default NotFound
