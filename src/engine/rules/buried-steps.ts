/**
 * buried-steps — a section's list of steps sits below three or more
 * sentences of introductory prose, so a "how do I…" query lands on
 * context instead of instructions.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel } from '../textUtils.js'

export const buriedSteps: Rule = {
  id: 'buried-steps',
  checkId: 'answer-first',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const listIdx = section.blocks.findIndex(
        (b) => b.type === 'numbered-list' || b.type === 'bulleted-list'
      )
      if (listIdx === -1) continue
      const before = section.blocks.slice(0, listIdx)
      const paragraphs = before.filter((b) => b.type === 'paragraph')
      const sentenceCount = paragraphs.reduce(
        (n, b) => n + b.sentences.length,
        0
      )
      if (sentenceCount < 3) continue
      const firstPara = paragraphs[0]!
      const lastBefore = before[before.length - 1]!
      findings.push({
        ruleId: 'buried-steps',
        checkId: 'answer-first',
        severity: 'minor',
        span: { start: firstPara.span.start, end: lastBefore.span.end },
        message: `The steps in this section only start after ${sentenceCount} sentences of introductory prose.`,
        whyItMatters:
          "An agent asked 'how do I…' should hit the steps immediately, not a wall of context.",
        suggestion:
          'Move the list up so it starts right after the heading, keeping at most one short lead-in sentence.',
        sectionHeading: sectionLabel(section)
      })
    }
    return findings.sort((a, b) => a.span.start - b.span.start)
  }
}

export default buriedSteps
