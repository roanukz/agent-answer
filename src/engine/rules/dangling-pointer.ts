/**
 * dangling-pointer — "the following" / "the above" / "the previous" in prose
 * with no list or table target in the same section. When the section is
 * retrieved on its own, the pointer points at nothing.
 */

import type { Block, Finding, Rule, Span } from '../types.js'
import { findAllMatches, sectionLabel, truncate } from '../textUtils.js'

/** Pointer phrases, matched case-insensitively as whole words. */
const POINTER_RE = /\bthe\s+(?:following|above|previous)\b/gi

/**
 * Cross-section pointer phrases ("the previous section", "the next step"…).
 * Those belong to the self-contained check, not this rule, so any pointer
 * match overlapping one of these is skipped. Recomputed locally on purpose.
 */
const CROSS_SECTION_RE =
  /\bthe\s+(?:previous|next|above|below|following|earlier|later)\s+(?:sections?|steps?|articles?|pages?|chapters?|parts?|guides?|documents?)\b/gi

/** Block types that can satisfy a "the following"/"the above" pointer. */
const TARGET_TYPES: ReadonlySet<Block['type']> = new Set([
  'numbered-list',
  'bulleted-list',
  'table'
])

function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end
}

export const danglingPointer: Rule = {
  id: 'dangling-pointer',
  checkId: 'unresolved-references',
  severity: 'major',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      const blocks = section.blocks
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]!
        if (block.type !== 'paragraph' && block.type !== 'blockquote') continue
        const matches = findAllMatches(POINTER_RE, block.text, block.span.start)
        if (matches.length === 0) continue
        const crossMatches = findAllMatches(
          CROSS_SECTION_RE,
          block.text,
          block.span.start
        )
        // Blocks are non-overlapping and in source order, so index position
        // decides "starts after" / "ends before" the pointer's block.
        const hasTargetAfter = blocks.some(
          (b, j) => j > i && TARGET_TYPES.has(b.type)
        )
        const hasTargetBefore = blocks.some(
          (b, j) => j < i && TARGET_TYPES.has(b.type)
        )
        for (const m of matches) {
          if (crossMatches.some((c) => overlaps(m.span, c.span))) continue
          const forward = /following/i.test(m.text)
          if (forward ? hasTargetAfter : hasTargetBefore) continue
          findings.push({
            ruleId: 'dangling-pointer',
            checkId: 'unresolved-references',
            severity: 'major',
            span: m.span,
            message: forward
              ? `"${truncate(m.text, 40)}" points ahead, but no list or table comes after it in this section.`
              : `"${truncate(m.text, 40)}" points back, but no list or table appears earlier in this section.`,
            whyItMatters:
              "'The following' points at nothing when the section is retrieved by itself.",
            suggestion:
              'Move the list or table it refers to into this section, or restate those details right here.',
            sectionHeading: sectionLabel(section)
          })
        }
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default danglingPointer
