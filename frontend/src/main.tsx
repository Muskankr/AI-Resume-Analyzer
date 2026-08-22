import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import ErrorBoundary from './components/ErrorBoundary'
import { BrowserRouter } from 'react-router-dom'
import ApiDocs from "./pages/Apidocs";


if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [],
    beforeSend(event: any) {
      // Redact sensitive data from the event payload
      if (event.request && event.request.data) {
        const redactKeys = [
          'resume',
          'email',
          'phone',
          'address',
          'target_role',
          'extracted_data',
          'filename',
        ]
        try {
          const data =
            typeof event.request.data === 'string'
              ? JSON.parse(event.request.data)
              : event.request.data

          for (const key of redactKeys) {
            if (data[key]) {
              data[key] = '[Filtered]'
            }
          }
          event.request.data = typeof event.request.data === 'string' ? JSON.stringify(data) : data
        } catch {
          // If parsing fails, just clear the data completely to be safe
          event.request.data = '[Filtered]'
        }
      }
      return event
    },
  })
}

import { Routes, Route } from 'react-router-dom'
import { TermsOfService } from './pages/TermsOfService'
import { ProfilePage } from './components/ProfilePage'
import { SalaryInsightsDashboard } from './pages/SalaryInsightsDashboard'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/*" element={<App />} />
          <Route path="/docs" element={<ApiDocs />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/salary-insights" element={<SalaryInsightsDashboard />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
      .catch((err) => console.error('Service Worker registration failed:', err))
  })
}
