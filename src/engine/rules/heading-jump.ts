/**
 * heading-jump — a heading more than one level deeper than the previous
 * heading (e.g. # straight to ###) breaks the outline hierarchy.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel, truncate } from '../textUtils.js'

export const headingJump: Rule = {
  id: 'heading-jump',
  checkId: 'structure',
  severity: 'info',
  run(doc) {
    const findings: Finding[] = []
    let prevLevel: number | null = null
    for (const section of doc.sections) {
      if (section.implicit || !section.headingSpan) continue
      const level = section.level
      if (prevLevel !== null && level > prevLevel + 1) {
        findings.push({
          ruleId: 'heading-jump',
          checkId: 'structure',
          severity: 'info',
          span: section.headingSpan,
          message: `Heading "${truncate(section.heading ?? '', 60)}" jumps from level ${prevLevel} to level ${level}, skipping a level.`,
          whyItMatters:
            'Skipped levels scramble the section tree some ingestion pipelines rely on.',
          suggestion: `Change this heading to level ${prevLevel + 1} or add the missing intermediate heading above it.`,
          sectionHeading: sectionLabel(section)
        })
      }
      prevLevel = level
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default headingJump
