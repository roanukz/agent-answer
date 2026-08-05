/**
 * prose-sequence — step-by-step instructions buried in a paragraph instead
 * of a numbered list, in a section that has no numbered list at all.
 */

import type { Finding, Rule } from '../types.js'
import { findAllMatches, sectionLabel } from '../textUtils.js'

/** Sequence markers, matched case-insensitively as whole words/phrases. */
const SEQUENCE_RE = /\b(?:first|then|next|after that|finally)\b/gi

export const proseSequence: Rule = {
  id: 'prose-sequence',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      if (section.blocks.some((b) => b.type === 'numbered-list')) continue
      for (const block of section.blocks) {
        if (block.type !== 'paragraph') continue
        const matches = findAllMatches(SEQUENCE_RE, block.text, block.span.start)
        if (matches.length < 3) continue
        const sample = matches
          .slice(0, 4)
          .map((m) => `"${m.text}"`)
          .join(', ')
        findings.push({
          ruleId: 'prose-sequence',
          checkId: 'structure',
          severity: 'minor',
          span: block.span,
          message: `This paragraph walks through a sequence in prose, with ${matches.length} ordering words (${sample}) and no numbered list in the section.`,
          whyItMatters:
            'Steps hidden in a paragraph get paraphrased and reordered; a numbered list gets quoted.',
          suggestion:
            'Break this paragraph into a numbered list with one step per item.',
          sectionHeading: sectionLabel(section)
        })
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default proseSequence
