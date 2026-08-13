/**
 * One-call entry point: raw text → full report.
 */

import type { AnalysisContext, Finding, Report } from './types.js'
import { parse } from './parse.js'
import { buildReport } from './score.js'
import { snippetize } from './snippets.js'
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
  const ctx: AnalysisContext = { snippets: snippetize(doc) }
  const findings = dedupe(ALL_RULES.flatMap((rule) => rule.run(doc, ctx)))
  return buildReport(doc, findings, ctx.snippets)
}
