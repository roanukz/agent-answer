import { describe, expect, it } from 'vitest'
import { parse } from '../src/engine/parse'
import {
  bandFor,
  buildReport,
  CHECK_DEFS,
  CHECK_FLOOR,
  checkStatus,
  deductionFor,
  PER_RULE_CAP
} from '../src/engine/score'
import type { CheckId, Finding, Severity } from '../src/engine/types'

const doc = parse('# H\n\nBody text.\n')

let counter = 0
function finding(
  checkId: CheckId,
  severity: Severity,
  ruleId = `rule-${severity}`,
  positive = false
): Finding {
  counter += 2
  return {
    ruleId,
    checkId,
    severity,
    span: { start: counter, end: counter + 1 },
    message: 'm',
    whyItMatters: 'w',
    suggestion: 's',
    positive: positive || undefined
  }
}

function checkScore(report: ReturnType<typeof buildReport>, id: CheckId) {
  return report.checks.find((c) => c.def.id === id)!.score
}

describe('deduction math', () => {
  it('majors cost 25, minors 10, info 0', () => {
    expect(deductionFor('major')).toBe(25)
    expect(deductionFor('minor')).toBe(10)
    expect(deductionFor('info')).toBe(0)
  })

  it('subtracts per finding within a check', () => {
    const report = buildReport(doc, [
      finding('self-contained', 'major', 'a'),
      finding('self-contained', 'minor', 'b'),
      finding('self-contained', 'info', 'c')
    ])
    expect(checkScore(report, 'self-contained')).toBe(65)
  })

  it('floors a check at 0', () => {
    const report = buildReport(doc, [
      finding('self-contained', 'major', 'a1'),
      finding('self-contained', 'major', 'a2'),
      finding('self-contained', 'major', 'a3'),
      finding('self-contained', 'major', 'b1'),
      finding('self-contained', 'major', 'b2')
    ])
    expect(checkScore(report, 'self-contained')).toBe(0)
  })

  it('unaffected checks stay at 100', () => {
    const report = buildReport(doc, [finding('structure', 'minor', 'x')])
    expect(checkScore(report, 'self-contained')).toBe(100)
    expect(checkScore(report, 'structure')).toBe(90)
  })

  it('positive findings never deduct', () => {
    const report = buildReport(doc, [
      finding('structure', 'info', 'strengths', true)
    ])
    expect(checkScore(report, 'structure')).toBe(100)
    expect(report.strengths).toHaveLength(1)
    expect(report.issues).toHaveLength(0)
  })
})

describe('per-rule cap', () => {
  it(`only the first ${PER_RULE_CAP} findings of a rule count`, () => {
    const findings = Array.from({ length: 6 }, () =>
      finding('unresolved-references', 'minor', 'same-rule')
    )
    const report = buildReport(doc, findings)
    // 3 × 10 = 30, not 60
    expect(checkScore(report, 'unresolved-references')).toBe(70)
    const scored = report.checks.find(
      (c) => c.def.id === 'unresolved-references'
    )!.findings
    expect(scored.filter((f) => f.counted)).toHaveLength(3)
    expect(scored.filter((f) => !f.counted)).toHaveLength(3)
  })

  it('the cap applies per rule, not per check', () => {
    const report = buildReport(doc, [
      ...Array.from({ length: 4 }, () =>
        finding('unresolved-references', 'minor', 'rule-a')
      ),
      ...Array.from({ length: 4 }, () =>
        finding('unresolved-references', 'minor', 'rule-b')
      )
    ])
    // 3 counted from each rule: 60 off
    expect(checkScore(report, 'unresolved-references')).toBe(40)
  })
})

describe('weights', () => {
  it('overall is the weighted average 25/20/20/15/20', () => {
    // Knock self-contained (weight .25) to 75: overall = 100 - 25*0.25
    const report = buildReport(doc, [
      finding('self-contained', 'major', 'a')
    ])
    expect(report.overall).toBe(94) // 100 - 6.25 → 93.75 → 94
  })

  it('a perfect document scores 100', () => {
    expect(buildReport(doc, []).overall).toBe(100)
  })

  it('all checks at 0 gives 0', () => {
    const findings: Finding[] = []
    const checkIds: CheckId[] = [
      'self-contained',
      'answer-first',
      'unresolved-references',
      'one-idea',
      'structure'
    ]
    for (const id of checkIds) {
      for (let i = 0; i < 4; i++) findings.push(finding(id, 'major', `${id}-${i}`))
    }
    expect(buildReport(doc, findings).overall).toBe(0)
  })
})

/**
 * The defect these pin: a weighted average alone lets a completely failed
 * check pass, and whether it passes depends only on which check it was.
 * The three cases are the arithmetic that proves it, and each one also
 * asserts the band the floor now produces.
 */
