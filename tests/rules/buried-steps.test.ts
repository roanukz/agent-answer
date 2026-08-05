import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/buried-steps'

describe('buried-steps', () => {
  it('flags a numbered list buried under three sentences of prose', () => {
    const para =
      'Single sign-on lets your team log in through your identity provider. The integration supports both SAML and OIDC connections. You must be on the Business plan before configuring it.'
    const src = [
      '## Configure SSO',
      '',
      para,
      '',
      '1. Open the Admin console.',
      '2. Select Authentication.',
      '3. Upload your identity provider metadata.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('buried-steps')
    expect(f.checkId).toBe('answer-first')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Configure SSO')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(para)
  })

  it('spans from the first paragraph to the last block before a bulleted list', () => {
    const src = [
      '## Export your data',
      '',
      'Workspace exports bundle every project into a single archive. The archive includes attachments and comment history.',
      '',
      'Exports are available to workspace owners only.',
      '',
      '- Open Settings.',
      '- Select Export workspace.',
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      'Workspace exports bundle every project into a single archive. The archive includes attachments and comment history.\n\nExports are available to workspace owners only.'
    )
  })

  it('allows up to two lead-in sentences before the steps', () => {
    const src = [
      '## Configure SSO',
      '',
      'Single sign-on requires the Business plan. Follow these steps in the Admin console.',
      '',
      '1. Open the Admin console.',
      '2. Select Authentication.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('ignores long prose in sections that contain no list', () => {
    const src = [
      '## About exports',
      '',
      'Exports bundle every project. They include attachments. They also include comment history. Owners can schedule them weekly.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not count blockquote sentences toward the burial threshold', () => {
    const src = [
      '## Import CSV files',
      '',
      '> Imports overwrite matching rows. Back up your data first. This cannot be undone.',
      '',
      'Uploads accept files up to 50 MB.',
      '',
      '1. Open the Import tab.',
      '2. Drop your CSV file onto the upload area.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('ignores sections whose list comes first', () => {
    const src = [
      '## Rotate a token',
      '',
      '1. Open Settings.',
      '2. Select Reset token.',
      '',
      'Rotation invalidates the old key immediately. Any script using it will fail. Update your integrations right away.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})

describe('buried-steps: steps below an opening summary list', () => {
  it('still fires when a short list precedes the prose that buries the real steps', () => {
    const doc = parse(
      [
        '## Reset a token',
        '',
        '- quick summary item one',
        '- quick summary item two',
        '',
        'First sentence of context. Second sentence of context. Third sentence of context. Fourth sentence of context.',
        '',
        '1. Open the portal.',
        '2. Select Reset token.'
      ].join('\n')
    )
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(findings[0]!.ruleId).toBe('buried-steps')
  })
})
