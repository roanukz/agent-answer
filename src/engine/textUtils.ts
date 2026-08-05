/**
 * Shared, deterministic text helpers for the rule engine.
 * Pure functions only — no DOM, no randomness, no locale surprises.
 */

import type { Block, Section, SentenceNode, Span } from './types.js'

/**
 * Words accepted as "a verb directly after a pronoun/demonstrative".
 * Curated rather than stemmed: suffix heuristics would misfire on nouns
 * like "setting" or "results page". Base forms that commonly act as nouns
 * right after "This" (help, use, need, result, control, work…) are left out
 * on purpose; their -s forms are kept because after This/It/They those are
 * verbs ("This means…", "It takes…").
 */
export const VERB_WORDS: ReadonlySet<string> = new Set([
  // auxiliaries and copulas
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had',
  'can', 'cannot', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'does', 'do', 'did', "doesn't", "don't", "won't", "can't", "isn't", "aren't",
  // common KB verbs — 3rd-person singular forms
  'allows', 'enables', 'requires', 'provides', 'lets', 'helps', 'makes', 'means',
  'works', 'refers', 'applies', 'happens', 'occurs', 'uses', 'shows', 'contains',
  'includes', 'ensures', 'causes', 'prevents', 'gives', 'gets', 'needs', 'keeps',
  'comes', 'goes', 'takes', 'becomes', 'depends', 'affects', 'involves', 'consists',
  'remains', 'represents', 'indicates', 'determines', 'controls', 'describes',
  'covers', 'explains', 'varies', 'tends', 'appears', 'seems', 'results', 'leads',
  'differs', 'matters', 'breaks', 'fails', 'stops', 'starts', 'runs', 'returns',
  'triggers', 'resolves', 'expires', 'defaults', 'overrides',
  // base/plural forms that are rarely nouns (needed for These/Those/They)
  'allow', 'enable', 'require', 'provide', 'let', 'ensure', 'prevent', 'include',
  'contain', 'indicate', 'represent', 'involve', 'depend', 'apply', 'refer',
  'occur', 'happen', 'remain', 'appear', 'seem', 'tend', 'vary', 'become',
  'take', 'give', 'get', 'go', 'come', 'keep', 'make', 'affect', 'differ',
  'expire', 'fail', 'break', 'resolve',
  // common past/participle forms
  'allowed', 'enabled', 'required', 'provided', 'ensured', 'included',
  'contained', 'happened', 'occurred', 'applied', 'referred', 'caused',
  'affected', 'worked', 'failed', 'expired', 'changed', 'stopped'
])

/** Base-form verbs that open imperative instructions in KB articles. */
export const IMPERATIVE_WORDS: ReadonlySet<string> = new Set([
  'click', 'select', 'open', 'close', 'go', 'run', 'enter', 'type', 'choose',
  'navigate', 'sign', 'log', 'use', 'set', 'enable', 'disable', 'contact',
  'restart', 'install', 'uninstall', 'verify', 'check', 'ensure', 'follow',
  'press', 'update', 'create', 'delete', 'remove', 'add', 'configure',
  'submit', 'save', 'copy', 'paste', 'review', 'confirm', 'request', 'visit',
  'launch', 'tap', 'scroll', 'wait', 'call', 'email', 'ask', 'complete',
  'repeat', 'see', 'note', 'make', 'turn', 'allow', 'avoid', 'keep', 'locate',
  'find', 'download', 'upload', 'generate', 'reset', 'sync', 're-sync',
  'unlock', 'activate', 'deactivate', 'connect', 'disconnect', 'reboot',
  'refresh', 'expand', 'collapse', 'search', 'start', 'stop', 'switch'
])

/**
 * Short/function words excluded when extracting a heading's content words.
 */
export const HEADING_STOPWORDS: ReadonlySet<string> = new Set([
  'your', 'this', 'that', 'these', 'those', 'with', 'from', 'into', 'onto',
  'when', 'what', 'where', 'which', 'whose', 'while', 'will', 'would',
  'could', 'should', 'shall', 'must', 'might', 'have', 'does', 'about',
  'them', 'they', 'their', 'there', 'here', 'only', 'also', 'very', 'such',
  'than', 'then', 'over', 'under', 'after', 'before', 'between', 'through',
  'during', 'without', 'within', 'being', 'been', 'most', 'more', 'some',
  'each', 'other', 'another', 'every', 'much', 'many', 'both', 'same',
  'step', 'steps', 'guide', 'article', 'section', 'overview'
])

