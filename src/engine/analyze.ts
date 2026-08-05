/**
 * One-call entry point: raw text → full report.
 */

import type { Finding, Report } from './types.js'
import { parse } from './parse.js'
import { buildReport } from './score.js'
import { ALL_RULES } from './rules/index.js'

/** Drop exact duplicates (same rule, same span). */
function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    const key = `${f.ruleId}:${f.span.start}:${f.span.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function analyze(source: string): Report {
  const doc = parse(source)
  const findings = dedupe(ALL_RULES.flatMap((rule) => rule.run(doc)))
  return buildReport(doc, findings)
}
