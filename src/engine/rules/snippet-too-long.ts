/**
 * snippet-too-long — Check 4 (one idea per section).
 *
 * Scores the delivered piece, not the section the author wrote. A section
 * can stand alone perfectly and still be too big to arrive in one piece,
 * and that is the case this rule exists for: the long, self-contained
 * section is exactly the one that gets split, which destroys the property
 * the rest of the tool just rewarded.
 *
 * The limit is Moveworks', from "Document Chunking and Snippetization
 * Overview", under "Strategy B: Structure-Aware Dynamic Chunking":
 * "Hard maximum: 512 tokens (tables and lists: 1,024 tokens)". Their target
 * is 256 tokens, which is context for the finding rather than a threshold:
 * an ordinary 200-word section already sits above 256, so scoring against
 * the target would flag writing that is doing nothing wrong.
 *
 * The token count is an estimate, and every message says so.
 */

import type { AnalysisContext, DocModel, Finding, Rule } from '../types.js'
import {
  MOVEWORKS_HARD_MAX_TOKENS,
  MOVEWORKS_TARGET_TOKENS
} from '../size.js'
import { snippetize, type Snippet } from '../snippets.js'

const WHY =
  'A piece over the limit is split again by size rather than by meaning, so the split lands mid-idea, wherever the software decides.'

function anchorSpan(snippet: Snippet) {
  const first = snippet.sections[0]
  return first?.headingSpan ?? first?.blocks[0]?.span ?? snippet.span
}

function label(snippet: Snippet): string {
  return snippet.heading ?? '(Introduction)'
}

export const snippetTooLong: Rule = {
  id: 'snippet-too-long',
  checkId: 'one-idea',
  severity: 'major',
  run(doc: DocModel, ctx?: AnalysisContext): Finding[] {
    const findings: Finding[] = []
    const map = ctx?.snippets ?? snippetize(doc)
    for (const snippet of map.snippets) {
      if (snippet.tokenEstimate <= MOVEWORKS_HARD_MAX_TOKENS) continue
      const span = anchorSpan(snippet)
      findings.push({
        ruleId: 'snippet-too-long',
        checkId: 'one-idea',
        severity: 'major',
        span,
        message: `This piece is roughly ${snippet.tokenEstimate} tokens, over the 512-token maximum Moveworks publishes for one chunk (their target is ${MOVEWORKS_TARGET_TOKENS}), so it gets split again.`,
        whyItMatters: WHY,
        suggestion:
          'Break this piece up under headings of the level the cuts land on, so you choose the split points instead of the software.',
        sectionHeading: label(snippet)
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default snippetTooLong
