/**
 * answer-only-in-table — Check 5 (structure signals).
 *
 * Moveworks, "Writing AI-ready KB Articles for Moveworks", under "Format
 * text with plain text formatting tools instead of tables": "The bot is
 * currently unable to surface content from tables in-chat."
 *
 * Support articles are full of tables: plan limits, error codes, regional
 * availability. When the table IS the answer and nothing outside it says
 * the same thing, one vendor's users are shown nothing.
 *
 * A minor, deliberately, and the fix is additive. Check 5 already contains
 * prose-comparison, which tells authors to turn a comparison into a table;
 * a major here would punish authors for taking that advice, and the two
 * rules would be arguing inside one check. They do not actually disagree:
 * the table is still the better structure to parse, and the ask is to also
 * write the takeaway in a sentence. Note too that Moveworks says
 * "currently", so this is one vendor's present limitation rather than a
 * permanent fact about agents.
 *
 * A short lead-in line ("The limits are:") does not rescue the section, so
 * a section counts as table-only when its non-table prose is under 20
 * words. Tables next to a real written answer are not flagged.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel } from '../textUtils.js'

/** Prose short enough to be a lead-in rather than an answer. */
const LEAD_IN_WORDS = 20

const WHY =
  'One vendor, Moveworks, states that its bot is currently unable to surface content from tables in chat, so an answer living only in a table can be retrieved and still not be shown.'

export const answerOnlyInTable: Rule = {
  id: 'answer-only-in-table',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const tables = section.blocks.filter((b) => b.type === 'table')
      if (tables.length === 0) continue
      const proseWords = section.blocks
        .filter((b) => b.type !== 'table' && b.type !== 'code')
        .reduce((n, b) => n + b.wordCount, 0)
      if (proseWords >= LEAD_IN_WORDS) continue
      findings.push({
        ruleId: 'answer-only-in-table',
        checkId: 'structure',
        severity: 'minor',
        span: tables[0]!.span,
        message: `This section's answer lives only in a table, with ${proseWords === 0 ? 'no' : 'only ' + proseWords + ' words of'} prose around it.`,
        whyItMatters: WHY,
        suggestion:
          'Write the answer out in a sentence or a list as well, and keep the table as the detailed reference.',
        sectionHeading: sectionLabel(section)
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default answerOnlyInTable
