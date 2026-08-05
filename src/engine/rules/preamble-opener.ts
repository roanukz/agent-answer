/**
 * preamble-opener — a section's first sentence is throat-clearing
 * ("In this article…", "Before you begin…") instead of the answer.
 */

import type { Finding, Rule } from '../types.js'
import { firstSentence, sectionLabel, truncate } from '../textUtils.js'

/** Preamble phrases that may only trigger when anchored at sentence start. */
const OPENER_PATTERNS: readonly string[] = [
  'in this (?:article|section|guide|document)',
  'before (?:we|you) (?:begin|start|get started)',
  "it(?:’s|'s| is) important to (?:note|understand|remember)",
  'as you (?:may|might) know',
  'this (?:article|section|guide|document) (?:describes|covers|explains|will|provides)',
  'the purpose of this'
]

const PREAMBLE_RE = new RegExp(`^(?:${OPENER_PATTERNS.join('|')})\\b`, 'i')

export const preambleOpener: Rule = {
  id: 'preamble-opener',
  checkId: 'answer-first',
  severity: 'major',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const opener = firstSentence(section)
      if (!opener) continue
      if (!PREAMBLE_RE.test(opener.sentence.text)) continue
      findings.push({
        ruleId: 'preamble-opener',
        checkId: 'answer-first',
        severity: 'major',
        span: opener.sentence.span,
        message: `This section opens with preamble, "${truncate(opener.sentence.text, 100)}", instead of the answer.`,
        whyItMatters:
          'The first sentence is the one retrieval and answering weigh most, so spend it on the answer rather than on announcing the article.',
        suggestion:
          'Rewrite the first sentence to state the answer or key fact directly, and move any context after it.',
        sectionHeading: sectionLabel(section)
      })
    }
    return findings.sort((a, b) => a.span.start - b.span.start)
  }
}

export default preambleOpener
