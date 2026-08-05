import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/heading-jump'

describe('heading-jump', () => {
  it('flags a heading two levels deeper than the previous one', () => {
    const src = [
      '# Getting started',
      '',
      'Install the agent from the downloads page.',
      '',
      '### Configure the proxy',
      '',
      'Set the proxy host in the network settings.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('heading-jump')
    expect(f.severity).toBe('info')
    expect(f.sectionHeading).toBe('Configure the proxy')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      '### Configure the proxy'
    )
  })

  it('flags every jump, but not deepening by exactly one after a jump', () => {
    const src = [
      '# Setup',
      '',
      'Overview text.',
      '',
      '### Install',
      '',
      'Install steps.',
      '',
      '#### Verify install',
      '',
      'Verification steps.',
      '',
      '## Troubleshooting',
      '',
      'General tips.',
      '',
      '#### Proxy errors',
      '',
      'Proxy fixes.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    // Jumps: # -> ### (1 to 3) and ## -> #### (2 to 4).
    // #### after ### (3 to 4) and ## after #### (shallower) are fine.
    expect(findings).toHaveLength(2)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      '### Install'
    )
    expect(doc.source.slice(findings[1]!.span.start, findings[1]!.span.end)).toBe(
      '#### Proxy errors'
    )
    expect(findings[0]!.span.start).toBeLessThan(findings[1]!.span.start)
  })

  it('accepts a clean one-level-at-a-time outline (near-miss)', () => {
    const src = [
      '# Account settings',
      '',
      'Intro.',
      '',
      '## Profile',
      '',
      'Profile text.',
      '',
      '### Avatar',
      '',
      'Avatar text.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag the first heading even when it is deep', () => {
    const src = 'Some intro before any heading.\n\n### Deep first heading\n\nBody.\n'
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
