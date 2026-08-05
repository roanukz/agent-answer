import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/dangling-pointer'

describe('dangling-pointer', () => {
  it('flags "the following" when no list or table comes after it in the section', () => {
    const src = [
      '# Prerequisites',
      '',
      'Make sure you complete the following before installing the agent.',
      '',
      '# Installation',
      '',
      '- Download the installer',
      '- Run the setup wizard'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('dangling-pointer')
    expect(f.severity).toBe('major')
    expect(f.checkId).toBe('unresolved-references')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe('the following')
    expect(f.sectionHeading).toBe('Prerequisites')
  })

  it('does not flag "the following" when a bulleted list follows in the same section', () => {
    const src = [
      '# Prerequisites',
      '',
      'Make sure you have the following before installing the agent.',
      '',
      '- A valid license key',
      '- Admin access to the workstation'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('flags "The above" with no earlier list or table, preserving original casing', () => {
    const src = [
      '# Pricing notes',
      '',
      'The above applies to enterprise plans only.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'The above'
    )
  })

  it('does not flag "The above" when a table appears earlier in the section', () => {
    const src = [
      '# Pricing notes',
      '',
      '| Plan | Price |',
      '|------|-------|',
      '| Pro  | $10   |',
      '',
      'The above applies to enterprise plans only.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag "the previous" when it is part of a cross-section pointer', () => {
    const src = [
      '# Verify the install',
      '',
      'See the previous section for the download steps.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('flags "the previous" when it points at a missing in-section target', () => {
    const src = [
      '# Verify the install',
      '',
      'Repeat the previous checklist on every workstation.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'the previous'
    )
  })

  it('does not count a code block as a target for "the following"', () => {
    const src = [
      '# Restart the service',
      '',
      'Run the following command in an elevated shell:',
      '',
      '```',
      'systemctl restart kb-agent',
      '```'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'the following'
    )
  })

  it('checks blockquote blocks and resolves targets within the same section', () => {
    const src = [
      '# Limits',
      '',
      '> Note: the following limits apply to free workspaces.',
      '',
      '| Limit | Value |',
      '|-------|-------|',
      '| Rows  | 500   |'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not let a list in another section satisfy the pointer', () => {
    const src = [
      '# Steps',
      '',
      '1. Open the console.',
      '2. Rotate the key.',
      '',
      '# Rollback',
      '',
      'Reverse the above in the opposite order.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(findings[0]!.sectionHeading).toBe('Rollback')
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'the above'
    )
  })
})
