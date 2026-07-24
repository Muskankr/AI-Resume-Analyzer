import { jsPDF } from 'jspdf'
import type { VersionComparison } from '../hooks/useCompareVersions'

const MARGIN = 14
const PAGE_WIDTH = 210 // A4 mm
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2

export function exportComparisonPdf(comparison: VersionComparison) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 20

  const addLine = (text: string, size = 11, bold = false) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, MAX_WIDTH)
    for (const line of lines) {
      if (y > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(line, MARGIN, y)
      y += size * 0.5 + 2
    }
  }

  addLine('Resume Version Comparison Report', 16, true)
  y += 2
  addLine(`Older: ${comparison.older_label}`)
  addLine(`Newer: ${comparison.newer_label}`)
  y += 2

  const deltaLabel =
    comparison.score_delta > 0 ? `+${comparison.score_delta}` : String(comparison.score_delta)
  addLine(
    `ATS Score: ${comparison.older_score}% -> ${comparison.newer_score}% (${deltaLabel})`,
    13,
    true
  )
  y += 4

  addLine('AI-Generated Insights', 13, true)
  comparison.insights.forEach((insight) => addLine(`- ${insight}`))
  y += 4

  addLine('Skills Added', 13, true)
  addLine(comparison.added_skills.length ? comparison.added_skills.join(', ') : 'None')
  y += 2

  addLine('Skills Removed', 13, true)
  addLine(comparison.removed_skills.length ? comparison.removed_skills.join(', ') : 'None')
  y += 2

  addLine('Still Missing For Target Role', 13, true)
  addLine(
    comparison.still_missing_skills.length ? comparison.still_missing_skills.join(', ') : 'None'
  )

  if (comparison.text_diff.length) {
    y += 4
    addLine('Content Changes', 13, true)
    comparison.text_diff.slice(0, 60).forEach((d) => {
      addLine(`${d.type === 'added' ? '+' : '-'} ${d.text}`, 9)
    })
  }

  const fileSafeLabel = comparison.newer_label.split(' \u2014')[0].replace(/[^\w.-]/g, '_')
  doc.save(`resume-comparison-${fileSafeLabel || 'report'}.pdf`)
}
