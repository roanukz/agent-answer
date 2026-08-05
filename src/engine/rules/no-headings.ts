/**
 * no-headings — Check 4 (one idea per section).
 *
 * A substantial document (over 200 words) with no headings at all — not
 * even inferred ones — gives the ingestion pipeline nothing to split on.
 * One document-level finding, anchored on the first block as a
 * representative spot.
 */

import type { Finding, Rule } from '../types.js'

const WHY =
  'Without headings, the splitting is done by a token counter instead of by you.'

export const noHeadings: Rule = {
  id: 'no-headings',
  checkId: 'one-idea',
  severity: 'major',
  run(doc) {
    if (doc.wordCount <= 200 || doc.headingCount !== 0) return []
    const firstBlock = doc.sections[0]?.blocks[0]
    if (!firstBlock) return []
    const finding: Finding = {
      ruleId: 'no-headings',
      checkId: 'one-idea',
      severity: 'major',
      span: firstBlock.span,
      message: `This document is ${doc.wordCount} words with no headings, so nothing marks where one topic ends and the next begins.`,
      whyItMatters: WHY,
      suggestion:
        'Add a short heading above each topic so the document splits along your section boundaries.',
      docLevel: true
    }
    return [finding]
  }
}

export default noHeadings
