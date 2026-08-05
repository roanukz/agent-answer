/**
 * bare-demonstrative — a later paragraph opens with "This/That/These/Those"
 * followed directly by a verb, so its referent lives in an earlier paragraph.
 * The first paragraph of a section is orphan-opener's territory (check 1)
 * and is skipped here.
 */

import type { Finding, Rule } from '../types.js'
import { isVerbWord, sectionLabel, truncate, words } from '../textUtils.js'

const DEMONSTRATIVES: ReadonlySet<string> = new Set([
  'this',
  'that',
  'these',
  'those'
])

export const bareDemonstrative: Rule = {
  id: 'bare-demonstrative',
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
        const ws = words(sentence.text)
        if (ws.length < 2) continue
        if (!DEMONSTRATIVES.has(ws[0]!)) continue
        if (!isVerbWord(ws[1]!)) continue
        const dm = /\b(?:this|that|these|those)\b/i.exec(sentence.text)
        const display = dm ? dm[0] : 'This'
        findings.push({
          ruleId: 'bare-demonstrative',
          checkId: 'unresolved-references',
          severity: 'minor',
          span: sentence.span,
          message: `Paragraph opens with "${truncate(sentence.text, 80)}" — nothing in it says what "${display}" refers to.`,
          whyItMatters:
            "Each paragraph may be quoted alone in an answer; a paragraph that starts with 'This…' forces the agent to guess the referent.",
          suggestion: `Replace "${display}" with the specific noun it stands for.`,
          sectionHeading: sectionLabel(section)
        })
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default bareDemonstrative
