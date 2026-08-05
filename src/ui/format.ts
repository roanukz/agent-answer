/**
 * Shared formatting helpers for the result views.
 */

import type { Report, ScoredFinding } from '../engine/types.js'
import { truncate } from '../engine/textUtils.js'

export function quoteOf(report: Report, f: ScoredFinding): string {
  return truncate(report.doc.source.slice(f.span.start, f.span.end), 160)
}

export function shortQuote(report: Report, f: ScoredFinding, max = 48): string {
  return truncate(report.doc.source.slice(f.span.start, f.span.end), max)
}

export function fmtPoints(points: number): string {
  const rounded = Math.round(points * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function summaryLine(report: Report): string {
  if (report.issueCount === 0) {
    return 'No issues found — every check passed.'
  }
  const issues = `${report.issueCount} issue${report.issueCount === 1 ? '' : 's'}`
  const checks = `${report.checksWithIssues} check${report.checksWithIssues === 1 ? '' : 's'}`
  if (report.fixes.length === 0 || report.topFixRecovery === 0) {
    return `${issues} across ${checks}.`
  }
  const top = Math.min(3, report.fixes.length)
  return `${issues} across ${checks} — the top ${top} fix${top === 1 ? '' : 'es'} below recover ~${report.topFixRecovery} points.`
}

const sectionRef = (f: ScoredFinding): string =>
  f.sectionHeading ? `'${f.sectionHeading}'` : 'the article'

/** Fix-list phrasing: each finding as a concrete action. */
export function actionFor(report: Report, f: ScoredFinding): string {
  const sec = sectionRef(f)
  const quote = shortQuote(report, f)
  switch (f.ruleId) {
    case 'orphan-opener':
      return `Rewrite the first sentence of ${sec} to name its subject — currently it starts with "${truncate(quote, 40)}"`
    case 'preamble-opener':
      return `Rewrite the first sentence of ${sec} to state the answer — currently it starts with "${truncate(quote, 40)}"`
    case 'cross-section-pointer':
      return `Remove "${quote}" in ${sec} and restate what it points to inside the section`
    case 'generic-heading':
      return `Rename the heading ${quote ? `"${quote}"` : ''} to say what the section actually covers`
    case 'orphan-acronym':
      return `Spell out "${quote}" the first time it appears in ${sec}`
    case 'buried-steps':
      return `Move the steps in ${sec} to the top — the context can follow them`
    case 'slow-start':
      return `Tighten the opening paragraph of ${sec} so its first sentence states the answer`
    case 'dangling-pointer':
      return `Give "${quote}" in ${sec} something to point at — put the list or table in this section, or name the thing outright`
    case 'bare-demonstrative':
    case 'ambiguous-it':
      return `Start the paragraph "${truncate(quote, 40)}" in ${sec} with its subject noun`
    case 'relative-time':
      return `Replace "${quote}" in ${sec} with a date or version number`
    case 'section-too-long':
      return `Split ${sec} into smaller sections — one idea per section`
    case 'topic-shift':
      return `Move the extra ideas in ${sec} into their own sections with their own headings`
    case 'no-headings':
      return 'Add headings — right now the whole article is one undivided block'
    case 'low-heading-density':
      return 'Add more headings so each section stays small and focused'
    case 'heading-jump':
      return `Fix the skipped heading level at "${quote}"`
    case 'prose-comparison':
      return `Turn the comparison in ${sec} into a table`
    case 'prose-sequence':
      return `Turn the step sequence in ${sec} into a numbered list`
    case 'wall-of-text':
      return `Break the long paragraph in ${sec} into shorter paragraphs or a list`
    default:
      return f.suggestion
  }
}
