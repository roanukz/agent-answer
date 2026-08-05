import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/no-headings'

// Exactly 25 words per the engine's tokenizer. Long line ending in a
// period, so plain-text heading inference never fires on it.
const PARA =
  'The status dashboard refreshes every five minutes, so a device that just came online may briefly show as offline until the next polling cycle completes.'

function paras(n: number): string {
  return Array.from({ length: n }, () => PARA).join('\n\n')
}

describe('no-headings', () => {
  it('flags a 200+ word document with no headings as one doc-level finding', () => {
    const src = `${paras(9)}\n`
    const doc = parse(src)
    expect(doc.wordCount).toBe(225)
    expect(doc.headingCount).toBe(0)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('no-headings')
    expect(f.severity).toBe('major')
    expect(f.docLevel).toBe(true)
    expect(f.sectionHeading).toBeUndefined()
    expect(f.message).toContain('225')
    // Span is a representative anchor: the document's first block.
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(PARA)
  })

  it('near-miss: the same content under a real heading produces zero findings', () => {
    const doc = parse(`# Device status FAQ\n\n${paras(9)}\n`)
    expect(doc.wordCount).toBe(225)
    expect(rule.run(doc)).toEqual([])
  })

  it('near-miss: exactly 200 words without headings produces zero findings', () => {
    const doc = parse(`${paras(8)}\n`)
    expect(doc.wordCount).toBe(200)
    expect(doc.headingCount).toBe(0)
    expect(rule.run(doc)).toEqual([])
  })

  it('near-miss: inferred headings count as headings', () => {
    const src = `OVERVIEW\n\n${paras(9)}\n`
    const doc = parse(src)
    expect(doc.headingsInferred).toBe(true)
    expect(doc.headingCount).toBeGreaterThan(0)
    expect(rule.run(doc)).toEqual([])
  })

  it('uses the exact whyItMatters wording', () => {
    const findings = rule.run(parse(`${paras(9)}\n`))
    expect(findings[0]!.whyItMatters).toBe(
      'Without headings, the splitting is done by a token counter instead of by you.'
    )
  })
})
