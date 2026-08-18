/**
 * Findings → per-check scores → overall score.
 *
 * Per check: start at 100, subtract 25 per major and 10 per minor; info
 * costs nothing. Only the first 3 findings per rule count toward the
 * deduction (the rest are listed but tagged as the same habit). Scores
 * floor at 0. The overall score is the weighted average of the five
 * checks. Fully deterministic — same input, same score, always.
 *
 * The weighted average alone cannot certify an article, because the weights
 * decide how much a collapsed check hurts. A check worth 15% driven to 0
 * leaves a composite of 85, which used to read as agent-ready; the same
 * collapse on the 25% check gave 81 and failed. Whether a completely failed
 * check sank the article depended only on which check it was. CHECK_FLOOR
 * closes that: no article is agent-ready with any check below it.
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
import { snippetize, type SnippetMap } from './snippets.js'

export const CHECK_DEFS: readonly CheckDef[] = [
  {
    id: 'self-contained',
    name: 'Self-contained sections',
    weight: 0.25,
    why: 'AI agents retrieve individual sections, not whole articles. A section that only makes sense after reading what came before it will be retrieved alone, and misread alone.'
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

/**
 * The per-check floor. No article is agent-ready with any check below it,
 * whatever the composite says.
 *
 * 60 rather than a new number, because 60 is already the published boundary
 * between "needs work" and "fail" on every check card. The tool already
 * told readers that a failing check is a failing check whatever the total
 * says; the floor makes the score obey the sentence.
 */
export const CHECK_FLOOR = 60

/**
 * The band, given the composite and the weakest check. A check below the
 * floor caps the band at needs-edits: the composite is never altered, only
 * the certification it can buy.
 *
 * Takes the UNROUNDED composite. Banding on the rounded number is a second
 * way to certify an article that has not earned it, because 84.75 displays
 * as 85. Callers pass overallRaw and round only for display.
 */
export function bandFor(overall: number, weakestScore = 100): Band {
  if (overall >= 85 && weakestScore >= CHECK_FLOOR) return 'agent-ready'
  if (overall >= 60) return 'needs-edits'
  return 'struggle'
}

/** Only the first N findings of each rule count toward the deduction. */
export const PER_RULE_CAP = 3

/**
 * The snippet map defaults to computing itself from the document, so a
 * report built in a test is the same report analyze() builds. analyze()
 * passes the map it already has rather than paying for it twice.
 */
export function buildReport(
  doc: DocModel,
  findings: Finding[],
  snippets: SnippetMap = snippetize(doc)
): Report {
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
    return { ...f, deduction, counted, impact: 0, recovery: 0 }
  })

  /**
   * A check's capped deduction with some findings excluded ("fixed").
   * Re-applies the per-rule cap, so fixing a counted finding can promote
   * a previously uncounted sibling into the cap.
   */
  const cappedDeduction = (
    own: ScoredFinding[],
    excluded: ReadonlySet<ScoredFinding>
  ): number => {
    const count = new Map<string, number>()
    let total = 0
    for (const f of own) {
      if (f.positive || excluded.has(f)) continue
      const seen = count.get(f.ruleId) ?? 0
      count.set(f.ruleId, seen + 1)
      if (seen < PER_RULE_CAP) total += f.deduction
    }
    return total
  }

  const NONE: ReadonlySet<ScoredFinding> = new Set()
  const checks: CheckResult[] = CHECK_DEFS.map((def) => {
    const own = scored.filter((f) => f.checkId === def.id)
    const totalDeduction = cappedDeduction(own, NONE)
    const score = Math.max(0, 100 - totalDeduction)
    for (const f of own) {
      if (!f.counted || f.deduction === 0) continue
      f.impact = f.deduction * def.weight
      // Exact recovery for fixing this one finding: cap-aware and
      // floor-aware, so it can be 0 when siblings would fill the gap.
      const without = Math.max(0, 100 - cappedDeduction(own, new Set([f])))
      f.recovery = (without - score) * def.weight
    }
    return { def, score, status: checkStatus(score), findings: own }
  })

  const overallRaw = checks.reduce((n, c) => n + c.score * c.def.weight, 0)
  const overall = Math.round(overallRaw)
  // Ties go to the earlier check in CHECK_DEFS order, so the weakest check
  // shown in the header never depends on iteration luck.
  const weakestCheck = checks.reduce((worst, c) =>
    c.score < worst.score ? c : worst
  )
  // Band on the UNROUNDED composite. Rounding first promotes a composite
  // that is below the threshold into the band above it: checks of
  // [45, 100, 100, 90, 100] average 84.75, which displays as 85 and used to
  // certify the article. Only the display rounds.
  const band = bandFor(overallRaw, weakestCheck.score)
  const floored = overallRaw >= 85 && weakestCheck.score < CHECK_FLOOR

  const issues = scored.filter((f) => !f.positive)
  const strengths = scored.filter((f) => f.positive === true)
  // Rank by impact (the weighted points a finding costs), so majors lead
  // even when a saturated check makes any single fix recover 0.
  const fixes = [...issues]
    .sort(
      (a, b) =>
        b.impact - a.impact ||
        deductionFor(b.severity) - deductionFor(a.severity) ||
        a.span.start - b.span.start
    )
    .filter((f) => f.impact > 0)
    .slice(0, 5)
  // The summary's "~N points" is the exact overall gain from fixing the
  // top three together — group math handles cap promotion and the floor.
  const topSet = new Set(fixes.slice(0, 3))
  const topFixRecovery = checks.reduce((sum, c) => {
    const withoutTop = Math.max(
      0,
      100 - cappedDeduction(c.findings, topSet)
    )
    return sum + (withoutTop - c.score) * c.def.weight
  }, 0)

  const checksWithIssues = checks.filter((c) =>
    c.findings.some((f) => !f.positive)
  ).length

  return {
    doc,
    snippets,
    overall,
    band,
    bandLabel: BAND_LABELS[band],
    checks,
    weakestCheck,
    floored,
    issues,
    strengths,
    fixes,
    issueCount: issues.length,
    checksWithIssues,
    topFixRecovery: Math.round(topFixRecovery)
  }
}
