import { describe, it, expect } from 'vitest'
import { formatFileSize } from './formatFileSize'

describe('formatFileSize', () => {
  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('formats plain bytes with no decimal', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes with one decimal', () => {
    expect(formatFileSize(842 * 1024)).toBe('842.0 KB')
  })

  it('formats megabytes with one decimal', () => {
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2.4 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB')
  })

  it('treats negative or non-finite input as 0 B', () => {
    expect(formatFileSize(-5)).toBe('0 B')
    expect(formatFileSize(NaN)).toBe('0 B')
  })
})
