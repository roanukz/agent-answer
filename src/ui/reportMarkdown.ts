/**
 * "Copy report" output: a markdown summary of the analysis.
 */

import type { Report } from '../engine/types.js'
import { actionFor, fmtPoints, summaryLine } from './format.js'

const STATUS_LABEL: Record<string, string> = {
  pass: 'pass',
  'needs-work': 'needs work',
  fail: 'fail'
}

export function buildMarkdownReport(report: Report): string {
  const lines: string[] = []
  lines.push('# Will My Agent Answer This? — report')
  lines.push('')
  lines.push(`**Score: ${report.overall}/100 — ${report.bandLabel}**`)
  lines.push('')
  lines.push(summaryLine(report))
  lines.push('')
  lines.push('## Checks')
  lines.push('')
  lines.push('| Check | Weight | Score | Status |')
  lines.push('| --- | --- | --- | --- |')
  for (const c of report.checks) {
    lines.push(
      `| ${c.def.name} | ${Math.round(c.def.weight * 100)}% | ${c.score} | ${STATUS_LABEL[c.status] ?? c.status} |`
    )
  }
  if (report.fixes.length > 0) {
    lines.push('')
    lines.push('## Fix these first')
    lines.push('')
    report.fixes.forEach((f, i) => {
      lines.push(
        `${i + 1}. ${actionFor(report, f)} _(+${fmtPoints(f.recovery)} points)_`
      )
    })
  }
  if (report.strengths.length > 0) {
    lines.push('')
    lines.push('## Already agent-ready')
    lines.push('')
    for (const s of report.strengths) {
      lines.push(`- ${s.message}`)
    }
  }
  lines.push('')
  lines.push(
    '_Scored locally by Will My Agent Answer This? — no text left the browser._'
  )
  return lines.join('\n')
}
