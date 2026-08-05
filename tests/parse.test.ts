import { describe, expect, it } from 'vitest'
import { parse, splitSentences } from '../src/engine/parse'

describe('parse: ATX headings', () => {
  it('splits sections at each heading', () => {
    const doc = parse(
      '# Title\n\nIntro para.\n\n## First\n\nAlpha.\n\n## Second\n\nBeta.\n'
    )
    expect(doc.sections.map((s) => s.heading)).toEqual([
      'Title',
      'First',
      'Second'
    ])
    expect(doc.sections.map((s) => s.level)).toEqual([1, 2, 2])
    expect(doc.headingsInferred).toBe(false)
    expect(doc.hasHeadings).toBe(true)
    expect(doc.headingCount).toBe(3)
  })

  it('records heading spans that slice back to the heading line', () => {
    const src = 'Some intro.\n\n## Reset your token\n\nBody.\n'
    const doc = parse(src)
    const sec = doc.sections.find((s) => s.heading === 'Reset your token')!
    expect(src.slice(sec.headingSpan!.start, sec.headingSpan!.end)).toBe(
      '## Reset your token'
    )
  })
})

describe('parse: setext headings', () => {
  it('detects === as level 1 and --- as level 2', () => {
    const doc = parse('Main Title\n====\n\nBody one.\n\nSub Part\n----\n\nBody two.\n')
    expect(doc.sections.map((s) => [s.heading, s.level])).toEqual([
      ['Main Title', 1],
      ['Sub Part', 2]
    ])
  })

  it('does not treat a table separator row as a setext underline', () => {
    const doc = parse('| a | b |\n|---|---|\n| 1 | 2 |\n')
    expect(doc.headingCount).toBe(0)
    expect(doc.sections[0]!.blocks[0]!.type).toBe('table')
  })
})

describe('parse: implicit intro section', () => {
  it('puts content before the first heading in an implicit section', () => {
    const doc = parse('Loose intro text here.\n\n# Real Heading\n\nBody.\n')
    expect(doc.sections[0]!.implicit).toBe(true)
    expect(doc.sections[0]!.heading).toBeNull()
    expect(doc.sections[1]!.heading).toBe('Real Heading')
  })

  it('treats a document with no headings as one single section', () => {
    const doc = parse('just one paragraph of lowercase text that goes on.\n')
    expect(doc.sections).toHaveLength(1)
    expect(doc.sections[0]!.implicit).toBe(true)
    expect(doc.hasHeadings).toBe(false)
  })
})

describe('parse: plain-text heading inference', () => {
  it('infers Title Case standalone short lines as headings', () => {
    const src =
      'Resetting Your Token\n\nFirst body paragraph sits here.\n\nContact Support\n\nSecond body paragraph.\n'
    const doc = parse(src)
    expect(doc.headingsInferred).toBe(true)
    expect(doc.sections.map((s) => s.heading)).toEqual([
      'Resetting Your Token',
      'Contact Support'
    ])
  })

  it('infers ALL CAPS and colon-terminated lines', () => {
    const src = 'OVERVIEW\n\nBody text one.\n\nNext steps:\n\nBody text two.\n'
    const doc = parse(src)
    expect(doc.headingsInferred).toBe(true)
    expect(doc.sections.map((s) => s.heading)).toEqual([
      'OVERVIEW',
      'Next steps'
    ])
  })

  it('infers numbered-section style lines', () => {
    const src = '1. Install The Agent\n\nBody one.\n\n2. Configure It\n\nBody two.\n'
    const doc = parse(src)
    expect(doc.headingsInferred).toBe(true)
    expect(doc.headingCount).toBe(2)
  })

  it('does not infer lines that end with sentence punctuation or run long', () => {
    const src =
      'This line ends with a period.\n\nbody follows here with more words.\n'
    const doc = parse(src)
    expect(doc.headingsInferred).toBe(false)
    expect(doc.headingCount).toBe(0)
  })

  it('does not run inference when real markdown headings exist', () => {
    const src = '# Real\n\nShort Standalone Line\n\nMore body.\n'
    const doc = parse(src)
    expect(doc.headingsInferred).toBe(false)
    expect(doc.headingCount).toBe(1)
  })
})

