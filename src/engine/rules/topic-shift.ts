/**
 * topic-shift — Check 4 (one idea per section).
 *
 * Paragraphs that open with "Additionally," / "Another" / "Separately" /
 * "On a related note" / "You can also" / "Alternatively" / "A different"
 * are the author changing subject without changing section. Two or more of
 * these in one section means the section covers several ideas; we flag the
 * second marker (the first is often a legitimate continuation).
 */

import type { Finding, Rule, Span } from '../types.js'
import { paragraphBlocks, sectionLabel, truncate } from '../textUtils.js'

/** Marker phrases that signal a new topic when they open a paragraph. */
const TOPIC_SHIFT_RE =
  /^(?:On a related note|You can also|A different|Additionally|Another|Separately|Alternatively)\b/i

const WHY = "Each extra idea dilutes the section's match to any one question."

export const topicShift: Rule = {
  id: 'topic-shift',
  checkId: 'one-idea',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const hits: Array<{ text: string; span: Span }> = []
      for (const block of paragraphBlocks(section)) {
        const offset = block.text.length - block.text.trimStart().length
        const m = TOPIC_SHIFT_RE.exec(block.text.slice(offset))
        if (m) {
          hits.push({
            text: m[0],
            span: {
              start: block.span.start + offset,
              end: block.span.start + offset + m[0].length
            }
          })
        }
      }
      if (hits.length < 2) continue
      const second = hits[1]!
      findings.push({
        ruleId: 'topic-shift',
        checkId: 'one-idea',
        severity: 'minor',
        span: second.span,
        message: `"${truncate(second.text)}" opens yet another topic, making ${hits.length} topic shifts in this section.`,
        whyItMatters: WHY,
        suggestion:
          'Move each extra topic into its own section under a heading that names it.',
        sectionHeading: sectionLabel(section)
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default topicShift
