import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/preamble-opener'

describe('preamble-opener', () => {
  it('flags a section whose first sentence announces the article', () => {
    const src = [
      '# Reset your API token',
      '',
      'In this article, we will walk through resetting your API token from the dashboard.',
      '',
      'Go to Settings and select Reset token.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('preamble-opener')
    expect(f.checkId).toBe('answer-first')
    expect(f.severity).toBe('major')
    expect(f.sectionHeading).toBe('Reset your API token')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      'In this article, we will walk through resetting your API token from the dashboard.'
    )
  })

  it('matches every preamble family, case-insensitive, anchored at start', () => {
    const openers = [
      'Before you begin, make sure you have owner permissions.',
      'Before you get started, install the desktop client.',
      'It’s important to note that tokens expire after 90 days.',
      'It is important to understand how billing cycles work.',
      'As you may know, invoices are generated on the first of the month.',
      'This guide covers exporting your workspace data.',
      'this document will explain how single sign-on is enforced.',
      'The purpose of this document is to describe our refund policy.'
    ]
    for (const opener of openers) {
      const src = `# Billing basics\n\n${opener} More detail follows below.\n`
      const doc = parse(src)
      const findings = rule.run(doc)
      expect(findings, opener).toHaveLength(1)
      const f = findings[0]!
      expect(doc.source.slice(f.span.start, f.span.end), opener).toBe(opener)
    }
  })

  it('flags the implicit introduction section and labels it', () => {
    const src =
      'As you might know, exports run nightly at midnight UTC.\n\n# Exports\n\nExports include attachments.\n'
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(findings[0]!.sectionHeading).toBe('(Introduction)')
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'As you might know, exports run nightly at midnight UTC.'
    )
  })

  it('reports multiple sections sorted by position', () => {
    const src = [
      '# Overview',
      '',
      'In this section, we introduce the audit log.',
      '',
      '# Retention',
      '',
      'The purpose of this section is to explain retention windows.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(2)
    expect(findings[0]!.span.start).toBeLessThan(findings[1]!.span.start)
    expect(findings[0]!.sectionHeading).toBe('Overview')
    expect(findings[1]!.sectionHeading).toBe('Retention')
  })

  it('ignores an answer-first section even when preamble appears later', () => {
    const src = [
      '# Reset your API token',
      '',
      'Go to Settings and select Reset token to invalidate the old key.',
      '',
      'In this article we also cover token rotation policies.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('ignores the phrase when it is not at the start of the sentence', () => {
    const src =
      '# Settings reference\n\nYou can find every option covered in this guide under Settings.\n'
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('ignores near-miss phrasing outside the pattern list', () => {
    const src =
      '# Token security\n\nIt is important to act quickly when a token leaks. Rotate it immediately.\n'
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('only ever inspects the first sentence of a section', () => {
    const src =
      '# Token expiry\n\nTokens expire after 90 days. In this section we explain rotation.\n'
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
