import { describe, expect, it } from 'vitest'
import { parse } from '../src/engine/parse'
import {
  bandFor,
  buildReport,
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
