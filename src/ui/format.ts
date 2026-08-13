/**
 * Shared formatting helpers for the result views.
 */

import type { Report, ScoredFinding } from '../engine/types.js'
import type { SnippetMap } from '../engine/snippets.js'
import { truncate } from '../engine/textUtils.js'

/**
 * What the split map found, in one sentence. Shared by the results panel and
 * the copied report so the two cannot drift: the FAQ exception was once
 * announced on screen and silently omitted from the copy.
 */
export function splitVerdict(map: SnippetMap): string {
  const pieces = map.snippets.length
  switch (map.reason) {
    case 'no-headings':
      return 'This article has no headings, so there is no level to cut on. It arrives as one piece.'
    case 'none':
      return 'No level qualified. The search runs H1, then H2, and neither appears twice here, so the article arrives as one piece.'
    case 'faq':
      return `This reads as an FAQ article, so the exception applies: the cuts land on H${map.level}, giving ${pieces} pieces.`
    default:
      return `The cuts land on H${map.level}, giving ${pieces} pieces.`
  }
}

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
    return 'No issues found. Every check passed.'
  }
  const issues = `${report.issueCount} issue${report.issueCount === 1 ? '' : 's'}`
  const checks = `${report.checksWithIssues} check${report.checksWithIssues === 1 ? '' : 's'}`
  if (report.fixes.length === 0 || report.topFixRecovery === 0) {
    return `${issues} across ${checks}.`
  }
  const top = Math.min(3, report.fixes.length)
  return `${issues} across ${checks}. The top ${top} fix${top === 1 ? '' : 'es'} below recover ~${report.topFixRecovery} points.`
}

const sectionRef = (f: ScoredFinding): string =>
  f.sectionHeading ? `'${f.sectionHeading}'` : 'the article'

/** Fix-list phrasing: each finding as a concrete action. */
export function actionFor(report: Report, f: ScoredFinding): string {
  const sec = sectionRef(f)
  const quote = shortQuote(report, f)
  switch (f.ruleId) {
    case 'orphan-opener':
      return `Rewrite the first sentence of ${sec} to name its subject. It currently starts with "${truncate(quote, 40)}"`
    case 'preamble-opener':
      return `Rewrite the first sentence of ${sec} to state the answer. It currently starts with "${truncate(quote, 40)}"`
    case 'cross-section-pointer':
      return `Remove "${quote}" in ${sec} and restate what it points to inside the section`
    case 'generic-heading':
      return `Rename the heading ${quote ? `"${quote}"` : ''} to say what the section actually covers`
    case 'orphan-acronym':
      return `Spell out "${quote}" the first time it appears in ${sec}`
    case 'buried-steps':
      return `Move the steps in ${sec} to the top, so the context follows them`
    case 'slow-start':
      return `Tighten the opening paragraph of ${sec} so its first sentence states the answer`
    case 'dangling-pointer':
      return `Give "${quote}" in ${sec} something to point at, by putting the list or table in this section or naming the thing outright`
    case 'bare-demonstrative':
    case 'ambiguous-it':
      return `Start the paragraph "${truncate(quote, 40)}" in ${sec} with its subject noun`
    case 'relative-time':
      return `Replace "${quote}" in ${sec} with a date or version number`
    case 'section-too-long':
      return `Split ${sec} into smaller sections, one idea each`
    case 'snippet-too-long':
      return `Break the piece starting at ${sec} into smaller pieces, so none of them is over the 512-token limit`
    case 'beyond-chat-cutoff':
      return `Move the answer in ${sec} into the first 500 characters, where a reader will see it`
    case 'answer-only-in-table':
      return `Write the answer in ${sec} out as a sentence or a list, and keep the table as the reference`
    case 'image-without-alt':
      return `Add alt text to the image in ${sec}, saying what the image tells the reader`
    case 'nested-list':
      return `Flatten the nested list in ${sec}, because it arrives flattened anyway`
    case 'link-in-heading':
      return `Take the hyperlink out of the heading ${sec} and put it in the first sentence below`
    case 'topic-shift':
      return `Move the extra ideas in ${sec} into their own sections with their own headings`
    case 'no-headings':
      return 'Add headings, because right now the whole article is one undivided block'
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
