/**
 * orphan-opener — a section's first sentence opens with a bare pronoun /
 * demonstrative ("This is…", "They allow…") or a discourse connective
 * ("However, …"). Retrieved alone, the section starts mid-thought.
 */

import type { Finding, Rule } from '../types.js'
import {
  firstSentence,
  isVerbWord,
  sectionLabel,
  truncate
} from '../textUtils.js'

const WHY =
  "If this section is retrieved alone, the agent has no idea what 'this' refers to."

/** Sentence-start pronoun/demonstrative followed directly by the next word. */
const PRONOUN_RE = /^(It|This|That|These|Those|They)\s+([A-Za-z][A-Za-z'’-]*)/

/** Sentence-start connective, followed by a comma or space. */
const CONNECTIVE_RE =
  /^(As a result|In addition|On the other hand|However|Therefore|Additionally|Furthermore|Also)(?=[,\s])/

export const orphanOpener: Rule = {
  id: 'orphan-opener',
  checkId: 'self-contained',
  severity: 'major',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const first = firstSentence(section)
      if (!first) continue
      const { sentence } = first

      const pron = PRONOUN_RE.exec(sentence.text)
      if (pron && isVerbWord(pron[2]!)) {
        findings.push({
          ruleId: orphanOpener.id,
          checkId: orphanOpener.checkId,
          severity: orphanOpener.severity,
          span: sentence.span,
          message: `The section opens with "${pron[1]}", which has no antecedent when the section is read on its own: "${truncate(sentence.text, 120)}"`,
          whyItMatters: WHY,
          suggestion: `Replace "${pron[1]}" with the specific subject so the opening sentence stands on its own.`,
          sectionHeading: sectionLabel(section)
        })
        continue
      }

      const conn = CONNECTIVE_RE.exec(sentence.text)
      if (conn) {
        findings.push({
          ruleId: orphanOpener.id,
          checkId: orphanOpener.checkId,
          severity: orphanOpener.severity,
          span: sentence.span,
          message: `The section opens with the connective "${conn[1]}", which leans on text that is not part of this section: "${truncate(sentence.text, 120)}"`,
          whyItMatters: WHY,
          suggestion: `Remove "${conn[1]}" and open with a sentence that names its subject outright.`,
          sectionHeading: sectionLabel(section)
        })
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default orphanOpener
