/**
 * generic-heading — a heading like "Overview", "Notes", or "Step 3" says
 * nothing about what the section actually covers, so neither retrieval nor
 * the agent can match a question to it.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel } from '../textUtils.js'

const WHY =
  'The heading travels with the section as its label; a generic label gives the agent (and retrieval) nothing to match on.'

const GENERIC_HEADINGS: ReadonlySet<string> = new Set([
  'introduction',
  'overview',
  'more information',
  'additional information',
  'notes',
  'details',
  'other',
  'miscellaneous',
  'next steps',
  'background',
  'getting started'
])

const BARE_STEP_RE = /^step \d+$/

/** Trim, strip trailing colons/periods, collapse spaces, lowercase. */
function normalizeHeading(text: string): string {
  return text
    .trim()
    .replace(/[:.]+$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export const genericHeading: Rule = {
  id: 'generic-heading',
  checkId: 'self-contained',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      if (section.heading === null || section.headingSpan === null) continue
      const normalized = normalizeHeading(section.heading)
      if (!GENERIC_HEADINGS.has(normalized) && !BARE_STEP_RE.test(normalized)) {
        continue
      }
      findings.push({
        ruleId: genericHeading.id,
        checkId: genericHeading.checkId,
        severity: genericHeading.severity,
        span: section.headingSpan,
        message: `The heading "${section.heading}" is generic, so it gives no clue what this section covers.`,
        whyItMatters: WHY,
        suggestion:
          'Rename the heading to state the specific task or question this section answers.',
        sectionHeading: sectionLabel(section)
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default genericHeading
