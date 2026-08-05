/**
 * Core data model for the analysis engine.
 * Everything here is pure data — no DOM, no browser APIs — so the whole
 * engine is unit-testable in Node.
 */

/** Character offsets into the raw source string. `end` is exclusive. */
export interface Span {
  start: number
  end: number
}

export type BlockType =
  | 'paragraph'
  | 'bulleted-list'
  | 'numbered-list'
  | 'table'
  | 'code'
  | 'blockquote'

export interface SentenceNode {
  /** Exact slice of the raw source (trimmed of surrounding whitespace). */
  text: string
  span: Span
}

export interface Block {
  type: BlockType
  /** Exact slice of the raw source for this block. */
  text: string
  span: Span
  /**
   * Sentence segmentation — populated for 'paragraph' and 'blockquote'
   * blocks; empty for lists, tables, and code.
   */
  sentences: SentenceNode[]
  /** Word count of the block text (0 for code blocks). */
  wordCount: number
}

export interface Section {
  /** Heading text without markdown markers; null for implicit sections. */
  heading: string | null
  /** Span of the heading line in the source; null for implicit sections. */
  headingSpan: Span | null
  /** 1–6 for real headings; 0 for implicit sections. */
  level: number
  /** True for the "(Introduction)" section and no-heading documents. */
  implicit: boolean
  /** True when the heading was inferred from plain-text heuristics. */
  inferred: boolean
  blocks: Block[]
  /** Span from the heading (or first block) to the end of the last block. */
  span: Span
  /** Total words in non-code blocks of this section (heading excluded). */
  wordCount: number
}

export interface DocModel {
  source: string
  sections: Section[]
  /** True when no markdown headings existed and headings were inferred. */
  headingsInferred: boolean
  /** True when at least one section has a heading (explicit or inferred). */
  hasHeadings: boolean
  /** Number of sections with a heading (explicit or inferred). */
  headingCount: number
  /** Total prose words in the document (non-code blocks, headings excluded). */
  wordCount: number
}

export type Severity = 'major' | 'minor' | 'info'

export type CheckId =
  | 'self-contained'
  | 'answer-first'
  | 'unresolved-references'
  | 'one-idea'
  | 'structure'

export interface Finding {
  ruleId: string
  checkId: CheckId
  severity: Severity
  /** The exact offending span in the raw source; UI highlights this. */
  span: Span
  /** What is wrong at this spot, specific to the matched text. */
  message: string
  /** Fixed one-liner: the retrieval principle this finding violates. */
  whyItMatters: string
  /** What to do instead, phrased for a KB author. */
  suggestion: string
  /** Heading of the section the finding sits in (for fix-list phrasing). */
  sectionHeading?: string
  /** True for strengths — things the article already does right. No deduction. */
  positive?: boolean
  /** True for findings about the document as a whole (span is representative). */
  docLevel?: boolean
}

export interface Rule {
  id: string
  checkId: CheckId
  severity: Severity
  run(doc: DocModel): Finding[]
}

export interface CheckDef {
  id: CheckId
  name: string
  /** Fraction of the overall score, e.g. 0.25. */
  weight: number
  /** The author-facing explainer sentence for this check. */
  why: string
}

export interface ScoredFinding extends Finding {
  /** Points this finding deducts from its check (25 major / 10 minor / 0 info). */
  deduction: number
  /** False when past the 3-per-rule cap ("not double-counted — same habit"). */
  counted: boolean
  /**
   * Weighted overall points this finding contributes to the deficit
   * (deduction × check weight when counted, else 0). Ranks the fix list.
   */
  impact: number
  /**
   * Exact overall points recovered by fixing this one finding — cap-aware
   * (a capped sibling may take its place) and floor-aware. Can be 0 even
   * for a counted major when the check is saturated.
   */
  recovery: number
}

export type CheckStatus = 'pass' | 'needs-work' | 'fail'

export interface CheckResult {
  def: CheckDef
  score: number
  status: CheckStatus
  findings: ScoredFinding[]
}

export type Band = 'agent-ready' | 'needs-edits' | 'struggle'

export interface Report {
  doc: DocModel
  /** Weighted overall score, rounded to an integer 0–100. */
  overall: number
  band: Band
  bandLabel: string
  checks: CheckResult[]
  /** All non-positive findings, sorted by source position. */
  issues: ScoredFinding[]
  /** Positive findings — what the article already does right. */
  strengths: ScoredFinding[]
  /** Top findings ranked by recovery (highest first), max 5. */
  fixes: ScoredFinding[]
  issueCount: number
  /** Number of checks with at least one issue. */
  checksWithIssues: number
  /** Sum of recovery for the top 3 fixes (for the summary line). */
  topFixRecovery: number
}
