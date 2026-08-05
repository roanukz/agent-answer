import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/prose-sequence'

describe('prose-sequence', () => {
  it('flags a paragraph with three ordering words and no numbered list nearby', () => {
    const para =
      'First, open the settings page and pick the export tab. Then choose the date range you need. Finally, click Export and wait for the email link.'
    const src = `## Export your data\n\n${para}\n`
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('prose-sequence')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Export your data')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(para)
  })

  it('counts the "after that" phrase as a single marker', () => {
    const para =
      'First you unplug the router. After that you wait thirty seconds. Next you plug it back in and watch the lights.'
    const src = `## Restart your router\n\n${para}\n`
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      para
    )
  })

  it('stays quiet when the section already uses a numbered list (near-miss)', () => {
    const src = [
      '## Export your data',
      '',
      'First, open the settings page. Then choose the date range. Finally, click Export.',
      '',
      '1. Open the settings page.',
      '2. Choose the date range.',
      '3. Click Export.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('stays quiet with only two ordering words (near-miss)', () => {
    const src =
      '## Export your data\n\nFirst, open the settings page. Then choose the date range you need and click Export.\n'
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not pool markers across separate paragraphs (near-miss)', () => {
    const src = [
      '## Export your data',
      '',
      'First, open the settings page. Then pick the export tab.',
      '',
      'Finally, click Export and wait for the email link.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
