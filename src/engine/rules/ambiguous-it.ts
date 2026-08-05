/**
 * ambiguous-it — a later paragraph opens with "It " plus a verb, so the
 * pronoun's referent lives in an earlier paragraph. Formal openers
 * ("It is recommended…", "It's possible…") are fine and excluded.
 * The first paragraph of a section is orphan-opener's territory (check 1)
 * and is skipped here.
 */

import type { Finding, Rule } from '../types.js'
import { isVerbWord, sectionLabel, truncate, words } from '../textUtils.js'

/** Formal subject-less patterns that don't need a referent. */
const FORMAL_IT_RE = /^it(?:\s+is|['’]s)\s+(?:possible|recommended|important)\b/i

export const ambiguousIt: Rule = {
  id: 'ambiguous-it',
  checkId: 'unresolved-references',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      let firstParagraphSeen = false
      for (const block of section.blocks) {
        if (block.type !== 'paragraph') continue
        if (!firstParagraphSeen) {
          firstParagraphSeen = true
          continue
        }
        const sentence = block.sentences[0]
        if (!sentence) continue
        if (FORMAL_IT_RE.test(sentence.text)) continue
        const ws = words(sentence.text)
        if (ws.length < 2) continue
        if (ws[0] !== 'it') continue
        if (!isVerbWord(ws[1]!)) continue
        findings.push({
          ruleId: 'ambiguous-it',
          checkId: 'unresolved-references',
          severity: 'minor',
          span: sentence.span,
          message: `Paragraph opens with "${truncate(sentence.text, 80)}" — an agent quoting it alone can't tell what "It" is.`,
          whyItMatters:
            "Each paragraph may be quoted alone in an answer; a paragraph that starts with 'This…' forces the agent to guess the referent.",
          suggestion:
            'Replace "It" with the thing it names so the paragraph stands on its own.',
          sectionHeading: sectionLabel(section)
        })
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default ambiguousIt
