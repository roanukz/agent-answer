import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/nested-list'

describe('nested-list', () => {
  it('flags a list with items nested under other items', () => {
    const src = `## Escalation\n\n1. Open a ticket with the service desk.\n   - Include the exact error code.\n   - Include your employee ID.\n2. Ask your manager to approve.\n`
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('nested-list')
    expect(f.checkId).toBe('structure')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Escalation')
    expect(f.whyItMatters).toContain('flattens a nested list')
    // Anchored on the first nested item.
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      '   - Include the exact error code.'
    )
  })

  it('flags a bulleted list nested under a bulleted list', () => {
    const src = `## Devices\n\n- Soft token\n  - Refreshes automatically\n- Hardware token\n`
    expect(rule.run(parse(src))).toHaveLength(1)
  })

  it('near-miss: a flat list is not flagged', () => {
    const src = `## Escalation\n\n1. Open a ticket with the service desk.\n2. Include the exact error code.\n3. Ask your manager to approve.\n`
    expect(rule.run(parse(src))).toEqual([])
  })

  it('near-miss: a wrapped continuation line is not a nested item', () => {
    // The second line continues item 1; it carries no list marker.
    const src = `## Escalation\n\n1. Open a ticket with the service desk\n   and include the exact error code.\n2. Ask your manager to approve.\n`
    expect(rule.run(parse(src))).toEqual([])
  })

  it('emits one finding per list, not one per nested item', () => {
    const src = `## Escalation\n\n1. Open a ticket.\n   - Error code.\n   - Employee ID.\n   - Time of the attempt.\n`
    expect(rule.run(parse(src))).toHaveLength(1)
  })
})
