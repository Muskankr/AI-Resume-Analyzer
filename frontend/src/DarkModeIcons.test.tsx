import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Dark Mode Icons (#534)', () => {
  it('public/icons.svg contains currentColor and dedicated dark mode symbols', () => {
    const iconsSvgPath = path.resolve(__dirname, '../public/icons.svg')
    const content = fs.readFileSync(iconsSvgPath, 'utf-8')

    expect(content).toContain('currentColor')
    expect(content).toContain('id="bluesky-icon-dark"')
    expect(content).toContain('id="discord-icon-dark"')
    expect(content).toContain('id="github-icon-dark"')
    expect(content).toContain('id="x-icon-dark"')
  })

  it('index.css contains icon color design tokens for both light and dark themes', () => {
    const indexCssPath = path.resolve(__dirname, 'index.css')
    const content = fs.readFileSync(indexCssPath, 'utf-8')

    expect(content).toContain('--icon-color')
    expect(content).toContain('.icon-adaptive')
    expect(content).not.toContain('filter: invert(')
  })
})
