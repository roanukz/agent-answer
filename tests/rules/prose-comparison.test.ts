import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/prose-comparison'

describe('prose-comparison', () => {
  it('flags a tableless section with two comparison sentences, on the second one', () => {
    const src = [
      '## Basic vs Premium',
      '',
      'The Basic plan includes five seats, whereas the Premium plan includes twenty.',
      'Storage works differently too. Premium offers unlimited history, while the Basic plan keeps ninety days.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('prose-comparison')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Basic vs Premium')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      'Premium offers unlimited history, while the Basic plan keeps ninety days.'
    )
  })

  it('matches "vs." and "compared to" case-insensitively', () => {
    const src = [
      '## Choosing single sign-on',
      '',
      'Choose SAML vs. OIDC based on your identity provider.',
      '',
      'Compared to OIDC, SAML setup takes longer.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(
      doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)
    ).toBe('Compared to OIDC, SAML setup takes longer.')
  })

  it('counts a comparison sentence inside a blockquote', () => {
    const src = [
      '## Plan differences',
      '',
      'The annual plan is billed once, whereas the monthly plan renews every month.',
      '',
      '> In contrast, the trial plan never renews at all.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    // Blockquote sentences keep the "> " marker; the span is source-exact.
    expect(
      doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)
    ).toBe('> In contrast, the trial plan never renews at all.')
  })

  it('stays quiet when the section already has a table (near-miss)', () => {
    const src = [
      '## Basic vs Premium',
      '',
      'The Basic plan includes five seats, whereas the Premium plan includes twenty.',
      'Premium offers unlimited history, while the Basic plan keeps ninety days.',
      '',
      '| Plan | Seats | History |',
      '| --- | --- | --- |',
      '| Basic | 5 | 90 days |',
      '| Premium | 20 | Unlimited |',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('stays quiet with only one comparison sentence (near-miss)', () => {
    const src = [
      '## Storage limits',
      '',
      'Premium offers unlimited history, whereas Basic keeps ninety days.',
      'Both plans compress attachments before upload.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
