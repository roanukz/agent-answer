import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/strengths'

const TABLE = ['| Plan | Seats |', '| --- | --- |', '| Basic | 5 |', '| Premium | 20 |'].join(
  '\n'
)

describe('strengths', () => {
  it('credits question headings, task headings, the first numbered list, and the first table', () => {
    const src = [
      '# How do I reset my password?',
      '',
      'Use the reset link on the sign-in page.',
      '',
      '## Reset your API token',
      '',
      '1. Open Settings.',
      '2. Click Regenerate token.',
      '',
      '## Plan limits',
      '',
      TABLE,
      ''
    ].join('\n')
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(4)
    for (const f of findings) {
      expect(f.ruleId).toBe('strengths')
      expect(f.severity).toBe('info')
      expect(f.positive).toBe(true)
    }
    // Sorted by position: question heading, task heading, numbered list, table.
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      '# How do I reset my password?'
    )
    expect(findings[0]!.whyItMatters).toBe(
      'A heading phrased the way users ask is a strong retrieval match.'
    )
    expect(doc.source.slice(findings[1]!.span.start, findings[1]!.span.end)).toBe(
      '## Reset your API token'
    )
    expect(doc.source.slice(findings[2]!.span.start, findings[2]!.span.end)).toBe(
      '1. Open Settings.\n2. Click Regenerate token.'
    )
    expect(findings[2]!.whyItMatters).toBe(
      'Numbered steps can be quoted directly into an answer.'
    )
    expect(doc.source.slice(findings[3]!.span.start, findings[3]!.span.end)).toBe(
      TABLE
    )
    expect(findings[3]!.whyItMatters).toBe(
      'Tables give the agent rows and columns it can read reliably.'
    )
  })

  it('recognizes "Does" and "Can" question openers', () => {
    const src =
      '## Does SSO expire?\n\nYes, tokens expire.\n\n## Can I export data?\n\nYes, from Settings.\n'
    const findings = rule.run(parse(src))
    expect(findings).toHaveLength(2)
  })

  it('credits only the FIRST table when several exist', () => {
    const src = `## Plans\n\n${TABLE}\n\n## Regions\n\n| Region | Zone |\n| --- | --- |\n| EU | 2 |\n`
    const doc = parse(src)
    const tableFindings = rule
      .run(doc)
      .filter((f) => f.whyItMatters.startsWith('Tables give'))
    expect(tableFindings).toHaveLength(1)
    expect(
      doc.source.slice(tableFindings[0]!.span.start, tableFindings[0]!.span.end)
    ).toBe(TABLE)
  })

  it('finds nothing to praise in statement headings with plain prose (near-miss)', () => {
    const src = [
      '# Password policy',
      '',
      'Passwords expire every ninety days.',
      '',
      '## Session length',
      '',
      'Sessions last twelve hours.',
      ''
    ].join('\n')
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('does not treat "However we handle it" as a question heading (near-miss)', () => {
    // "however" starts with "how" but is not the word "how" + space.
    const src = '## However we handle it\n\nBody text.\n'
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
