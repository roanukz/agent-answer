import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/generic-heading'

describe('generic-heading', () => {
  it('flags generic headings, including trailing colons and bare Step N', () => {
    const src = [
      '# Connecting your CRM',
      '',
      'Connect the CRM from the Integrations page.',
      '',
      '## Overview',
      '',
      'The integration syncs contacts hourly.',
      '',
      '## Notes:',
      '',
      'Sync pauses during maintenance windows.',
      '',
      '## Step 2',
      '',
      'Authorize the connection when prompted.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(3)
    expect(findings.every((f) => f.ruleId === 'generic-heading')).toBe(true)
    expect(findings.every((f) => f.severity === 'minor')).toBe(true)
    expect(
      findings.map((f) => doc.source.slice(f.span.start, f.span.end))
    ).toEqual(['## Overview', '## Notes:', '## Step 2'])
    expect(findings.map((f) => f.sectionHeading)).toEqual([
      'Overview',
      'Notes:',
      'Step 2'
    ])
  })

  it('flags an inferred plain-text heading like OVERVIEW', () => {
    const src = 'OVERVIEW\n\nThe nightly sync copies contacts into the CRM.\n'
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'OVERVIEW'
    )
  })

  it('does not flag headings that add specifics', () => {
    const src = [
      '## Overview of billing cycles',
      '',
      'Invoices are issued monthly.',
      '',
      '## Step 2: Authorize the app',
      '',
      'Click Allow when prompted.',
      '',
      '## Notes for workspace admins',
      '',
      'Only admins can revoke tokens.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag the implicit intro section', () => {
    const src = 'Some loose intro text sits here.\n\n# Resetting your token\n\nBody.\n'
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('uses the exact required whyItMatters string', () => {
    const src = '## Background\n\nThe legacy importer was retired in 2024.'
    const findings = rule.run(parse(src))
    expect(findings).toHaveLength(1)
    expect(findings[0]!.whyItMatters).toBe(
      'The heading travels with the section as its label; a generic label gives the agent (and retrieval) nothing to match on.'
    )
  })
})
