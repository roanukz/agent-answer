/**
 * "Copy report" output: a markdown summary of the analysis.
 */

import type { Report } from '../engine/types.js'
import { CHECK_FLOOR } from '../engine/score.js'
import { MOVEWORKS_HARD_MAX_TOKENS } from '../engine/size.js'
import { actionFor, fmtPoints, splitVerdict, summaryLine } from './format.js'

const STATUS_LABEL: Record<string, string> = {
  pass: 'pass',
  'needs-work': 'needs work',
  fail: 'fail'
}

export function buildMarkdownReport(report: Report): string {
  const lines: string[] = []
  lines.push('# Will My Agent Answer This? Report')
  lines.push('')
  lines.push(`**Score: ${report.overall}/100. ${report.bandLabel}**`)
  lines.push('')
  lines.push(
    `Weakest check: ${report.weakestCheck.def.name}, ${report.weakestCheck.score}/100.`
  )
  if (report.floored) {
    lines.push('')
    lines.push(
      `Not agent-ready despite a composite of ${report.overall}: no article is agent-ready with a check below ${CHECK_FLOOR}.`
    )
  }
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
  const map = report.snippets
  lines.push('')
  lines.push('## Where Moveworks would cut this')
  lines.push('')
  lines.push(
    "One vendor's published algorithm, not an industry standard. Token counts are an estimate at four characters per token."
  )
  lines.push('')
  lines.push(splitVerdict(map))
  lines.push('')
  for (const s of map.snippets) {
    const over =
      s.tokenEstimate > MOVEWORKS_HARD_MAX_TOKENS ? ' — over 512, splits again' : ''
    lines.push(
      `${s.index}. ${s.heading ?? '(before the first cut)'} — ${s.bodyChars} characters, ~${s.tokenEstimate} tokens${over}`
    )
  }

  if (report.fixes.length > 0) {
    lines.push('')
    lines.push('## Fix these first')
    lines.push('')
    report.fixes.forEach((f, i) => {
      lines.push(
        `${i + 1}. ${actionFor(report, f)} _(+${fmtPoints(f.impact)} points)_`
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
    '_Scored locally by Will My Agent Answer This? No text left the browser._'
  )
  return lines.join('\n')
}
