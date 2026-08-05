/**
 * Markdown / plain text → DocModel.
 *
 * Section boundaries: every heading starts a new section and a section runs
 * to the next heading of any level. Sections are the retrieval units the
 * tool reasons about, so they must not overlap — a parent heading's own
 * content is what sits between it and its first subheading.
 */

import type {
  Block,
  BlockType,
  DocModel,
  Section,
  SentenceNode,
  Span
} from './types.js'
import { countWords } from './textUtils.js'

interface Line {
  text: string
  /** Offset of the first character of the line in the source. */
  start: number
  /** Offset just past the last character (excludes the newline and any \r). */
  end: number
  blank: boolean
  inFence: boolean
  /** True for the opening/closing ``` lines themselves. */
  isFenceMarker: boolean
  /** Metadata lines (YAML frontmatter) that never become content. */
  skip: boolean
}

interface HeadingMark {
  lineIdx: number
  /** Index of the last line the heading occupies (setext underline). */
  endLineIdx: number
  level: number
  text: string
  span: Span
  inferred: boolean
}

const ATX_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const SETEXT_EQ_RE = /^\s{0,3}=+\s*$/
const SETEXT_DASH_RE = /^\s{0,3}-{2,}\s*$/
const FENCE_RE = /^\s{0,3}(```|~~~)/
const BULLET_RE = /^\s*[-*+]\s+\S/
const NUMBERED_RE = /^\s*\d+[.)]\s+\S/
const BLOCKQUOTE_RE = /^\s*>/
const NUMBERED_HEADING_RE = /^\d+[.)]\s+\S/

function splitLines(source: string): Line[] {
  const lines: Line[] = []
  let start = 0
  while (start <= source.length) {
    let nl = source.indexOf('\n', start)
    if (nl === -1) nl = source.length
    let end = nl
    if (end > start && source[end - 1] === '\r') end--
    const text = source.slice(start, end)
    lines.push({
      text,
      start,
      end,
      blank: text.trim() === '',
      inFence: false,
      isFenceMarker: false,
      skip: false
    })
    if (nl === source.length) break
    start = nl + 1
  }
  return lines
}

/**
 * YAML frontmatter (--- … --- at the very top, common in markdown exported
 * from CMS and static-site tools) is metadata, not prose. Treat it like a
 * fenced region so it never becomes headings or paragraphs.
 */
function markFrontmatter(lines: Line[]): void {
  if (lines.length === 0 || !/^---\s*$/.test(lines[0]!.text)) return
  for (let i = 1; i < Math.min(lines.length, 40); i++) {
    if (/^---\s*$/.test(lines[i]!.text)) {
      for (let k = 0; k <= i; k++) {
        lines[k]!.skip = true
        lines[k]!.inFence = true // keeps heading detection away too
      }
      return
    }
  }
}

function markFences(lines: Line[]): void {
  let open = false
  let marker = ''
  for (const line of lines) {
    if (line.isFenceMarker) continue // frontmatter delimiters stay as-is
    const m = FENCE_RE.exec(line.text)
    if (m && (!open || m[1] === marker)) {
      line.isFenceMarker = true
      line.inFence = true
      if (!open) {
        open = true
        marker = m[1]!
      } else {
        open = false
        marker = ''
      }
    } else {
      line.inFence = line.inFence || open
    }
  }
}

function detectMarkdownHeadings(lines: Line[]): HeadingMark[] {
  const headings: HeadingMark[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.inFence || line.blank) continue
    const atx = ATX_RE.exec(line.text)
    if (atx) {
      headings.push({
        lineIdx: i,
        endLineIdx: i,
        level: atx[1]!.length,
        text: atx[2]!.trim(),
        span: { start: line.start, end: line.end },
        inferred: false
      })
      continue
    }
    // Setext: a non-blank text line followed by === or --- underline.
    // The text line must not itself look like an underline or rule, or
    // '---' pairs (thematic breaks, frontmatter remnants) become headings.
    const next = lines[i + 1]
    if (
      next &&
      !next.inFence &&
      !next.blank &&
      !BULLET_RE.test(line.text) &&
      !NUMBERED_RE.test(line.text) &&
      !BLOCKQUOTE_RE.test(line.text) &&
      !SETEXT_EQ_RE.test(line.text) &&
      !SETEXT_DASH_RE.test(line.text) &&
      !line.text.includes('|') &&
      (SETEXT_EQ_RE.test(next.text) || SETEXT_DASH_RE.test(next.text))
    ) {
      headings.push({
        lineIdx: i,
        endLineIdx: i + 1,
        level: SETEXT_EQ_RE.test(next.text) ? 1 : 2,
        text: line.text.trim(),
        span: { start: line.start, end: line.end },
        inferred: false
      })
      i++ // skip the underline
    }
  }
  return headings
}

function isTitleCase(text: string): boolean {
  const ws = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w))
  if (ws.length === 0) return false
  const minor = new Set([
    'a', 'an', 'the', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'with',
    'at', 'by', 'as', 'but', 'nor', 'via'
  ])
  const first = ws[0]!
  if (!/^[A-Z0-9]/.test(first)) return false
  return ws.every((w) => /^[A-Z0-9("']/.test(w) || minor.has(w.toLowerCase()))
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, '')
  return letters.length >= 2 && letters === letters.toUpperCase()
}

/**
 * Plain-text heading heuristics, applied only when the document contains
 * no markdown headings: a short standalone line that looks like a title.
 */
function inferHeadings(lines: Line[]): HeadingMark[] {
  const headings: HeadingMark[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.inFence || line.blank) continue
    const text = line.text.trim()
    if (text.length === 0 || text.length >= 60) continue
    if (/[.!?]$/.test(text)) continue
    const prevBlank = i === 0 || lines[i - 1]!.blank
    const nextBlank = i === lines.length - 1 ? false : lines[i + 1]!.blank
    if (!prevBlank || !nextBlank) continue
    const qualifies =
      isTitleCase(text) ||
      isAllCaps(text) ||
      /:$/.test(text) ||
      NUMBERED_HEADING_RE.test(text)
    if (!qualifies) continue
    // A lone bullet or table fragment is content, not a title.
    if (BULLET_RE.test(text) || text.includes('|')) continue
    headings.push({
      lineIdx: i,
      endLineIdx: i,
      level: 1,
      text: text.replace(/:$/, ''),
      span: { start: line.start, end: line.end },
      inferred: true
    })
  }
  return headings
}

function classifyChunk(chunkLines: Line[]): BlockType {
  const first = chunkLines[0]!.text
  const pipeLines = chunkLines.filter((l) => l.text.includes('|')).length
  if (
    pipeLines >= 2 ||
    chunkLines.some((l) => /^\s*\|.*\|\s*$/.test(l.text))
  ) {
    return 'table'
  }
  if (NUMBERED_RE.test(first)) return 'numbered-list'
  if (BULLET_RE.test(first)) return 'bulleted-list'
  if (BLOCKQUOTE_RE.test(first)) return 'blockquote'
  return 'paragraph'
}

let cachedSegmenter: Intl.Segmenter | null | undefined

function getSegmenter(): Intl.Segmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter
  if (
    typeof Intl !== 'undefined' &&
    typeof (Intl as { Segmenter?: unknown }).Segmenter === 'function'
  ) {
    cachedSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' })
  } else {
    cachedSegmenter = null
  }
  return cachedSegmenter
}

/** Trim a raw segment to its non-whitespace core, keeping offsets exact. */
function trimmedSentence(
  raw: string,
  rawStart: number
): SentenceNode | null {
  const leading = raw.length - raw.trimStart().length
  const trailing = raw.length - raw.trimEnd().length
  const text = raw.slice(leading, raw.length - trailing)
  if (text.length === 0) return null
  return {
    text,
    span: { start: rawStart + leading, end: rawStart + raw.length - trailing }
  }
}

/**
 * Split block text into sentences with source-exact spans.
 * Uses Intl.Segmenter (granularity 'sentence') with a regex fallback of
 * [.!?]+ followed by whitespace and a capital letter.
 */
export function splitSentences(text: string, base: number): SentenceNode[] {
  const out: SentenceNode[] = []
  const seg = getSegmenter()
  if (seg) {
    for (const s of seg.segment(text)) {
      const node = trimmedSentence(s.segment, base + s.index)
      if (node) out.push(node)
    }
    return out
  }
  const re = /[.!?]+(?=\s+[A-Z])/g
  let prev = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length
    const node = trimmedSentence(text.slice(prev, end), base + prev)
    if (node) out.push(node)
    prev = end
  }
  const tail = trimmedSentence(text.slice(prev), base + prev)
  if (tail) out.push(tail)
  return out
}

function buildBlocks(source: string, lines: Line[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  const push = (from: number, to: number, type?: BlockType) => {
    const chunk = lines.slice(from, to + 1)
    const start = chunk[0]!.start
    const end = chunk[chunk.length - 1]!.end
    const text = source.slice(start, end)
    const kind = type ?? classifyChunk(chunk)
    const withSentences = kind === 'paragraph' || kind === 'blockquote'
    blocks.push({
      type: kind,
      text,
      span: { start, end },
      sentences: withSentences ? splitSentences(text, start) : [],
      wordCount: kind === 'code' ? 0 : countWords(text)
    })
  }
  while (i < lines.length) {
    const line = lines[i]!
    if (line.blank || line.skip) {
      i++
      continue
    }
    if (line.isFenceMarker && line.inFence) {
      // Opening fence: consume through the closing fence (or EOF).
      let j = i + 1
      while (j < lines.length && !(lines[j]!.isFenceMarker && !isOpening(lines, j))) j++
      const close = j < lines.length ? j : lines.length - 1
      push(i, close, 'code')
      i = close + 1
      continue
    }
    let j = i
    while (
      j + 1 < lines.length &&
      !lines[j + 1]!.blank &&
      !(lines[j + 1]!.isFenceMarker)
    ) {
      j++
    }
    push(i, j)
    i = j + 1
  }
  return blocks
}

/** A fence-marker line opens a fence when the previous state was closed. */
function isOpening(lines: Line[], idx: number): boolean {
  // The opening marker's inFence is true and the closing marker's is true
  // as well; distinguish by scanning markers before it.
  let openers = 0
  for (let k = 0; k <= idx; k++) {
    if (lines[k]!.isFenceMarker) openers++
  }
  return openers % 2 === 1
}

export function parse(source: string): DocModel {
  const lines = splitLines(source)
  markFrontmatter(lines)
  markFences(lines)

  let headings = detectMarkdownHeadings(lines)
  let headingsInferred = false
  if (headings.length === 0) {
    headings = inferHeadings(lines)
    headingsInferred = headings.length > 0
  }

  const headingLineIdxs = new Set<number>()
  for (const h of headings) {
    for (let k = h.lineIdx; k <= h.endLineIdx; k++) headingLineIdxs.add(k)
  }

  const sections: Section[] = []
  const makeSection = (
    heading: HeadingMark | null,
    contentLines: Line[]
  ): Section => {
    const blocks = buildBlocks(source, contentLines)
    const wordCount = blocks.reduce((n, b) => n + b.wordCount, 0)
    const first = heading
      ? heading.span.start
      : blocks.length > 0
        ? blocks[0]!.span.start
        : 0
    const last =
      blocks.length > 0
        ? blocks[blocks.length - 1]!.span.end
        : heading
          ? heading.span.end
          : 0
    return {
      heading: heading ? heading.text : null,
      headingSpan: heading ? heading.span : null,
      level: heading ? heading.level : 0,
      implicit: heading === null,
      inferred: heading?.inferred ?? false,
      blocks,
      span: { start: first, end: Math.max(first, last) },
      wordCount
    }
  }

  if (headings.length === 0) {
    const sec = makeSection(null, lines)
    if (sec.blocks.length > 0) sections.push(sec)
  } else {
    const firstHeading = headings[0]!
    const intro = lines.slice(0, firstHeading.lineIdx)
    if (intro.some((l) => !l.blank && !l.skip)) {
      const sec = makeSection(null, intro)
      if (sec.blocks.length > 0) sections.push(sec)
    }
    for (let h = 0; h < headings.length; h++) {
      const cur = headings[h]!
      const nextStart =
        h + 1 < headings.length ? headings[h + 1]!.lineIdx : lines.length
      const content = lines.slice(cur.endLineIdx + 1, nextStart)
      sections.push(makeSection(cur, content))
    }
  }

  const headingCount = headings.length
  const wordCount = sections.reduce((n, s) => n + s.wordCount, 0)

  return {
    source,
    sections,
    headingsInferred,
    hasHeadings: headingCount > 0,
    headingCount,
    wordCount
  }
}
