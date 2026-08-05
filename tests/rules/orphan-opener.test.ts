import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/orphan-opener'

describe('orphan-opener', () => {
  it('flags a first sentence opening with a demonstrative + verb', () => {
    const src = [
      '# Managing API tokens',
      '',
      'API tokens authenticate requests to the billing service.',
      '',
      '## Token expiry errors',
      '',
      'This happens because the token has expired. Generate a new token from the dashboard.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('orphan-opener')
    expect(f.severity).toBe('major')
    expect(f.sectionHeading).toBe('Token expiry errors')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      'This happens because the token has expired.'
    )
  })

  it('flags a first sentence opening with a connective', () => {
    const src = [
      '# Sandbox environments',
      '',
      'Sandbox environments mirror production configuration.',
      '',
      '## Token rotation',
      '',
      'However, sandbox tokens never expire and do not need rotation.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('orphan-opener')
    expect(f.severity).toBe('major')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      'However, sandbox tokens never expire and do not need rotation.'
    )
  })

  it('flags a multi-word connective opener like "As a result"', () => {
    const src = [
      '## Billing after downgrade',
      '',
      'As a result, unused seats are credited to your next invoice.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'As a result, unused seats are credited to your next invoice.'
    )
  })

  it('flags an implicit intro section and labels it (Introduction)', () => {
    const src = [
      'It expires after 30 days of inactivity.',
      '',
      '# Token details',
      '',
      'Tokens are scoped to a single workspace.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.sectionHeading).toBe('(Introduction)')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      'It expires after 30 days of inactivity.'
    )
  })

  it('does not flag "This <noun>" openers', () => {
    const src = [
      '## Resetting your password',
      '',
      'This article explains how to reset a forgotten password. Open the login page to begin.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag a connective that appears after the first sentence', () => {
    const src = [
      '## Token lifetimes',
      '',
      'Production tokens expire after 90 days. However, sandbox tokens never expire.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('uses the exact required whyItMatters string', () => {
    const src = '## Sync limits\n\nThis means the hourly sync skips archived records.'
    const findings = rule.run(parse(src))
    expect(findings).toHaveLength(1)
    expect(findings[0]!.whyItMatters).toBe(
      "If this section is retrieved alone, the agent has no idea what 'this' refers to."
    )
  })
})
