/**
 * Findings → per-check scores → overall score.
 *
 * Per check: start at 100, subtract 25 per major and 10 per minor; info
 * costs nothing. Only the first 3 findings per rule count toward the
 * deduction (the rest are listed but tagged as the same habit). Scores
 * floor at 0. The overall score is the weighted average of the five
 * checks. Fully deterministic — same input, same score, always.
 */

import type {
  Band,
  CheckDef,
  CheckResult,
  CheckStatus,
  DocModel,
  Finding,
  Report,
  ScoredFinding,
  Severity
} from './types.js'

export const CHECK_DEFS: readonly CheckDef[] = [
  {
    id: 'self-contained',
    name: 'Self-contained sections',
    weight: 0.25,
    why: 'AI agents retrieve individual sections, not whole articles. A section that only makes sense after reading what came before it will be retrieved alone — and misread alone.'
  },
  {
    id: 'answer-first',
    name: 'Answer first (BLUF)',
    weight: 0.2,
    why: 'Agents (and retrieval rankers) weight the start of a section heavily. Burying the answer under context makes the section both harder to retrieve and harder to answer from.'
  },
  {
    id: 'unresolved-references',
    name: 'Unresolved references',
    weight: 0.2,
    why: "Pronouns and pointers that depend on distant context break when text is split into sections. The agent can't resolve them and may answer about the wrong thing."
  },
  {
    id: 'one-idea',
    name: 'One idea per section',
    weight: 0.15,
    why: 'Retrieval matches a question to a section. A section covering three ideas matches all three questions weakly instead of one strongly.'
  },
  {
    id: 'structure',
    name: 'Structure signals',
    weight: 0.2,
    why: 'Headings, lists, and tables are structure an agent can parse reliably; walls of prose are not.'
  }
]

export const BAND_LABELS: Record<Band, string> = {
  'agent-ready': 'Agent-ready',
  'needs-edits': 'Needs edits before your agent can rely on it',
  struggle: 'An agent will struggle to answer from this'
}

/** Points a finding of this severity deducts from its check. */
export function deductionFor(severity: Severity): number {
  if (severity === 'major') return 25
  if (severity === 'minor') return 10
  return 0
}

export function checkStatus(score: number): CheckStatus {
  if (score >= 85) return 'pass'
  if (score >= 60) return 'needs-work'
  return 'fail'
}

export function bandFor(overall: number): Band {
  if (overall >= 85) return 'agent-ready'
  if (overall >= 60) return 'needs-edits'
  return 'struggle'
}

/** Only the first N findings of each rule count toward the deduction. */
export const PER_RULE_CAP = 3

export function buildReport(doc: DocModel, findings: Finding[]): Report {
  // Deterministic order: by position, then rule id.
  const ordered = [...findings].sort(
    (a, b) => a.span.start - b.span.start || a.ruleId.localeCompare(b.ruleId)
  )

  // Apply the per-rule cap in document order.
  const perRuleCount = new Map<string, number>()
  const scored: ScoredFinding[] = ordered.map((f) => {
    const seen = perRuleCount.get(f.ruleId) ?? 0
    perRuleCount.set(f.ruleId, seen + 1)
    const deduction = f.positive ? 0 : deductionFor(f.severity)
    const counted = !f.positive && seen < PER_RULE_CAP
    return { ...f, deduction, counted, recovery: 0 }
  })

  const checks: CheckResult[] = CHECK_DEFS.map((def) => {
    const own = scored.filter((f) => f.checkId === def.id)
    const totalDeduction = own.reduce(
      (n, f) => n + (f.counted ? f.deduction : 0),
      0
    )
    const score = Math.max(0, 100 - totalDeduction)
    // Exact recovery: what the check (and overall) would gain if this one
    // finding were fixed. Respects the floor at 0.
    for (const f of own) {
      if (!f.counted || f.deduction === 0) continue
      const without = Math.max(0, 100 - (totalDeduction - f.deduction))
      f.recovery = (without - score) * def.weight
    }
    return { def, score, status: checkStatus(score), findings: own }
  })

  const overallRaw = checks.reduce((n, c) => n + c.score * c.def.weight, 0)
  const overall = Math.round(overallRaw)
  const band = bandFor(overall)

  const issues = scored.filter((f) => !f.positive)
  const strengths = scored.filter((f) => f.positive === true)
  const fixes = [...issues]
    .sort(
      (a, b) =>
        b.recovery - a.recovery ||
        deductionFor(b.severity) - deductionFor(a.severity) ||
        a.span.start - b.span.start
    )
    .filter((f) => f.recovery > 0)
    .slice(0, 5)
  const topFixRecovery = fixes
    .slice(0, 3)
    .reduce((n, f) => n + f.recovery, 0)

  const checksWithIssues = checks.filter((c) =>
    c.findings.some((f) => !f.positive)
  ).length

  return {
    doc,
    overall,
    band,
    bandLabel: BAND_LABELS[band],
    checks,
    issues,
    strengths,
    fixes,
    issueCount: issues.length,
    checksWithIssues,
    topFixRecovery: Math.round(topFixRecovery)
  }
}
