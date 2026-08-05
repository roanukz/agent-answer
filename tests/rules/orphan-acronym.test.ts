import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/orphan-acronym'

describe('orphan-acronym', () => {
  it('flags bare uses in sections other than the defining one', () => {
    const src = [
      '# Single sign-on setup',
      '',
      'Single Sign-On (SSO) lets team members log in with your identity provider.',
      '',
      '## Enabling SSO for your team',
      '',
      'Open Security settings and turn on SSO enforcement.',
      '',
      '## Troubleshooting login loops',
      '',
      'If SSO keeps redirecting, clear cookies for the login domain.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(2)
    expect(findings.every((f) => f.ruleId === 'orphan-acronym')).toBe(true)
    expect(findings.every((f) => f.severity === 'minor')).toBe(true)
    for (const f of findings) {
      expect(doc.source.slice(f.span.start, f.span.end)).toBe('SSO')
    }
    expect(findings.map((f) => f.sectionHeading)).toEqual([
      'Enabling SSO for your team',
      'Troubleshooting login loops'
    ])
    // First finding is the first bare use in its section body ("turn on SSO").
    expect(doc.source.slice(findings[0]!.span.start - 8, findings[0]!.span.start)).toBe(
      'turn on '
    )
  })

  it('flags a bare use that appears before the defining section', () => {
    const src = [
      '# Quick start',
      '',
      'Enable MFA before inviting teammates.',
      '',
      '# Security concepts',
      '',
      'Multi-Factor Authentication (MFA) adds a second step to every login.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.sectionHeading).toBe('Quick start')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe('MFA')
  })

  it('stays silent when the acronym is defined in more than one section', () => {
    const src = [
      '# Plans',
      '',
      'Every plan includes a Service Level Agreement (SLA).',
      '',
      '# Enterprise',
      '',
      'The Service Level Agreement (SLA) covers uptime. SLA credits apply automatically.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('stays silent when bare uses stay inside the defining section', () => {
    const src = [
      '# Support tiers',
      '',
      'A Service Level Agreement (SLA) defines response times. SLA breaches earn credits.',
      '',
      '# Contact',
      '',
      'Email support for anything urgent.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('stays silent when the acronym is never defined', () => {
    const src = [
      '# Export basics',
      '',
      'Use the API to export contacts.',
      '',
      '# Rate limits',
      '',
      'The API allows 100 requests per minute.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('uses the exact required whyItMatters string', () => {
    const src = [
      '# About tokens',
      '',
      'A Personal Access Token (PAT) authenticates the CLI.',
      '',
      '# Revoking access',
      '',
      'Delete the PAT from the security page.'
    ].join('\n')
    const findings = rule.run(parse(src))
    expect(findings).toHaveLength(1)
    expect(findings[0]!.whyItMatters).toBe(
      'The section where the acronym is expanded may not be retrieved with this one.'
    )
  })
})
