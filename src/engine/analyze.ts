/**
 * One-call entry point: raw text → full report.
 */

import type { AnalysisContext, Finding, Report } from './types.js'
import { parse } from './parse.js'
import { buildReport } from './score.js'
import { snippetize } from './snippets.js'
import { ALL_RULES } from './rules/index.js'

/**
 * Never celebrate what the same run just criticised.
 *
 * The strengths rule praises the first table it finds, and answer-only-in-table
 * flags a table that carries the answer with no prose around it. Both are
 * right, and delivered together they read as a contradiction: the tool calls
 * one table a strength and a problem in the same breath. The table IS the
 * right format for a comparison; the problem is that nothing outside it states
 * the answer, which is what the finding says and what its suggestion fixes.
 *
 * Matched on the exact span, so this only ever silences praise for the very
 * block that was flagged. A strength elsewhere in the same section survives.
 */
function dropContradictedStrengths(findings: Finding[]): Finding[] {
  const criticised = new Set(
    findings
      .filter((f) => !f.positive)
      .map((f) => `${f.span.start}:${f.span.end}`)
  )
  return findings.filter(
    (f) => !f.positive || !criticised.has(`${f.span.start}:${f.span.end}`)
  )
}

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
  const findings = dropContradictedStrengths(
    dedupe(ALL_RULES.flatMap((rule) => rule.run(doc, ctx)))
  )
  return buildReport(doc, findings, ctx.snippets)
}
