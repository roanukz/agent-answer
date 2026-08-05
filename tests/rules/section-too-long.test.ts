import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/section-too-long'

// Exactly 30 words per the engine's tokenizer.
const PARA =
  'When the sync agent starts, it reads the local manifest, compares every entry against the server copy, and queues any files that differ for upload during the next idle window.'

function paras(n: number): string {
  return Array.from({ length: n }, () => PARA).join('\n\n')
}

describe('section-too-long', () => {
  it('flags a 301+ word section as minor, anchored on the heading line', () => {
    const src = `# Sync details\n\n${paras(11)}\n`
    const doc = parse(src)
    expect(doc.sections[0]!.wordCount).toBe(330)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('section-too-long')
    expect(f.severity).toBe('minor')
    expect(f.message).toContain('330')
    expect(f.sectionHeading).toBe('Sync details')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe('# Sync details')
  })

  it('flags a 501+ word section as major — still only ONE finding', () => {
    const src = `# Sync details\n\n${paras(17)}\n`
    const doc = parse(src)
    expect(doc.sections[0]!.wordCount).toBe(510)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(findings[0]!.severity).toBe('major')
    expect(findings[0]!.message).toContain('510')
    expect(doc.source.slice(findings[0]!.span.start, findings[0]!.span.end)).toBe(
      '# Sync details'
    )
  })

  it('anchors on the first block when the long section has no heading', () => {
    // All lines are long sentences ending in periods, so no heading is
    // inferred and the whole document is one implicit section.
    const src = `${paras(11)}\n`
    const doc = parse(src)
    expect(doc.headingCount).toBe(0)
    expect(doc.sections[0]!.wordCount).toBe(330)

    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('(Introduction)')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(PARA)
  })

  it('near-miss: a section of exactly 300 words produces zero findings', () => {
    const doc = parse(`# Sync details\n\n${paras(10)}\n`)
    expect(doc.sections[0]!.wordCount).toBe(300)
    expect(rule.run(doc)).toEqual([])
  })

  it('near-miss: code blocks do not count toward the section length', () => {
    const code =
      '```\n' + Array.from({ length: 20 }, () => PARA).join('\n') + '\n```\n'
    const doc = parse(`# Sync details\n\n${paras(9)}\n\n${code}`)
    expect(doc.sections[0]!.wordCount).toBe(270)
    expect(rule.run(doc)).toEqual([])
  })

  it('flags each long section independently, sorted by position', () => {
    const src = `# First topic\n\n${paras(11)}\n\n# Second topic\n\n${paras(17)}\n`
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(2)
    expect(findings[0]!.severity).toBe('minor')
    expect(findings[0]!.sectionHeading).toBe('First topic')
    expect(findings[1]!.severity).toBe('major')
    expect(findings[1]!.sectionHeading).toBe('Second topic')
    expect(findings[0]!.span.start).toBeLessThan(findings[1]!.span.start)
  })

  it('uses the exact whyItMatters wording', () => {
    const doc = parse(`# Sync details\n\n${paras(11)}\n`)
    expect(rule.run(doc)[0]!.whyItMatters).toBe(
      'Long sections get split wherever the software decides, mid-sentence and mid-idea, instead of where you would split them.'
    )
  })
})
