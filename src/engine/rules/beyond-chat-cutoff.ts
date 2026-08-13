/**
 * beyond-chat-cutoff — Check 2 (answer first).
 *
 * Not a size rule about splitting: a rule about what a person is shown. In
 * Moveworks' chat, a snippet is truncated for display, from "Writing
 * AI-ready KB Articles for Moveworks", under "Snippet character display
 * limits": "The maximum number of characters that can be shown in a snippet
 * is 500 characters", and "Snippets end at the first space after 500
 * characters, this is done so that the last word in a snippet is not cut
 * off." The same page says "The title of the article does not count towards
 * the maximum number of characters", so the boundary heading is excluded
 * from the count here.
 *
 * An answer that sits past that point is retrieved, is correct, and is
 * never read. That is a bottom-line-up-front failure with a measurable
 * cutoff, which is why it lives in check 2 rather than with the size rules.
 *
 * At most one finding per piece.
 */

import type { AnalysisContext, Block, DocModel, Finding, Rule } from '../types.js'
import { MOVEWORKS_SNIPPET_CHARS, displayLength } from '../size.js'
import { snippetize, type Snippet } from '../snippets.js'

const WHY =
  'A reader is shown the opening of the piece and nothing after it, so an answer further down is retrieved, correct, and never seen.'

const STEP_BLOCKS = new Set<Block['type']>([
  'numbered-list',
  'bulleted-list',
  'table'
])

function label(snippet: Snippet): string {
  return snippet.heading ?? '(Introduction)'
}

export const beyondChatCutoff: Rule = {
  id: 'beyond-chat-cutoff',
  checkId: 'answer-first',
  severity: 'minor',
  run(doc: DocModel, ctx?: AnalysisContext): Finding[] {
    const findings: Finding[] = []
    const map = ctx?.snippets ?? snippetize(doc)
    for (const snippet of map.snippets) {
      if (snippet.bodyChars <= MOVEWORKS_SNIPPET_CHARS) continue
      const blocks = snippet.sections
        .flatMap((s) => s.blocks)
        .filter((b) => b.type !== 'code')
      if (blocks.length === 0) continue

      // Distance in displayed characters from the start of the body.
      const offsetOf = (block: Block): number =>
        displayLength(doc.source.slice(snippet.bodyStart, block.span.start))

      const opener = blocks[0]!
      const openerLength = displayLength(opener.text)
      let span = opener.span
      let message: string | null = null

      if (opener.type === 'paragraph' && openerLength > MOVEWORKS_SNIPPET_CHARS) {
        message = `This piece opens with ${openerLength} characters of prose. Moveworks shows a reader the first ${MOVEWORKS_SNIPPET_CHARS} characters of a snippet in chat, so the rest of this paragraph is not shown.`
      } else {
        const steps = blocks.find(
          (b) =>
            STEP_BLOCKS.has(b.type) && offsetOf(b) > MOVEWORKS_SNIPPET_CHARS
        )
        if (steps) {
          span = steps.span
          message = `The ${steps.type === 'table' ? 'table' : 'list'} in this piece starts about ${offsetOf(steps)} characters in, past the ${MOVEWORKS_SNIPPET_CHARS} characters Moveworks shows a reader in chat.`
        }
      }

      if (message === null) continue
      findings.push({
        ruleId: 'beyond-chat-cutoff',
        checkId: 'answer-first',
        severity: 'minor',
        span,
        message,
        whyItMatters: WHY,
        suggestion: `Put the answer in the first sentence of this piece and move the setup below it, so the part that is shown is the part that answers.`,
        sectionHeading: label(snippet)
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default beyondChatCutoff
