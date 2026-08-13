/**
 * link-in-heading — Check 5 (structure signals).
 *
 * Moveworks, "Writing AI-ready KB Articles for Moveworks", under "Use
 * consistent proper headers throughout your articles": "Do not insert
 * hyperlinks into headings".
 *
 * The heading is the label a piece travels under, and it is what retrieval
 * matches a question against. A link inside it competes with that job:
 * part of the label is now anchor text pointing somewhere else.
 */

import type { Finding, Rule } from '../types.js'

const MARKDOWN_LINK_RE = /\[[^\]\n]*\]\([^)\n]*\)/
const BARE_URL_RE = /\bhttps?:\/\/\S+/

const WHY =
  'The heading is the label the piece is retrieved by, and Moveworks tells authors outright not to put hyperlinks in headings.'

export const linkInHeading: Rule = {
  id: 'link-in-heading',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const heading = section.heading
      if (heading === null || section.headingSpan === null) continue
      if (!MARKDOWN_LINK_RE.test(heading) && !BARE_URL_RE.test(heading)) continue
      findings.push({
        ruleId: 'link-in-heading',
        checkId: 'structure',
        severity: 'minor',
        span: section.headingSpan,
        message: 'This heading contains a hyperlink.',
        whyItMatters: WHY,
        suggestion:
          'Take the link out of the heading and put it in the first sentence underneath, where it can have a few words of its own explaining where it goes.',
        sectionHeading: heading
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default linkInHeading
