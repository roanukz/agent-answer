/**
 * image-without-alt — Check 5 (structure signals).
 *
 * Moveworks, "Writing AI-ready KB Articles for Moveworks", under "Images
 * Guidelines:": "Do not use images to provide text. Moveworks cannot read
 * text that's embedded in your images (no OCR)."
 *
 * An image with no alt text is invisible to the agent. Usually that costs a
 * detail, so it is a minor. When the image is carrying the section on its
 * own, with almost no words around it, the section has no readable content
 * at all, so it is a major.
 */

import type { Finding, Rule } from '../types.js'
import { findAllMatches, sectionLabel } from '../textUtils.js'

/** Prose short enough that the image is doing the explaining. */
const LEAD_IN_WORDS = 20

/** Markdown image with an empty or whitespace-only alt text. */
const EMPTY_ALT_RE = /!\[[ \t]*\]\([^)\n]*\)/g

const WHY =
  'An agent reads the alt text and nothing else: Moveworks states plainly that it cannot read text embedded in images, because there is no OCR.'

export const imageWithoutAlt: Rule = {
  id: 'image-without-alt',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const proseWords = section.blocks
        .filter((b) => b.type !== 'code')
        .reduce((n, b) => n + b.wordCount, 0)
      for (const block of section.blocks) {
        if (block.type === 'code') continue
        for (const hit of findAllMatches(EMPTY_ALT_RE, block.text, block.span.start)) {
          const loadBearing = proseWords < LEAD_IN_WORDS
          findings.push({
            ruleId: 'image-without-alt',
            checkId: 'structure',
            severity: loadBearing ? 'major' : 'minor',
            span: hit.span,
            message: loadBearing
              ? 'This image has no alt text and there is almost nothing written around it, so the section has no content an agent can read.'
              : 'This image has no alt text, so whatever it shows is invisible to an agent.',
            whyItMatters: WHY,
            suggestion:
              'Write the alt text as the sentence the image is making, not as a label: what a reader would learn from looking at it.',
            sectionHeading: sectionLabel(section)
          })
        }
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default imageWithoutAlt
