import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/bare-demonstrative'

describe('bare-demonstrative', () => {
  it('flags a later paragraph opening with "This" + verb', () => {
    const src = [
      '# Rate limits',
      '',
      'Every workspace has a request quota that resets hourly.',
      '',
      'This means large imports should run overnight. Schedule them from the admin console.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('bare-demonstrative')
    expect(f.severity).toBe('minor')
    expect(f.checkId).toBe('unresolved-references')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      'This means large imports should run overnight.'
    )
    expect(f.sectionHeading).toBe('Rate limits')
  })

  it('flags "These" + verb in a later paragraph', () => {
    const src = [
      '# Permissions',
      '',
      'Editors can publish articles and manage tags.',
      '',
      'These require admin approval before they take effect.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'These require admin approval before they take effect.'
    )
  })

  it('does not flag "This setting controls the timeout." — setting is not a verb', () => {
    const src = [
      '# Timeouts',
      '',
      'Requests time out after 30 seconds by default.',
      '',
      'This setting controls the timeout.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('skips the first paragraph of each section (orphan-opener territory)', () => {
    const src = [
      '# Overview',
      '',
      'This explains how billing works for annual plans.',
      '',
      '# Invoices',
      '',
      'This covers the invoice PDF layout.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('only checks the first sentence of a paragraph', () => {
    const src = [
      '# Quotas',
      '',
      'Imports count against the hourly quota.',
      '',
      'The quota resets every hour on the hour. This means overnight jobs are safer.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag list items that start with a demonstrative', () => {
    const src = [
      '# Notes',
      '',
      'Keep these caveats in mind before migrating.',
      '',
      '- This applies to legacy exports only',
      '- That depends on your plan'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
