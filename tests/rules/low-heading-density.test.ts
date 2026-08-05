import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/low-heading-density'

// 24 words per sentence.
const SENT =
  'The billing exporter collects every invoice line item from the previous month and writes the totals to the shared finance workspace for later review.'

function filler(sentences: number): string {
  return Array.from({ length: sentences }, () => SENT).join(' ')
}

describe('low-heading-density', () => {
  it('flags a long article whose single heading covers everything', () => {
    const src = `# Billing overview\n\n${filler(9)}\n\n${filler(8)}\n`
    const doc = parse(src)
    expect(doc.wordCount).toBe(408)
    expect(doc.headingCount).toBe(1)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('low-heading-density')
    expect(f.severity).toBe('minor')
    expect(f.docLevel).toBe(true)
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      '# Billing overview'
    )
  })

  it('flags a long article with no headings, anchored on the first block', () => {
    const para1 = filler(9)
    const para2 = filler(8)
    const src = `${para1}\n\n${para2}\n`
    const doc = parse(src)
    expect(doc.headingCount).toBe(0)
    expect(doc.wordCount).toBeGreaterThan(400)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.docLevel).toBe(true)
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(para1)
  })

  it('stays quiet when headings are dense enough (near-miss)', () => {
    const src = `# Billing overview\n\n${filler(9)}\n\n## Export schedule\n\n${filler(8)}\n`
    const doc = parse(src)
    expect(doc.wordCount).toBe(408)
    expect(doc.headingCount).toBe(2) // 204 words per heading
    expect(rule.run(doc)).toHaveLength(0)
  })

  it('stays quiet on short articles even with zero headings (near-miss)', () => {
    const doc = parse(`${filler(4)}\n`)
    expect(doc.headingCount).toBe(0)
    expect(doc.wordCount).toBeLessThanOrEqual(400)
    expect(rule.run(doc)).toHaveLength(0)
  })
})
