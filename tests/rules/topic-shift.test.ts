import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/topic-shift'

describe('topic-shift', () => {
  it('flags a section with two marker paragraphs, anchored on the second marker', () => {
    const src = [
      '# Export your data',
      '',
      'Open the Reports page and choose Export to download your data as a PDF.',
      '',
      'Additionally, you can export the raw event log from the Admin console.',
      '',
      'Another option is to schedule a weekly export that lands in your inbox.',
      ''
    ].join('\n')
    const doc = parse(src)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('topic-shift')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Export your data')
    expect(f.message).toContain('2')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe('Another')
  })

  it('spans the full multi-word marker phrase', () => {
    const src = [
      '# Billing contacts',
      '',
      'Invoices go to the billing contact listed on the Subscription page.',
      '',
      'On a related note, receipts are also emailed to the account owner.',
      '',
      'You can also add a second billing contact from the same page.',
      ''
    ].join('\n')
    const doc = parse(src)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'You can also'
    )
  })

  it('near-miss: a single marker paragraph produces zero findings', () => {
    const src = [
      '# Export your data',
      '',
      'Open the Reports page and choose Export to download your data.',
      '',
      'Additionally, you can export the raw event log from the Admin console.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toEqual([])
  })

  it('near-miss: markers mid-paragraph or inside list items do not count', () => {
    const src = [
      '# Alerts',
      '',
      'You will get an email when a check fails. Additionally, a Slack ping fires.',
      '',
      '- Another channel is webhooks',
      '- Alternatively, use the API',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toEqual([])
  })

  it('near-miss: words that merely start like a marker do not match', () => {
    const src = [
      '# Cable setup',
      '',
      'Separate the power cable from the data cable before you start.',
      '',
      'Separate billing questions should go to the finance team.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toEqual([])
  })

  it('counts three shifts in the message and flags per section', () => {
    const src = [
      '# Integrations',
      '',
      'Connect Slack from the Integrations tab to receive alerts.',
      '',
      'Additionally, the Teams integration mirrors the same alerts.',
      '',
      'Separately, the API exposes every alert as a webhook payload.',
      '',
      'Alternatively, poll the events endpoint every minute.',
      '',
      '# Support',
      '',
      'Email support with your workspace ID for the fastest response.',
      ''
    ].join('\n')
    const doc = parse(src)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(findings[0]!.message).toContain('3')
    expect(findings[0]!.sectionHeading).toBe('Integrations')
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'Separately'
    )
  })

  it('flags two offending sections separately, sorted by position', () => {
    const src = [
      '# Exports',
      '',
      'Additionally, exports can run on a schedule.',
      '',
      'Another format we support is CSV.',
      '',
      '# Imports',
      '',
      'You can also import data from a spreadsheet.',
      '',
      'A different importer handles JSON payloads.',
      ''
    ].join('\n')
    const doc = parse(src)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(2)
    expect(findings[0]!.sectionHeading).toBe('Exports')
    expect(findings[1]!.sectionHeading).toBe('Imports')
    expect(findings[0]!.span.start).toBeLessThan(findings[1]!.span.start)
    expect(doc.source.slice(findings[1]!.span.start, findings[1]!.span.end)).toBe(
      'A different'
    )
  })

  it('uses the exact whyItMatters wording', () => {
    const src =
      '# Exports\n\nAdditionally, exports can run nightly.\n\nAnother format is CSV.\n'
    const findings = rule.run(parse(src))
    expect(findings[0]!.whyItMatters).toBe(
      "Each extra idea dilutes the section's match to any one question."
    )
  })
})
