import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/ambiguous-it'

describe('ambiguous-it', () => {
  it('flags a later paragraph opening with "It" + verb', () => {
    const src = [
      '# Token expiry',
      '',
      'Access tokens are issued when you sign in to the portal.',
      '',
      'It expires after 24 hours unless you refresh the session. Generate a new one from Settings.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('ambiguous-it')
    expect(f.severity).toBe('minor')
    expect(f.checkId).toBe('unresolved-references')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      'It expires after 24 hours unless you refresh the session.'
    )
    expect(f.sectionHeading).toBe('Token expiry')
  })

  it('does not flag "It is recommended that you restart the agent."', () => {
    const src = [
      '# Troubleshooting',
      '',
      'The agent may stop responding after a configuration change.',
      '',
      'It is recommended that you restart the agent.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag the formal openers "It\'s possible" and "It is important"', () => {
    const src = [
      '# Exports',
      '',
      'Exports run nightly for every workspace.',
      '',
      "It's possible to trigger an export manually from the console.",
      '',
      'It is important to keep the export window under an hour.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('still flags "It is" openers outside the formal whitelist', () => {
    const src = [
      '# API keys',
      '',
      'Each workspace gets one primary API key at creation.',
      '',
      'It is the credential every integration must send. Rotate it quarterly.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'It is the credential every integration must send.'
    )
  })

  it('skips the first paragraph of each section', () => {
    const src = [
      '# Sync behaviour',
      '',
      'It runs every fifteen minutes in the background.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag paragraphs where "It" is not followed by a verb word', () => {
    const src = [
      '# Glossary',
      '',
      'The sync agent moves records between systems.',
      '',
      'It admin duties include reviewing the audit log.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
