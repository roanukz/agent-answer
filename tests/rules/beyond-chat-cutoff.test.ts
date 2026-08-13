import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import { snippetize } from '../../src/engine/snippets'
import rule from '../../src/engine/rules/beyond-chat-cutoff'

// 174 characters.
const PARA =
  'When the sync agent starts, it reads the local manifest, compares every entry against the server copy, and queues any files that differ for upload during the next idle window.'

/** One paragraph block of n sentences, so it stays a single block. */
const oneParagraph = (n: number) =>
  Array.from({ length: n }, () => PARA).join(' ')

const run = (src: string) => {
  const doc = parse(src)
  return rule.run(doc, { snippets: snippetize(doc) })
}

describe('beyond-chat-cutoff', () => {
  it('flags an opening paragraph longer than the 500 characters shown in chat', () => {
    const findings = run(
      `## Reset\n\n${oneParagraph(4)}\n\n## Re-sync\n\nShort.\n`
    )
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('beyond-chat-cutoff')
    expect(f.checkId).toBe('answer-first')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Reset')
    expect(f.message).toContain('500 characters')
    expect(f.message).toContain('Moveworks')
  })

  it('flags steps that start past the cutoff, anchored on the list', () => {
    const src = `## Reset\n\n${oneParagraph(4)}\n\n1. Open the identity portal.\n2. Select Reset token.\n\n## Re-sync\n\nShort.\n`
    const doc = parse(src)
    const findings = rule.run(doc, { snippets: snippetize(doc) })
    // The opening paragraph fires first; only one finding per piece.
    expect(findings).toHaveLength(1)

    // With a short opener, the list itself is what sits past the cutoff.
    const src2 = `## Reset\n\nOpen the portal.\n\n${oneParagraph(3)}\n\n1. Open the identity portal.\n2. Select Reset token.\n\n## Re-sync\n\nShort.\n`
    const doc2 = parse(src2)
    const f = rule.run(doc2, { snippets: snippetize(doc2) })[0]!
    expect(f.message).toContain('list in this piece starts')
    expect(doc2.source.slice(f.span.start, f.span.end)).toContain(
      '1. Open the identity portal.'
    )
  })

  it('near-miss: a long piece whose opener is short and whose steps come early', () => {
    const src = `## Reset\n\nOpen the portal and reset the token.\n\n1. Open the identity portal.\n2. Select Reset token.\n\n${oneParagraph(4)}\n\n## Re-sync\n\nShort.\n`
    expect(run(src)).toEqual([])
  })

  it('near-miss: a piece under 500 characters is never flagged', () => {
    expect(run(`## Reset\n\n${PARA}\n\n## Re-sync\n\nShort.\n`)).toEqual([])
  })

  it('measures the opening paragraph itself, not the heading above it', () => {
    // 505 characters of body fires; 495 does not, and a long boundary
    // heading changes neither, because the title does not count.
    const heading = '## Reset the VPN token from the identity portal today'
    const over = run(`${heading}\n\n${'x'.repeat(505)}\n\n## Re-sync\n\nShort.\n`)
    expect(over).toHaveLength(1)
    expect(over[0]!.message).toContain('505 characters')

    const under = run(
      `${heading}\n\n${'x'.repeat(495)}\n\n${PARA}\n\n## Re-sync\n\nShort.\n`
    )
    expect(under).toEqual([])
  })
})
