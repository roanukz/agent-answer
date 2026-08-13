/**
 * Moveworks' published snippetization algorithm, run on the pasted article.
 *
 * This is one vendor's documented behaviour, not an industry standard, and
 * everything user-facing says so. It is implemented here because Moveworks
 * publishes it in full and it is computable from the article's own markup,
 * which makes it the one place this tool can show an author where their
 * article will actually be cut rather than where they imagine it will be.
 *
 * From "Writing AI-ready KB Articles for Moveworks", section "How does
 * snippetization work?":
 *
 *   "For each article, one level of header is used to divide an article
 *    into sections, these sections then make up a snippet."
 *   "We look for the largest header style that has at least 2 instances"
 *   "so if H1 is present but only once, and H2 occurs 3 times, then
 *    snippetization will occur on H2."
 *   "This does not consider headers below H2 once the condition is met"
 *   FAQ articles are the exception: "we look for the largest header which
 *    occurs more than 4 times and the majority of instances end in a
 *    question mark (?)"
 *
 * Reading of the H2 sentence: the search itself stops at H2, so a document
 * whose only headings are H3s is never split. That is a real outcome, not a
 * bug in this implementation — such a document arrives as one oversized
 * piece, which the size rules then report.
 */

import type { DocModel, Section, Span } from './types.js'
import { estimateTokens, displayLength } from './size.js'

export interface Snippet {
  /** 1-based position in the document. */
  index: number
  /** The boundary heading that opens this snippet; null for the lead-in. */
  heading: string | null
  /** Heading level of the boundary, 0 for the lead-in piece. */
  level: number
  /** Sections that travel inside this snippet, in document order. */
  sections: Section[]
  /** Full extent in the source, heading included. */
  span: Span
  /** Source text of the whole snippet, heading included. */
  text: string
  /** Offset where the body starts: past the boundary heading line. */
  bodyStart: number
  /** Collapsed character count of the body, boundary heading excluded. */
  bodyChars: number
  /** Estimated tokens for the whole delivered piece. */
  tokenEstimate: number
}

export type SplitReason =
  | 'faq'
  | 'headers'
  /** No header level qualified, so the whole article is one piece. */
  | 'none'
  /** The document has no headings at all. */
  | 'no-headings'

export interface SnippetMap {
  /** Heading level the cuts land on; null when the article is not split. */
  level: number | null
  reason: SplitReason
  snippets: Snippet[]
  /**
   * True when exactly one H1 exists and the cuts landed on H2, so adding a
   * second H1 would move every boundary in the document.
   */
  oneH1AwayFromMoving: boolean
  /** Count of headings per level, 1–6. */
  levelCounts: Record<number, number>
}

const headingSections = (doc: DocModel): Section[] =>
  doc.sections.filter((s) => s.heading !== null)

function countsByLevel(sections: Section[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const s of sections) {
    if (s.level >= 1 && s.level <= 6) counts[s.level] = (counts[s.level] ?? 0) + 1
  }
  return counts
}

/** The FAQ exception: > 4 instances and a majority ending in "?". */
function faqLevel(sections: Section[]): number | null {
  for (let level = 1; level <= 6; level++) {
    const instances = sections.filter((s) => s.level === level)
    if (instances.length <= 4) continue
    const questions = instances.filter((s) =>
      (s.heading ?? '').trim().endsWith('?')
    ).length
    if (questions * 2 > instances.length) return level
  }
  return null
}

/**
 * The ordinary path: the largest header style with at least 2 instances,
 * searched H1 then H2 and no further.
 */
function headerLevel(counts: Record<number, number>): number | null {
  for (let level = 1; level <= 2; level++) {
    if ((counts[level] ?? 0) >= 2) return level
  }
  return null
}

export function snippetize(doc: DocModel): SnippetMap {
  const headed = headingSections(doc)
  const levelCounts = countsByLevel(headed)

  let level: number | null = null
  let reason: SplitReason = 'no-headings'
  if (headed.length > 0) {
    const faq = faqLevel(headed)
    if (faq !== null) {
      level = faq
      reason = 'faq'
    } else {
      level = headerLevel(levelCounts)
      reason = level === null ? 'none' : 'headers'
    }
  }

  const groups: Section[][] = []
  for (const section of doc.sections) {
    const isBoundary =
      level !== null && section.heading !== null && section.level === level
    if (isBoundary || groups.length === 0) {
      groups.push([section])
    } else {
      groups[groups.length - 1]!.push(section)
    }
  }

  const snippets: Snippet[] = groups.map((sections, i) => {
    const first = sections[0]!
    const last = sections[sections.length - 1]!
    const span: Span = { start: first.span.start, end: last.span.end }
    const isBoundary =
      level !== null && first.heading !== null && first.level === level
    const bodyStart =
      isBoundary && first.headingSpan ? first.headingSpan.end : span.start
    const text = doc.source.slice(span.start, span.end)
    return {
      index: i + 1,
      heading: isBoundary ? first.heading : null,
      level: isBoundary ? first.level : 0,
      sections,
      span,
      text,
      bodyStart,
      bodyChars: displayLength(doc.source.slice(bodyStart, span.end)),
      tokenEstimate: estimateTokens(text)
    }
  })

  return {
    level,
    reason,
    snippets,
    oneH1AwayFromMoving: level === 2 && (levelCounts[1] ?? 0) === 1,
    levelCounts
  }
}
