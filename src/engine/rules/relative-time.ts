/**
 * relative-time — wording that is only true relative to the writing date
 * ("currently", "recently", "the latest release"…). Retrieved text carries
 * no timestamp, so these age into silent errors.
 */

import type { Finding, Rule } from '../types.js'
import { findAllMatches, sectionLabel, textBlocks, truncate } from '../textUtils.js'

/** Time-relative phrases, matched case-insensitively as whole words. */
const RELATIVE_TIME_RE =
  /\b(?:currently|as\s+of\s+now|recently|at\s+the\s+moment|the\s+new\s+version|the\s+latest\s+release|soon)\b/gi

export const relativeTime: Rule = {
  id: 'relative-time',
  checkId: 'unresolved-references',
  severity: 'info',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      for (const block of textBlocks(section)) {
        const matches = findAllMatches(
          RELATIVE_TIME_RE,
          block.text,
          block.span.start
        )
        for (const m of matches) {
          findings.push({
            ruleId: 'relative-time',
            checkId: 'unresolved-references',
            severity: 'info',
            span: m.span,
            message: `"${truncate(m.text, 40)}" is anchored to the writing date, which the reader of a retrieved section never sees.`,
            whyItMatters:
              "Agents can't tell when this was written — 'currently' becomes wrong silently.",
            suggestion:
              'State an absolute date or version instead, such as "as of June 2026" or "in version 4.2".',
            sectionHeading: sectionLabel(section)
          })
        }
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default relativeTime
