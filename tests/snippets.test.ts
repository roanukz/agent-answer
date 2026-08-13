import { describe, expect, it } from 'vitest'
import { parse } from '../src/engine/parse'
import { snippetize } from '../src/engine/snippets'

const map = (src: string) => snippetize(parse(src))

const body = 'Reset the token from the identity portal, then reconnect.'

describe('snippetize — the ordinary path', () => {
  it('one H1 and three H2s cuts on H2, because H1 has only one instance', () => {
    const src = `# Token guide\n\n${body}\n\n## Reset\n\n${body}\n\n## Re-sync\n\n${body}\n\n## Escalate\n\n${body}\n`
    const m = map(src)
    expect(m.reason).toBe('headers')
    expect(m.level).toBe(2)
    // The H1 section becomes the lead-in piece, then one piece per H2.
    expect(m.snippets.map((s) => s.heading)).toEqual([
      null,
      'Reset',
      'Re-sync',
      'Escalate'
    ])
  })

  it('adding a second H1 moves every boundary in the document', () => {
    const before = `# Token guide\n\n${body}\n\n## Reset\n\n${body}\n\n## Re-sync\n\n${body}\n\n## Escalate\n\n${body}\n`
    const after = `# Token guide\n\n${body}\n\n## Reset\n\n${body}\n\n# Contractors\n\n${body}\n\n## Re-sync\n\n${body}\n\n## Escalate\n\n${body}\n`
    expect(map(before).level).toBe(2)

    const m = map(after)
    expect(m.level).toBe(1)
    expect(m.snippets.map((s) => s.heading)).toEqual([
      'Token guide',
      'Contractors'
    ])
    // The H2s no longer cut anything: they now travel inside a piece.
    expect(m.snippets[0]!.sections.map((s) => s.heading)).toEqual([
      'Token guide',
      'Reset'
    ])
  })

  it('flags the article whose boundaries are one heading away from moving', () => {
    const fragile = `# Token guide\n\n${body}\n\n## Reset\n\n${body}\n\n## Re-sync\n\n${body}\n`
    expect(map(fragile).oneH1AwayFromMoving).toBe(true)

    const stable = `# Token guide\n\n${body}\n\n# Contractors\n\n${body}\n`
    expect(map(stable).oneH1AwayFromMoving).toBe(false)
  })

  it('prefers H1 when it has at least two instances', () => {
    const src = `# Employees\n\n${body}\n\n## Reset\n\n${body}\n\n# Contractors\n\n${body}\n\n## Reset\n\n${body}\n`
    const m = map(src)
    expect(m.level).toBe(1)
    expect(m.snippets).toHaveLength(2)
  })

  it('the search stops at H2, so an article of H3s is never cut', () => {
    const src = `### Reset\n\n${body}\n\n### Re-sync\n\n${body}\n\n### Escalate\n\n${body}\n`
    const m = map(src)
    expect(m.reason).toBe('none')
    expect(m.level).toBeNull()
    expect(m.snippets).toHaveLength(1)
  })

  it('near-miss: a level with exactly one instance does not qualify', () => {
    const src = `# Token guide\n\n${body}\n\n## Reset\n\n${body}\n`
    const m = map(src)
    expect(m.reason).toBe('none')
    expect(m.snippets).toHaveLength(1)
  })

  it('an article with no headings is one piece', () => {
    const m = map(`${body} ${body} ${body}\n`)
    expect(m.reason).toBe('no-headings')
    expect(m.level).toBeNull()
    expect(m.snippets).toHaveLength(1)
  })
})

describe('snippetize — the FAQ exception', () => {
  const q = (n: number) =>
    Array.from(
      { length: n },
      (_, i) => `## How do I reset token ${i + 1}?\n\n${body}\n`
    ).join('\n')

  it('cuts on a level with more than 4 instances that are mostly questions', () => {
    // H1 appears twice, so the ordinary path would cut on H1. The FAQ
    // exception is checked first and takes the H2s instead.
    const src = `# Employees\n\n${body}\n\n${q(5)}\n# Contractors\n\n${body}\n`
    const m = map(src)
    expect(m.reason).toBe('faq')
    expect(m.level).toBe(2)
    // The lead-in piece, then one per question. The trailing H1 is not a
    // boundary at this level, so it travels inside the last question.
    expect(m.snippets).toHaveLength(6)
    expect(m.snippets[5]!.sections.map((s) => s.heading)).toEqual([
      'How do I reset token 5?',
      'Contractors'
    ])
  })

  it('near-miss: exactly 4 question headings is not more than 4', () => {
    const src = `# Employees\n\n${body}\n\n${q(4)}\n# Contractors\n\n${body}\n`
    const m = map(src)
    expect(m.reason).toBe('headers')
    expect(m.level).toBe(1)
  })

  it('near-miss: five headings, only two ending in a question mark', () => {
    const src = `# Employees\n\n${body}\n\n## Why?\n\n${body}\n\n## When?\n\n${body}\n\n## Reset\n\n${body}\n\n## Re-sync\n\n${body}\n\n## Escalate\n\n${body}\n\n# Contractors\n\n${body}\n`
    const m = map(src)
    expect(m.reason).toBe('headers')
    expect(m.level).toBe(1)
  })
})

describe('snippet measurements', () => {
  it('the boundary heading is excluded from the character count', () => {
    // Moveworks: "The title of the article does not count towards the
    // maximum number of characters."
    const src = `## Reset\n\n${body}\n\n## Re-sync\n\n${body}\n`
    const m = map(src)
    expect(m.level).toBe(2)
    const first = m.snippets[0]!
    expect(first.heading).toBe('Reset')
    expect(first.bodyChars).toBe(body.length)
    // The token estimate covers the delivered piece, heading included.
    expect(first.tokenEstimate).toBeGreaterThan(first.bodyChars / 4)
  })

  it('an unsplit article counts its heading, because nothing made it a title', () => {
    const src = `## Reset\n\n${body}\n`
    const m = map(src)
    expect(m.level).toBeNull()
    expect(m.snippets[0]!.bodyChars).toBe('## Reset '.length + body.length)
  })

  it('content before the first boundary becomes its own piece', () => {
    const src = `Intro line.\n\n## Reset\n\n${body}\n\n## Re-sync\n\n${body}\n`
    const m = map(src)
    expect(m.snippets[0]!.heading).toBeNull()
    expect(m.snippets[0]!.text).toContain('Intro line.')
  })

  it('is deterministic', () => {
    const src = `# A\n\n${body}\n\n## B\n\n${body}\n\n## C\n\n${body}\n`
    expect(JSON.stringify(map(src).snippets.map((s) => s.bodyChars))).toBe(
      JSON.stringify(map(src).snippets.map((s) => s.bodyChars))
    )
  })
})
