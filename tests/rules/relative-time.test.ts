import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/relative-time'

describe('relative-time', () => {
  it('flags every time-relative phrase, one finding per match', () => {
    const src = [
      '# Exports',
      '',
      'Currently, exports are limited to 10,000 rows per run.',
      '',
      'We recently added CSV support, and the new version handles larger files. More formats are coming soon.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(4)
    for (const f of findings) {
      expect(f.ruleId).toBe('relative-time')
      expect(f.severity).toBe('info')
      expect(f.checkId).toBe('unresolved-references')
      expect(f.sectionHeading).toBe('Exports')
    }
    const texts = findings.map((f) => doc.source.slice(f.span.start, f.span.end))
    expect(texts).toEqual(['Currently', 'recently', 'the new version', 'soon'])
    // Sorted by position in the source.
    const starts = findings.map((f) => f.span.start)
    expect([...starts].sort((a, b) => a - b)).toEqual(starts)
  })

  it('flags phrases inside lists and matches "the latest release" and "as of now"', () => {
    const src = [
      '# Release notes',
      '',
      '- The latest release supports SSO',
      '- As of now, SCIM is beta-only',
      '- At the moment only admins can enable it'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    const texts = findings.map((f) => doc.source.slice(f.span.start, f.span.end))
    expect(texts).toEqual(['The latest release', 'As of now', 'At the moment'])
  })

  it('ignores code blocks entirely', () => {
    const src = [
      '# Status output',
      '',
      '```',
      'state: currently syncing',
      'next run: soon',
      '```'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not match inside longer words or near-miss phrasing', () => {
    const src = [
      '# Key rotation',
      '',
      'The sooner you rotate keys, the better; monsoon season has no effect on the schedule.',
      '',
      'Version 4.2 was released on June 3, 2026, and the newest build is 4.2.1.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
