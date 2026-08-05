import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/wall-of-text'

// 24 words per sentence.
const SENT =
  'The billing exporter collects every invoice line item from the previous month and writes the totals to the shared finance workspace for later review.'

function para(sentences: number): string {
  return Array.from({ length: sentences }, () => SENT).join(' ')
}

describe('wall-of-text', () => {
  it('flags a paragraph over 120 words', () => {
    const long = para(6) // 144 words
    const src = `## Monthly billing export\n\nShort intro paragraph.\n\n${long}\n`
    const doc = parse(src)
    const block = doc.sections[0]!.blocks[1]!
    expect(block.wordCount).toBe(144)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('wall-of-text')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Monthly billing export')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(long)
  })

  it('flags each oversized paragraph separately, in source order', () => {
    const first = para(6)
    const second = para(7)
    const src = `## Exports\n\n${first}\n\n${second}\n`
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(2)
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      first
    )
    expect(doc.source.slice(findings[1]!.span.start, findings[1]!.span.end)).toBe(
      second
    )
  })

  it('leaves a paragraph of exactly 120 words alone (near-miss)', () => {
    const src = `## Exports\n\n${para(5)}\n`
    const doc = parse(src)
    expect(doc.sections[0]!.blocks[0]!.wordCount).toBe(120)
    expect(rule.run(doc)).toHaveLength(0)
  })

  it('ignores long non-paragraph blocks like lists (near-miss)', () => {
    const items = Array.from({ length: 8 }, () => `- ${SENT}`).join('\n')
    const doc = parse(`## Exports\n\n${items}\n`)
    expect(doc.sections[0]!.blocks[0]!.type).toBe('bulleted-list')
    expect(doc.sections[0]!.blocks[0]!.wordCount).toBeGreaterThan(120)
    expect(rule.run(doc)).toHaveLength(0)
  })
})
