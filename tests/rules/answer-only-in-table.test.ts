import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/answer-only-in-table'

const TABLE = `| Region | Sessions | Reset window |
| --- | --- | --- |
| Americas | 3 | 24 hours |
| EMEA | 2 | 48 hours |`

describe('answer-only-in-table', () => {
  it('flags a section whose answer exists only in a table', () => {
    const doc = parse(`## Plan limits\n\n${TABLE}\n`)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('answer-only-in-table')
    expect(f.checkId).toBe('structure')
    // A minor on purpose: prose-comparison, in this same check, tells
    // authors to build the table. The fix here is additive.
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Plan limits')
    expect(f.whyItMatters).toContain('currently unable to surface content')
    expect(doc.source.slice(f.span.start, f.span.end)).toContain('| Americas |')
  })

  it('a bare lead-in line does not rescue the section', () => {
    const doc = parse(`## Plan limits\n\nThe limits are:\n\n${TABLE}\n`)
    expect(rule.run(doc)).toHaveLength(1)
  })

  it('near-miss: a table beside a written answer is not flagged', () => {
    const prose =
      'Most employees should choose the soft token, because it refreshes itself over the network and the help desk can reissue it the same day.'
    const doc = parse(`## Plan limits\n\n${prose}\n\n${TABLE}\n`)
    expect(rule.run(doc)).toEqual([])
  })

  it('near-miss: a section with no table at all', () => {
    const doc = parse('## Plan limits\n\nThree sessions per employee.\n')
    expect(rule.run(doc)).toEqual([])
  })
})
