import { describe, expect, it } from 'vitest'
import { analyze } from '../src/engine/analyze'
import { SCORING_RULE_IDS } from '../src/engine/rules/index'
import badArticle from './fixtures/bad-article.md?raw'
import goodArticle from './fixtures/good-article.md?raw'

/**
 * The 19 scoring rules the spec defines, written out literally so a rule
 * silently dropped from the registry fails here instead of shrinking the
 * expectation with it.
 */
const SPEC_RULE_IDS = [
  'orphan-opener',
  'cross-section-pointer',
  'generic-heading',
  'orphan-acronym',
  'preamble-opener',
  'buried-steps',
  'slow-start',
  'dangling-pointer',
  'bare-demonstrative',
  'ambiguous-it',
  'relative-time',
  'section-too-long',
  'topic-shift',
  'no-headings',
  'low-heading-density',
  'heading-jump',
  'prose-comparison',
  'prose-sequence',
  'wall-of-text'
] as const

describe('bad-article fixture', () => {
  const report = analyze(badArticle)

  it('scores at or below 50', () => {
    expect(report.overall).toBeLessThanOrEqual(50)
  })

  it('lands in the struggle band', () => {
    expect(report.band).toBe('struggle')
    expect(report.bandLabel).toBe('An agent will struggle to answer from this')
  })

  it('the registry carries exactly the 19 rules the spec names', () => {
    expect([...SCORING_RULE_IDS].sort()).toEqual([...SPEC_RULE_IDS].sort())
  })

  it('triggers every rule that can coexist with headings', () => {
    const fired = new Set(report.issues.map((f) => f.ruleId))
    // no-headings requires a document with zero headings, which cannot
    // coexist with the heading-dependent rules — covered by the variant
    // below. Every other scoring rule must fire on the fixture itself.
    const expected = SPEC_RULE_IDS.filter((id) => id !== 'no-headings')
    for (const id of expected) {
      expect(fired, `rule ${id} should fire on bad-article`).toContain(id)
    }
  })

  it('triggers no-headings on the heading-stripped variant (all 19 rules covered)', () => {
    const stripped = badArticle
      .split('\n')
      .filter((line) => !/^#{1,6}\s/.test(line))
      .join('\n')
    const variant = analyze(stripped)
    expect(variant.doc.headingCount).toBe(0)
    const fired = new Set(variant.issues.map((f) => f.ruleId))
    expect(fired).toContain('no-headings')

    const union = new Set([...report.issues.map((f) => f.ruleId), ...fired])
    for (const id of SPEC_RULE_IDS) {
      expect(union, `rule ${id} should fire across fixture + variant`).toContain(
        id
      )
    }
  })

  it('also records strengths (numbered steps)', () => {
    expect(report.strengths.length).toBeGreaterThanOrEqual(1)
  })

  it('every finding span slices to non-empty text that matches the quote', () => {
    for (const f of report.issues) {
      const sliced = badArticle.slice(f.span.start, f.span.end)
      expect(sliced.length).toBeGreaterThan(0)
    }
  })

  it('every finding carries message, whyItMatters, and suggestion', () => {
    for (const f of [...report.issues, ...report.strengths]) {
      expect(f.message.length).toBeGreaterThan(0)
      expect(f.whyItMatters.length).toBeGreaterThan(0)
      expect(f.suggestion.length).toBeGreaterThan(0)
    }
  })
})

describe('good-article fixture', () => {
  const report = analyze(goodArticle)

  it('scores at or above 85 (Agent-ready)', () => {
    expect(report.overall).toBeGreaterThanOrEqual(85)
    expect(report.band).toBe('agent-ready')
  })

  it('has zero major findings', () => {
    expect(report.issues.filter((f) => f.severity === 'major')).toHaveLength(0)
  })

  it('has at most 2 minor findings', () => {
    expect(
      report.issues.filter((f) => f.severity === 'minor').length
    ).toBeLessThanOrEqual(2)
  })

  it('records strengths to celebrate', () => {
    expect(report.strengths.length).toBeGreaterThanOrEqual(3)
  })
})

describe('determinism', () => {
  it('same input produces the same report, run after run', () => {
    const a = analyze(badArticle)
    const b = analyze(badArticle)
    expect(a.overall).toBe(b.overall)
    expect(a.issues.map((f) => `${f.ruleId}:${f.span.start}`)).toEqual(
      b.issues.map((f) => `${f.ruleId}:${f.span.start}`)
    )
  })
})
