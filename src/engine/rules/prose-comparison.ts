/**
 * prose-comparison — a section that compares options across several
 * sentences of prose, without a table to anchor the comparison.
 */

import type { Finding, Rule, SentenceNode } from '../types.js'
import { sectionLabel, truncate } from '../textUtils.js'

/**
 * Comparison markers, matched case-insensitively as whole words/phrases.
 * "vs" as a whole word also matches "vs." (the boundary sits after the s).
 */
const COMPARISON_RE =
  /\b(?:whereas|in contrast|on the other hand|vs|compared to|while the)\b/i

export const proseComparison: Rule = {
  id: 'prose-comparison',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      if (section.blocks.some((b) => b.type === 'table')) continue
      const matching: SentenceNode[] = []
      for (const block of section.blocks) {
        if (block.type !== 'paragraph' && block.type !== 'blockquote') continue
        for (const sentence of block.sentences) {
          if (COMPARISON_RE.test(sentence.text)) matching.push(sentence)
        }
      }
      if (matching.length < 2) continue
      const second = matching[1]!
      findings.push({
        ruleId: 'prose-comparison',
        checkId: 'structure',
        severity: 'minor',
        span: second.span,
        message: `This section compares options in running prose. By "${truncate(second.text, 90)}" the reader is holding ${matching.length} comparison sentences in their head.`,
        whyItMatters:
          'Agents answer comparison questions far more reliably from a table than from prose.',
        suggestion:
          'Restate this comparison as a small table with one row per option and one column per attribute.',
        sectionHeading: sectionLabel(section)
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default proseComparison
