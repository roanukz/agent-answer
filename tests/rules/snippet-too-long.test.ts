import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import { snippetize } from '../../src/engine/snippets'
import { estimateTokens } from '../../src/engine/size'
import rule from '../../src/engine/rules/snippet-too-long'

// 30 words, 174 characters.
const PARA =
  'When the sync agent starts, it reads the local manifest, compares every entry against the server copy, and queues any files that differ for upload during the next idle window.'

const paras = (n: number) =>
  Array.from({ length: n }, () => PARA).join('\n\n')

describe('snippet-too-long', () => {
  it('flags a piece over the 512-token maximum, naming the limit as Moveworks’', () => {
    const src = `## Sync\n\n${paras(13)}\n\n## Reset\n\nShort.\n`
    const doc = parse(src)
    const map = snippetize(doc)
    expect(map.level).toBe(2)
    expect(map.snippets[0]!.tokenEstimate).toBeGreaterThan(512)

    const findings = rule.run(doc, { snippets: map })
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('snippet-too-long')
    expect(f.checkId).toBe('one-idea')
    expect(f.severity).toBe('major')
    expect(f.sectionHeading).toBe('Sync')
    expect(f.message).toContain('512-token maximum Moveworks publishes')
    expect(f.message).toContain('256')
    // Anchored on the heading that opens the piece.
    expect(doc.source.slice(f.span.start, f.span.end)).toBe('## Sync')
  })

  it('near-miss: a piece just under the maximum is not flagged', () => {
    const src = `## Sync\n\n${paras(11)}\n\n## Reset\n\nShort.\n`
    const doc = parse(src)
    const map = snippetize(doc)
    expect(map.snippets[0]!.tokenEstimate).toBeLessThanOrEqual(512)
    expect(rule.run(doc, { snippets: map })).toEqual([])
  })

  it('scores the delivered piece, not the section: three tidy sections can still be one oversized piece', () => {
    // Only H3s, so nothing qualifies as a cut level and the whole article
    // arrives as one piece — even though every section is a sane size.
    const src = `### One\n\n${paras(5)}\n\n### Two\n\n${paras(5)}\n\n### Three\n\n${paras(5)}\n`
    const doc = parse(src)
    const map = snippetize(doc)
    expect(map.level).toBeNull()
    expect(doc.sections.every((s) => s.wordCount < 200)).toBe(true)

    const findings = rule.run(doc, { snippets: map })
    expect(findings).toHaveLength(1)
  })

  it('the token count is an estimate at four characters per token', () => {
    expect(estimateTokens('a'.repeat(2048))).toBe(512)
    expect(estimateTokens('a'.repeat(2049))).toBe(513)
    // Whitespace runs collapse, so indentation does not inflate the count.
    expect(estimateTokens('one    two')).toBe(estimateTokens('one two'))
  })

  it('recomputes the map when run without a context, giving the same findings', () => {
    const doc = parse(`## Sync\n\n${paras(13)}\n\n## Reset\n\nShort.\n`)
    expect(rule.run(doc)).toEqual(rule.run(doc, { snippets: snippetize(doc) }))
  })
})
