/**
 * orphan-acronym — an acronym is expanded ("Single Sign-On (SSO)") in exactly
 * one section, but used bare in other sections. Each of those sections may be
 * retrieved without the one that carries the expansion.
 */

import type { Finding, Rule, Span } from '../types.js'
import { sectionLabel, textBlocks, truncate } from '../textUtils.js'

const WHY =
  'The section where the acronym is expanded may not be retrieved with this one.'

/**
 * "Long Name (ACRO)": at least two capitalized-ish words (lowercase
 * connectors allowed in the middle) directly before a parenthesized
 * 2–6 letter acronym.
 */
const DEFINITION_RE =
  /\b([A-Z][A-Za-z]*(?:-[A-Za-z]+)*(?:\s+(?:of|to|for|and|in|on|the|[A-Z][A-Za-z]*(?:-[A-Za-z]+)*))*\s+[A-Z][A-Za-z]*(?:-[A-Za-z]+)*)\s*\(([A-Z]{2,6})\)/g

interface AcronymDef {
  /** Indices of sections containing a definition of this acronym. */
  sectionIdxs: Set<number>
  /** Long name from the first definition seen (for the suggestion). */
  longName: string
  /** Full spans of every definition match, to exclude from bare-use scans. */
  defSpans: Span[]
}

function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end
}

export const orphanAcronym: Rule = {
  id: 'orphan-acronym',
  checkId: 'self-contained',
  severity: 'minor',
  run(doc) {
    // Pass 1: collect acronym definitions per section.
    const defs = new Map<string, AcronymDef>()
    doc.sections.forEach((section, idx) => {
      for (const block of textBlocks(section)) {
        DEFINITION_RE.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = DEFINITION_RE.exec(block.text)) !== null) {
          const acro = m[2]!
          const span: Span = {
            start: block.span.start + m.index,
            end: block.span.start + m.index + m[0].length
          }
          const existing = defs.get(acro)
          if (existing) {
            existing.sectionIdxs.add(idx)
            existing.defSpans.push(span)
          } else {
            defs.set(acro, {
              sectionIdxs: new Set([idx]),
              longName: m[1]!,
              defSpans: [span]
            })
          }
          if (m[0].length === 0) DEFINITION_RE.lastIndex++
        }
      }
    })

    // Pass 2: acronyms defined in exactly one section, used bare elsewhere.
    const findings: Finding[] = []
    for (const [acro, def] of defs) {
      if (def.sectionIdxs.size !== 1) continue
      const defIdx = def.sectionIdxs.values().next().value!
      const defLabel = sectionLabel(doc.sections[defIdx]!)
      const bareRe = new RegExp(`\\b${acro}\\b`, 'g')

      doc.sections.forEach((section, idx) => {
        if (idx === defIdx) return
        let first: Span | null = null
        for (const block of textBlocks(section)) {
          bareRe.lastIndex = 0
          let m: RegExpExecArray | null
          while ((m = bareRe.exec(block.text)) !== null) {
            const span: Span = {
              start: block.span.start + m.index,
              end: block.span.start + m.index + m[0].length
            }
            if (!def.defSpans.some((d) => overlaps(d, span))) {
              first = span
              break
            }
          }
          if (first) break
        }
        if (!first) return
        findings.push({
          ruleId: orphanAcronym.id,
          checkId: orphanAcronym.checkId,
          severity: orphanAcronym.severity,
          span: first,
          message: `"${acro}" is used here without its expansion, which appears only in the "${defLabel}" section.`,
          whyItMatters: WHY,
          suggestion: `Write out "${truncate(def.longName, 60)} (${acro})" on first use in this section.`,
          sectionHeading: sectionLabel(section)
        })
      })
    }
    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default orphanAcronym
