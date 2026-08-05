import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/cross-section-pointer'

describe('cross-section-pointer', () => {
  it('flags positional pointers in paragraphs and list items', () => {
    const src = [
      '# Billing FAQ',
      '',
      'As mentioned above, invoices are issued on the first of the month.',
      '',
      '## Refunds',
      '',
      '- For eligibility rules, see below.',
      '- Refunds post within 5 business days.',
      '',
      'Refer to the section on disputes if a charge looks wrong.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(3)
    expect(findings.every((f) => f.ruleId === 'cross-section-pointer')).toBe(true)
    expect(findings.every((f) => f.severity === 'major')).toBe(true)
    expect(
      findings.map((f) => doc.source.slice(f.span.start, f.span.end))
    ).toEqual(['As mentioned above', 'see below', 'Refer to the section'])
    // Sorted by position, with the right section labels.
    expect(findings[0]!.sectionHeading).toBe('Billing FAQ')
    expect(findings[1]!.sectionHeading).toBe('Refunds')
    expect(findings[2]!.sectionHeading).toBe('Refunds')
  })

  it('flags "in the previous step" case-insensitively', () => {
    const src = [
      '## Step 4: Verify the domain',
      '',
      'Paste the TXT record you copied IN THE PREVIOUS STEP into your DNS provider.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'IN THE PREVIOUS STEP'
    )
  })

  it('matches a phrase wrapped across a soft line break', () => {
    const src = [
      '## Exporting data',
      '',
      'Exports include every field as described',
      'earlier, plus the audit columns.'
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'as described\nearlier'
    )
  })

  it('ignores pointers inside fenced code blocks', () => {
    const src = [
      '## Webhook payloads',
      '',
      '```',
      '# see above for the schema, as mentioned earlier',
      '{ "event": "invoice.paid" }',
      '```',
      '',
      'The payload arrives as JSON.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not flag references that name their target', () => {
    const src = [
      '## Proxy settings',
      '',
      'See the "Advanced options" section for proxy settings. Refer to the API documentation for header names.'
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('uses the exact required whyItMatters string', () => {
    const src = '## Limits\n\nRate limits are listed in the next section.'
    const findings = rule.run(parse(src))
    expect(findings).toHaveLength(1)
    expect(findings[0]!.whyItMatters).toBe(
      "The agent sees one section at a time, so 'above' doesn't exist for it."
    )
  })
})
