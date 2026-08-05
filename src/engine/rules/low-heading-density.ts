/**
 * low-heading-density — long documents with few (or no) headings retrieve
 * as oversized, vague units. One doc-level finding.
 */

import type { Finding, Rule } from '../types.js'

export const lowHeadingDensity: Rule = {
  id: 'low-heading-density',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    if (doc.wordCount <= 400) return []
    const tooSparse =
      doc.headingCount === 0 || doc.wordCount / doc.headingCount > 400
    if (!tooSparse) return []

    // Span: the first heading line if any heading exists, else the first
    // block of the first section.
    let span = null
    for (const section of doc.sections) {
      if (section.headingSpan) {
        span = section.headingSpan
        break
      }
    }
    if (!span) {
      const firstBlock = doc.sections[0]?.blocks[0]
      if (!firstBlock) return []
      span = firstBlock.span
    }

    const message =
      doc.headingCount === 0
        ? `This article runs ${doc.wordCount} words with no headings, so it cannot be split into focused sections.`
        : `This article averages ${Math.round(
            doc.wordCount / doc.headingCount
          )} words per heading (${doc.wordCount} words, ${doc.headingCount} heading${
            doc.headingCount === 1 ? '' : 's'
          }), so each section covers too much ground.`

    const finding: Finding = {
      ruleId: 'low-heading-density',
      checkId: 'structure',
      severity: 'minor',
      span,
      message,
      whyItMatters:
        'Fewer headings means bigger retrieval units and vaguer matches.',
      suggestion:
        'Add a heading roughly every 150-300 words so each section covers one topic.',
      docLevel: true
    }
    return [finding]
  }
}

export default lowHeadingDensity
