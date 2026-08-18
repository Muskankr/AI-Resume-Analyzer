// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'

describe('Footer Component', () => {
  it('renders Footer links including Privacy Policy', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    )

    expect(
      screen.getByRole('heading', { level: 4, name: /AI Resume Analyzer/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute(
      'href',
      '/privacy'
    )
  })
})
