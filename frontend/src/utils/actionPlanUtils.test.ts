import { describe, it, expect, vi } from 'vitest'
import {
  generateActionPlan,
  formatActionPlanMarkdown,
  exportActionPlanMarkdown,
  exportActionPlanPdf,
  type ActionPlanParams,
} from './actionPlanUtils'

// Mock jsPDF
vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn().mockImplementation(function() { return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setLineWidth: vi.fn(),
    setDrawColor: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((str: string) => [str]),
    getTextWidth: vi.fn(() => 20),
    addPage: vi.fn(),
    save: vi.fn(),
  }; })
  return { jsPDF: MockJsPDF }
})

describe('actionPlanUtils', () => {
  const sampleParams: ActionPlanParams = {
    score: 60,
    targetRole: 'Frontend Developer',
    missingSkills: ['react', 'typescript', 'tailwind'],
    suggestions: ['Quantify bullet points with metrics'],
    readabilityLabel: 'dense',
    readabilityScore: 35,
    fileName: 'my-resume.pdf',
  }

  it('generates a prioritized action plan ranked by estimated impact descending', () => {
    const plan = generateActionPlan(sampleParams)

    expect(plan.targetRole).toBe('Frontend Developer')
    expect(plan.score).toBe(60)
    expect(plan.items.length).toBeGreaterThan(0)

    // Verify ordering: estimatedImpact descending
    for (let i = 0; i < plan.items.length - 1; i++) {
      expect(plan.items[i].estimatedImpact).toBeGreaterThanOrEqual(
        plan.items[i + 1].estimatedImpact
      )
    }

    // Top item should be high priority
    expect(plan.items[0].priority).toBe('High')
  })

  it('formats action plan into clean Markdown document string with GFM checkboxes', () => {
    const plan = generateActionPlan(sampleParams)
    const md = formatActionPlanMarkdown(plan)

    expect(md).toContain('# Prioritized Action Plan Checklist')
    expect(md).toContain('**Target Role:** Frontend Developer')
    expect(md).toContain('**Current ATS Score:** 60%')
    expect(md).toContain('- [ ]')
    expect(md).toContain('High Priority')
  })

  it('triggers markdown export download without throwing errors', () => {
    const plan = generateActionPlan(sampleParams)
    const createObjectURLMock = vi.fn(() => 'blob:mock-url')
    const revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock

    expect(() => exportActionPlanMarkdown(plan)).not.toThrow()
    expect(createObjectURLMock).toHaveBeenCalled()
  })

  it('triggers PDF export using jsPDF without throwing errors', () => {
    const plan = generateActionPlan(sampleParams)
    expect(() => exportActionPlanPdf(plan)).not.toThrow()
  })
})
