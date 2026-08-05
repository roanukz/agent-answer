/**
 * cross-section-pointer — prose that points at another part of the page by
 * position ("as mentioned above", "see below", "in the previous section").
 * A retrieved section has no above or below, so the pointer dangles.
 */

import type { Finding, Rule } from '../types.js'
import { findAllMatches, sectionLabel, textBlocks } from '../textUtils.js'

const WHY = "The agent sees one section at a time — 'above' doesn't exist for it."

/**
 * Positional cross-references. `\s+` between words so a phrase wrapped
 * across a soft line break inside a block still matches exactly.
 */
const POINTER_RE =
  /\b(?:as\s+mentioned\s+(?:above|earlier|previously)|as\s+described\s+(?:above|earlier)|as\s+shown\s+(?:above|earlier)|see\s+(?:above|below)|in\s+the\s+(?:previous|next)\s+(?:section|step)|refer\s+to\s+the\s+section)\b/gi

export const crossSectionPointer: Rule = {
  id: 'cross-section-pointer',
  checkId: 'self-contained',
  severity: 'major',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      for (const block of textBlocks(section)) {
        for (const m of findAllMatches(POINTER_RE, block.text, block.span.start)) {
          findings.push({
            ruleId: crossSectionPointer.id,
            checkId: crossSectionPointer.checkId,
            severity: crossSectionPointer.severity,
            span: m.span,
            message: `The phrase "${m.text}" points at content by page position, which is lost when this section is retrieved by itself.`,
            whyItMatters: WHY,
            suggestion: `Restate the needed detail here or name the target section explicitly instead of writing "${m.text}".`,
            sectionHeading: sectionLabel(section)
          })
        }
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default crossSectionPointer
