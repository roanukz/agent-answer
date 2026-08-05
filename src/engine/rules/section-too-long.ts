/**
 * section-too-long — Check 4 (one idea per section).
 *
 * A section past ~300 words is carrying more than one idea; past ~500 it is
 * guaranteed to be split by size rather than meaning. Emits at most ONE
 * finding per section: major above 500 words, minor above 300.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel } from '../textUtils.js'

const MINOR_LIMIT = 300
const MAJOR_LIMIT = 500

const WHY =
  'Long sections get split wherever the software decides, mid-sentence and mid-idea, instead of where you would split them.'

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
      const major = section.wordCount > MAJOR_LIMIT
      findings.push({
        ruleId: 'section-too-long',
        checkId: 'one-idea',
        severity: major ? 'major' : 'minor',
        span,
        message: major
          ? `This section is ${section.wordCount} words, far past the point where it holds a single idea.`
          : `This section is ${section.wordCount} words, longer than a single idea usually needs.`,
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