describe('the per-check floor', () => {
  /** Drive one check down by n majors, each from a different rule. */
  function collapse(check: CheckId, majors: number) {
    return Array.from({ length: majors }, (_, i) =>
      finding(check, 'major', `${check}-${i}`)
    )
  }

  const raw = (report: ReturnType<typeof buildReport>) =>
    report.checks.reduce((n, c) => n + c.score * c.def.weight, 0)

  it('the 15% check at 25, others at 100: 88.75, and NOT agent-ready', () => {
    // 3 majors × 25 = 75 off → 25. 0.15 × 25 + 0.85 × 100 = 88.75.
    const report = buildReport(doc, collapse('one-idea', 3))
    expect(checkScore(report, 'one-idea')).toBe(25)
    expect(raw(report)).toBeCloseTo(88.75, 10)
    expect(report.overall).toBe(89)
    // Used to read as agent-ready on the composite alone.
    expect(report.band).toBe('needs-edits')
    expect(report.floored).toBe(true)
    expect(report.weakestCheck.def.id).toBe('one-idea')
  })

  it('the 15% check at 0, others at 100: exactly 85.0, and NOT agent-ready', () => {
    // 4 majors × 25 = 100 off → 0. 0.15 × 0 + 0.85 × 100 = 85.0.
    const report = buildReport(doc, collapse('one-idea', 4))
    expect(checkScore(report, 'one-idea')).toBe(0)
    expect(raw(report)).toBeCloseTo(85.0, 10)
    expect(report.overall).toBe(85)
    // The exact case the tool used to certify: a zeroed check, 85, pass.
    expect(report.band).toBe('needs-edits')
    expect(report.floored).toBe(true)
  })

  it('the 25% check at 25, others at 100: 81.25, and fails on the composite alone', () => {
    // The same collapse as the first case, moved to the heaviest check:
    // 0.25 × 25 + 0.75 × 100. This is the case that always worked, and it
    // is why the defect looked invisible — the arithmetic only betrays you
    // on the lighter checks.
    const report = buildReport(doc, collapse('self-contained', 3))
    expect(checkScore(report, 'self-contained')).toBe(25)
    expect(raw(report)).toBeCloseTo(81.25, 10)
    expect(report.overall).toBe(81)
    expect(report.band).toBe('needs-edits')
    // Not "floored": the composite never reached 85, so the floor did no
    // work here. This is the case that was already handled correctly.
    expect(report.floored).toBe(false)
  })

  it('the floor is 60, the same number the check cards already call a fail', () => {
    expect(CHECK_FLOOR).toBe(60)
    expect(checkStatus(CHECK_FLOOR)).toBe('needs-work')
    expect(checkStatus(CHECK_FLOOR - 1)).toBe('fail')
  })

  it('a check exactly at the floor still allows agent-ready', () => {
    // 4 minors × 10 = 40 off → 60, exactly the floor.
    const report = buildReport(
      doc,
      Array.from({ length: 4 }, (_, i) => finding('one-idea', 'minor', `r${i}`))
    )
    expect(checkScore(report, 'one-idea')).toBe(60)
    expect(report.overall).toBe(94)
    expect(report.band).toBe('agent-ready')
    expect(report.floored).toBe(false)
  })

  it('bandFor caps at needs-edits when the weakest check is below the floor', () => {
    expect(bandFor(100, 100)).toBe('agent-ready')
    expect(bandFor(85, 60)).toBe('agent-ready')
    expect(bandFor(85, 59)).toBe('needs-edits')
    expect(bandFor(99, 0)).toBe('needs-edits')
    // A weak check cannot rescue a bad composite either.
    expect(bandFor(59, 100)).toBe('struggle')
  })

  it('the weakest check is reported even when everything passes', () => {
    const report = buildReport(doc, [finding('structure', 'minor', 'x')])
    expect(report.weakestCheck.def.id).toBe('structure')
    expect(report.weakestCheck.score).toBe(90)
    expect(report.floored).toBe(false)
  })

  it('ties for weakest resolve in CHECK_DEFS order, not iteration order', () => {
    const report = buildReport(doc, [
      finding('structure', 'minor', 'a'),
      finding('answer-first', 'minor', 'b')
    ])
    // Both sit at 90; answer-first is declared first.
    expect(report.weakestCheck.def.id).toBe('answer-first')
  })
})

describe('band edges', () => {
  it('check status: pass ≥ 85, needs-work 60–84, fail < 60', () => {
    expect(checkStatus(85)).toBe('pass')
    expect(checkStatus(84)).toBe('needs-work')
    expect(checkStatus(60)).toBe('needs-work')
    expect(checkStatus(59)).toBe('fail')
  })

  it('overall bands: 85 agent-ready, 60–84 needs-edits, <60 struggle', () => {
    expect(bandFor(85)).toBe('agent-ready')
    expect(bandFor(84)).toBe('needs-edits')
    expect(bandFor(60)).toBe('needs-edits')
    expect(bandFor(59)).toBe('struggle')
  })

  it('reports carry the exact band labels', () => {
    const clean = buildReport(doc, [])
    expect(clean.bandLabel).toBe('Agent-ready')
  })
})

