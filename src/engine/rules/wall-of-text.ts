/**
 * wall-of-text — a single paragraph so long that ingestion pipelines will
 * split it mid-thought.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel, truncate } from '../textUtils.js'

const MAX_PARAGRAPH_WORDS = 120

export const wallOfText: Rule = {
  id: 'wall-of-text',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      for (const block of section.blocks) {
        if (block.type !== 'paragraph') continue
        if (block.wordCount <= MAX_PARAGRAPH_WORDS) continue
        findings.push({
          ruleId: 'wall-of-text',
          checkId: 'structure',
          severity: 'minor',
          span: block.span,
          message: `This paragraph runs ${block.wordCount} words without a break ("${truncate(block.text, 80)}").`,
          whyItMatters:
            'Long paragraphs are split blindly mid-thought by ingestion pipelines.',
          suggestion:
            'Split this paragraph at its natural topic shifts so no paragraph exceeds about 100 words.',
          sectionHeading: sectionLabel(section)
        })
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default wallOfText
