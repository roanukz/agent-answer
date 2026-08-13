/**
 * section-too-long — Check 4 (one idea per section).
 *
 * A section past ~300 words is carrying more than one idea. That threshold
 * is a rule of thumb about meaning, and it is all this rule claims now.
 *
 * It used to also raise a major above 500 words, on the grounds that such a
 * section is "guaranteed to be split by size". That was an invented number
 * making a mechanical claim, and snippet-too-long now makes the mechanical
 * claim with a published limit behind it. One rule per claim.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel } from '../textUtils.js'

const MINOR_LIMIT = 300

const WHY =
  'A section carrying several ideas matches every one of their questions weakly, instead of matching one strongly.'

export const sectionTooLong: Rule = {
  id: 'section-too-long',
  checkId: 'one-idea',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      if (section.wordCount <= MINOR_LIMIT) continue
      // Anchor on the heading line when there is one; otherwise the
      // section's first block stands in for it.
      const span = section.headingSpan ?? section.blocks[0]?.span
      if (!span) continue
      findings.push({
        ruleId: 'section-too-long',
        checkId: 'one-idea',
        severity: 'minor',
        span,
        message: `This section is ${section.wordCount} words, longer than a single idea usually needs.`,
        whyItMatters: WHY,
        suggestion:
          'Split this section into smaller sections, each with a heading naming the one question it answers.',
        sectionHeading: sectionLabel(section)
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default sectionTooLong