/**
 * Common English function words for the naive language check.
 * The list is deliberately generous so normal English prose clears the
 * 40% threshold comfortably.
 */
export const ENGLISH_STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'so', 'as',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'up', 'down',
  'out', 'off', 'over', 'under', 'into', 'onto', 'about', 'after', 'before',
  'between', 'through', 'during', 'without', 'within', 'above', 'below',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'has', 'have', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',
  'can', 'cannot', 'could', 'will', 'would', 'shall', 'should', 'may',
  'might', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours',
  'this', 'that', 'these', 'those', 'there', 'here',
  'who', 'whom', 'whose', 'which', 'what', 'when', 'where', 'why', 'how',
  'not', 'no', 'nor', 'only', 'own', 'same', 'such', 'than', 'too', 'very',
  'just', 'also', 'now', 'again', 'once', 'more', 'most', 'some', 'any',
  'all', 'both', 'each', 'few', 'other', 'another', 'every', 'either',
  'because', 'while', 'until', 'unless', 'although', 'though', 'since',
  'get', 'got', 'make', 'made', 'use', 'used', 'need', 'needs', 'new',
  'one', 'two', 'first', 'next', 'last', 'well', 'even', 'still', 'back',
  'please', 'yes'
])

const WORD_RE = /[A-Za-z0-9][A-Za-z0-9'’\-]*/g

/** Count word-like tokens in a string. */
export function countWords(text: string): number {
  const m = text.match(WORD_RE)
  return m ? m.length : 0
}

/** Lowercased word tokens of a string. */
export function words(text: string): string[] {
  return (text.match(WORD_RE) ?? []).map((w) => w.toLowerCase())
}

/**
 * A heading's "content words": ≥ 4 characters, not a heading stopword.
 * Used by the slow-start heuristic.
 */
export function contentWords(text: string): string[] {
  return words(text).filter((w) => w.length >= 4 && !HEADING_STOPWORDS.has(w))
}

export function isVerbWord(word: string): boolean {
  return VERB_WORDS.has(word.toLowerCase())
}

/**
 * True when a sentence reads as an instruction: it opens with a base-form
 * verb ("Click…", "Open…"), optionally after "Please".
 */
export function startsWithImperative(sentence: string): boolean {
  const ws = words(sentence)
  if (ws.length === 0) return false
  let first = ws[0]!
  if (first === 'please' && ws.length > 1) first = ws[1]!
  return IMPERATIVE_WORDS.has(first)
}

/**
 * All regex matches in `text`, with spans shifted by `base` so they index
 * into the raw document source. The regex must have the `g` flag.
 */
export function findAllMatches(
  re: RegExp,
  text: string,
  base: number
): Array<{ text: string; span: Span }> {
  const out: Array<{ text: string; span: Span }> = []
  re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({
      text: m[0],
      span: { start: base + m.index, end: base + m.index + m[0].length }
    })
    if (m[0].length === 0) re.lastIndex++
  }
  return out
}

/** Every block except fenced code — the blocks prose rules may scan. */
export function textBlocks(section: Section): Block[] {
  return section.blocks.filter((b) => b.type !== 'code')
}

/** Paragraph blocks only. */
export function paragraphBlocks(section: Section): Block[] {
  return section.blocks.filter((b) => b.type === 'paragraph')
}

/**
 * The section's opening sentence: the first sentence of its first
 * paragraph block. Null when the section has no paragraph before any
 * other content that would carry one.
 */
export function firstSentence(
  section: Section
): { sentence: SentenceNode; block: Block } | null {
  const para = section.blocks.find((b) => b.type === 'paragraph')
  if (!para || para.sentences.length === 0) return null
  return { sentence: para.sentences[0]!, block: para }
}

/** Display label for a section, for messages and the fix list. */
export function sectionLabel(section: Section): string {
  return section.heading ?? '(Introduction)'
}

/**
 * Naive language check: English text has a high share of function words.
 * Returns true when fewer than 40% of words are common English stopwords
 * (only evaluated on documents with at least 20 words).
 */
export function looksNonEnglish(source: string): boolean {
  const ws = words(source)
  if (ws.length < 20) return false
  let hits = 0
  for (const w of ws) if (ENGLISH_STOPWORDS.has(w)) hits++
  return hits / ws.length < 0.4
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Shorten a quote for display without touching the underlying span. */
export function truncate(text: string, max = 160): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= max) return collapsed
  return collapsed.slice(0, max - 1).trimEnd() + '…'
}
