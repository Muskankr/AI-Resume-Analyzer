import JSZip from 'jszip'
import { jsPDF } from 'jspdf'

export interface BulkReportItem {
  id?: string | number
  fileName?: string
  targetRole: string
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  suggestions: string[]
  timestamp?: number
  jobDescription?: string
}

const MARGIN = 14
const PAGE_WIDTH = 210
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2

/**
 * Generates a jsPDF instance for a single resume analysis report.
 */
export function generateSingleReportPdf(item: BulkReportItem): jsPDF {
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

  addLine('AI Resume Analysis Report', 16, true)
  y += 2

  if (item.fileName) {
    addLine(`File: ${item.fileName}`, 11)
  }
  addLine(`Target Role: ${item.targetRole || 'General'}`, 11)
  if (item.timestamp) {
    addLine(`Date: ${new Date(item.timestamp).toLocaleString()}`, 10)
  }
  y += 2

  addLine(`ATS Match Score: ${item.score}%`, 14, true)
  y += 4

  addLine('Matched Skills', 12, true)
  addLine(item.matchedSkills.length > 0 ? item.matchedSkills.join(', ') : 'None detected')
  y += 3

  addLine('Missing Skills', 12, true)
  addLine(item.missingSkills.length > 0 ? item.missingSkills.join(', ') : 'None missing')
  y += 3

  if (item.suggestions && item.suggestions.length > 0) {
    addLine('Recommendations & Action Items', 12, true)
    item.suggestions.forEach((sug) => addLine(`- ${sug}`))
    y += 3
  }

  if (item.jobDescription) {
    addLine('Job Description Reference', 12, true)
    const snippet = item.jobDescription.length > 300 ? item.jobDescription.slice(0, 300) + '...' : item.jobDescription
    addLine(snippet, 9)
  }

  return doc
}

/**
 * Sanitizes role or filename into a safe distinguishable filename string.
 */
export function sanitizeFilename(str: string): string {
  return str.replace(/[^\w.-]/g, '_').replace(/_+/g, '_').substring(0, 40)
}

/**
 * Exports multiple individual reports into a single ZIP file containing PDF & JSON files.
 */
export async function downloadBulkReportsZip(
  reports: BulkReportItem[],
  zipFilename = 'resume-analysis-reports.zip'
): Promise<Blob> {
  const zip = new JSZip()
  const pdfFolder = zip.folder('pdf_reports')
  const jsonFolder = zip.folder('json_reports')

  reports.forEach((item, index) => {
    const numPrefix = String(index + 1).padStart(2, '0')
    const roleSlug = sanitizeFilename(item.targetRole || item.fileName || 'report')
    const filenameBase = `${numPrefix}_${roleSlug}_score_${item.score}`

    // 1. Generate PDF
    const pdfDoc = generateSingleReportPdf(item)
    const pdfArrayBuffer = pdfDoc.output('arraybuffer')
    if (pdfFolder) {
      pdfFolder.file(`${filenameBase}.pdf`, pdfArrayBuffer)
    }

    // 2. Generate JSON
    const jsonContent = JSON.stringify(
      {
        id: item.id || index + 1,
        file_name: item.fileName || null,
        target_role: item.targetRole,
        score: item.score,
        matched_skills: item.matchedSkills,
        missing_skills: item.missingSkills,
        suggestions: item.suggestions,
        timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
        job_description: item.jobDescription || null,
      },
      null,
      2
    )
    if (jsonFolder) {
      jsonFolder.file(`${filenameBase}.json`, jsonContent)
    }
  })

  const zipBlob = await zip.generateAsync({ type: 'blob' })

  // Trigger browser file download
  const link = document.createElement('a')
  link.href = URL.createObjectURL(zipBlob)
  link.download = zipFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)

  return zipBlob
}