describe('parse: block classification', () => {
  const src = [
    '# H',
    '',
    'A paragraph.',
    '',
    '- one',
    '- two',
    '',
    '1. step one',
    '2. step two',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '```',
    'code here. This is not prose.',
    '',
    'still code',
    '```',
    '',
    '> quoted line'
  ].join('\n')

  it('classifies paragraph, lists, table, code, blockquote', () => {
    const doc = parse(src)
    const types = doc.sections[0]!.blocks.map((b) => b.type)
    expect(types).toEqual([
      'paragraph',
      'bulleted-list',
      'numbered-list',
      'table',
      'code',
      'blockquote'
    ])
  })

  it('keeps blank lines inside fenced code in one block', () => {
    const doc = parse(src)
    const code = doc.sections[0]!.blocks.find((b) => b.type === 'code')!
    expect(code.text).toContain('still code')
  })

  it('gives code blocks zero word count and no sentences', () => {
    const doc = parse(src)
    const code = doc.sections[0]!.blocks.find((b) => b.type === 'code')!
    expect(code.wordCount).toBe(0)
    expect(code.sentences).toEqual([])
  })

  it('section word count excludes code', () => {
    const doc = parse('# H\n\ntwo words\n\n```\nmany many many code words\n```\n')
    expect(doc.sections[0]!.wordCount).toBe(2)
  })
})

describe('parse: offsets are exact', () => {
  it('block spans slice back to block text', () => {
    const src = '# H\n\nFirst para here.\n\n- item one\n- item two\n'
    const doc = parse(src)
    for (const block of doc.sections[0]!.blocks) {
      expect(src.slice(block.span.start, block.span.end)).toBe(block.text)
    }
  })

  it('sentence spans slice back to sentence text', () => {
    const src = '# H\n\nFirst sentence. Second sentence! Third?\n'
    const doc = parse(src)
    const para = doc.sections[0]!.blocks[0]!
    expect(para.sentences.length).toBeGreaterThanOrEqual(3)
    for (const s of para.sentences) {
      expect(src.slice(s.span.start, s.span.end)).toBe(s.text)
    }
  })

  it('handles CRLF sources without span drift', () => {
    const src = '# H\r\n\r\nA para.\r\n\r\nSecond para.\r\n'
    const doc = parse(src)
    for (const block of doc.sections[0]!.blocks) {
      expect(src.slice(block.span.start, block.span.end)).toBe(block.text)
    }
  })
})

describe('splitSentences', () => {
  it('splits on sentence boundaries with exact spans', () => {
    const text = 'One two. Three four? Five!'
    const nodes = splitSentences(text, 100)
    expect(nodes.map((n) => n.text)).toEqual([
      'One two.',
      'Three four?',
      'Five!'
    ])
    expect(nodes[0]!.span).toEqual({ start: 100, end: 108 })
  })

  it('returns a single sentence when there is no terminator', () => {
    const nodes = splitSentences('no terminator here', 0)
    expect(nodes).toHaveLength(1)
  })
})

describe('parse: YAML frontmatter and setext guards', () => {
  it('does not turn frontmatter into headings or prose', () => {
    const doc = parse(
      '---\ntitle: My Doc\nauthor: someone\n---\n\n# Real Heading\n\nBody here.\n'
    )
    expect(doc.sections.map((s) => s.heading)).toEqual(['Real Heading'])
    const types = doc.sections.flatMap((s) => s.blocks.map((b) => b.type))
    expect(types).not.toContain('paragraph-frontmatter')
    expect(doc.wordCount).toBe(2) // only "Body here."
  })

  it('does not treat stacked --- lines as a heading titled ---', () => {
    const doc = parse('Para one.\n\n---\n---\n\nPara two.\n')
    expect(doc.sections.every((s) => s.heading !== '---')).toBe(true)
  })
})
