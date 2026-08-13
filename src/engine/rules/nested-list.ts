/**
 * nested-list — Check 5 (structure signals).
 *
 * Moveworks, "Writing AI-ready KB Articles for Moveworks", under "Avoid
 * using Nested Lists", instructs writers to "avoid creating nested lists,
 * or lists within lists", because "The nested list will be flattened and
 * the list items will all appear on the same level."
 *
 * Flattening is worse than losing formatting: a sub-step promoted to a step
 * reads as an instruction to everyone, including people the sub-step never
 * applied to. One finding per list block.
 */

import type { Finding, Rule } from '../types.js'
import { sectionLabel } from '../textUtils.js'

const MARKER_RE = /^(\s*)(?:[-*+]|\d+[.)])\s+\S/

const WHY =
  'Moveworks flattens a nested list so every item appears at the same level, which turns a sub-step that applied to one case into a step that applies to everyone.'

export const nestedList: Rule = {
  id: 'nested-list',
  checkId: 'structure',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      for (const block of section.blocks) {
        if (block.type !== 'bulleted-list' && block.type !== 'numbered-list') {
          continue
        }
        let baseIndent: number | null = null
        let offset = block.span.start
        let nested: { indent: number; start: number; end: number } | null = null
        for (const line of block.text.split('\n')) {
          const m = MARKER_RE.exec(line)
          if (m) {
            // A tab indents as far as anything else here; only the
            // relationship between markers matters.
            const indent = m[1]!.replace(/\t/g, '  ').length
            if (baseIndent === null) baseIndent = indent
            else if (indent > baseIndent && nested === null) {
              nested = { indent, start: offset, end: offset + line.length }
            }
          }
          offset += line.length + 1
        }
        if (!nested) continue
        findings.push({
          ruleId: 'nested-list',
          checkId: 'structure',
          severity: 'minor',
          span: { start: nested.start, end: nested.end },
          message: 'This list has items nested under other items.',
          whyItMatters: WHY,
          suggestion:
            'Flatten the list yourself: promote the sub-items into their own steps, or fold each one into the sentence of the step it belongs to.',
          sectionHeading: sectionLabel(section)
        })
      }
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default nestedList