describe('recovery and fix list', () => {
  it('recovery reflects weighted points regained by fixing one finding', () => {
    const report = buildReport(doc, [finding('self-contained', 'major', 'a')])
    const f = report.issues[0]!
    expect(f.recovery).toBeCloseTo(6.25)
  })

  it('recovery respects the 0 floor (fixing one of many majors regains less)', () => {
    const report = buildReport(doc, [
      finding('self-contained', 'major', 'a1'),
      finding('self-contained', 'major', 'a2'),
      finding('self-contained', 'major', 'a3'),
      finding('self-contained', 'major', 'b1'),
      finding('self-contained', 'major', 'b2')
    ])
    // deduction 125 → floored at 0; removing one major leaves 100 → still 0
    for (const f of report.issues.filter((x) => x.counted)) {
      expect(f.recovery).toBe(0)
    }
  })

  it('fix list is capped at 5 and sorted by impact', () => {
    const report = buildReport(doc, [
      finding('self-contained', 'major', 'a'),
      finding('answer-first', 'major', 'b'),
      finding('unresolved-references', 'minor', 'c'),
      finding('one-idea', 'minor', 'd'),
      finding('structure', 'minor', 'e'),
      finding('structure', 'minor', 'f')
    ])
    expect(report.fixes.length).toBeLessThanOrEqual(5)
    const impacts = report.fixes.map((f) => f.impact)
    expect([...impacts].sort((x, y) => y - x)).toEqual(impacts)
  })

  it('uncounted (capped) findings have zero impact and sink in the fix list', () => {
    const findings = Array.from({ length: 5 }, () =>
      finding('structure', 'minor', 'same')
    )
    const report = buildReport(doc, findings)
    const uncounted = report.issues.filter((f) => !f.counted)
    expect(uncounted.every((f) => f.impact === 0)).toBe(true)
    expect(report.fixes.every((f) => f.counted)).toBe(true)
  })

  it('recovery is cap-aware: a capped sibling takes the fixed finding’s place', () => {
    // 4 majors of one rule: 3 counted (75 off). Fixing any one just lets
    // the 4th into the cap, so true recovery is 0 — but impact still ranks
    // them at the top of the fix list.
    const findings = Array.from({ length: 4 }, () =>
      finding('self-contained', 'major', 'same-rule')
    )
    const report = buildReport(doc, findings)
    const counted = report.issues.filter((f) => f.counted)
    expect(counted).toHaveLength(3)
    expect(counted.every((f) => f.recovery === 0)).toBe(true)
    expect(counted.every((f) => f.impact === 6.25)).toBe(true)
    expect(report.fixes).toHaveLength(3)
    // Group recovery for the top 3 is exact: removing all three leaves one
    // counted major (25 off) → check 75 instead of 25 → +12.5 overall.
    expect(report.topFixRecovery).toBe(13)
  })

  it('majors on a floored check still lead the fix list', () => {
    const report = buildReport(doc, [
      finding('self-contained', 'major', 'a1'),
      finding('self-contained', 'major', 'a2'),
      finding('self-contained', 'major', 'a3'),
      finding('self-contained', 'major', 'b1'),
      finding('self-contained', 'major', 'b2'),
      finding('structure', 'minor', 'small')
    ])
    // Every single-major fix on the floored check recovers 0, but the fix
    // list must not lead with the unrelated minor.
    expect(report.fixes[0]!.severity).toBe('major')
  })
})

describe('determinism', () => {
  it('same findings in any order produce the same report', () => {
    const a = [
      finding('self-contained', 'major', 'a'),
      finding('structure', 'minor', 'b'),
      finding('one-idea', 'minor', 'c')
    ]
    const r1 = buildReport(doc, a)
    const r2 = buildReport(doc, [...a].reverse())
    expect(r1.overall).toBe(r2.overall)
    expect(r1.issues.map((f) => f.ruleId)).toEqual(
      r2.issues.map((f) => f.ruleId)
    )
  })
})

/**
 * Rounding must not buy a certification.
 *
 * The floor closes the case where a collapsed check hides behind an average.
 * This is the other way the same threshold can be crossed without earning it:
 * a composite below 85 that displays as 85. Both are the same bug wearing
 * different clothes, so both are pinned.
 */
describe('the band reads the unrounded composite', () => {
  it('84.75 displays as 85 and is not agent-ready', () => {
    const scores = [45, 100, 100, 90, 100]
    const raw = CHECK_DEFS.reduce((sum, def, i) => sum + scores[i]! * def.weight, 0)
    expect(raw).toBeCloseTo(84.75, 10)
    expect(Math.round(raw)).toBe(85)
    // The bug: banding on the rounded number promotes it.
    expect(bandFor(Math.round(raw))).toBe('agent-ready')
    // The fix: banding on the raw number does not.
    expect(bandFor(raw)).toBe('needs-edits')
  })

  it('an exact 85.0 still passes when every check clears the floor', () => {
    expect(bandFor(85.0, 100)).toBe('agent-ready')
  })
})
