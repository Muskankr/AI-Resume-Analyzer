import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Print CSS Styles (@media print)', () => {
  const cssPath = path.resolve(__dirname, 'index.css')
  const cssContent = fs.readFileSync(cssPath, 'utf-8')

  it('contains @media print block', () => {
    expect(cssContent).toContain('@media print')
  })

  it('hides non-essential UI elements like navbar, header, footer, buttons, and sidebars', () => {
    const printBlock = cssContent.slice(cssContent.indexOf('@media print'))

    expect(printBlock).toContain('.navbar')
    expect(printBlock).toContain('header')
    expect(printBlock).toContain('footer')
    expect(printBlock).toContain('.history-sidebar')
    expect(printBlock).toContain('button')
    expect(printBlock).toContain('display: none !important')
  })

  it('configures readability and pagination for score, skills, resume, and suggestions', () => {
    const printBlock = cssContent.slice(cssContent.indexOf('@media print'))

    expect(printBlock).toContain('.score-section')
    expect(printBlock).toContain('.suggestion-card')
    expect(printBlock).toContain('.skill-chip')
    expect(printBlock).toContain('.resume-preview')
    expect(printBlock).toContain('break-inside: avoid')
    expect(printBlock).toContain('page-break-inside: avoid')
  })
})
