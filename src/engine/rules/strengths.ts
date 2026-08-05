/**
 * strengths — positive findings: structural habits the article already gets
 * right. These never deduct points; the UI lists them as strengths.
 */

import type { Block, Finding, Rule, Section } from '../types.js'
import { IMPERATIVE_WORDS, sectionLabel, truncate, words } from '../textUtils.js'

/** Question openers that mirror how users phrase real queries. */
const QUESTION_START_RE =
  /^(?:how|can|what|why|when|where|which|who|does|do|is|are|should)\s/i

function headingKind(heading: string): 'question' | 'task' | null {
  if (QUESTION_START_RE.test(heading)) return 'question'
  const first = words(heading)[0]
  if (first && IMPERATIVE_WORDS.has(first)) return 'task'
  return null
}

export const strengths: Rule = {
  id: 'strengths',
  checkId: 'structure',
  severity: 'info',
  run(doc) {
    const findings: Finding[] = []

    // (a) Question-form or task-form headings.
    for (const section of doc.sections) {
      if (!section.heading || !section.headingSpan) continue
      const kind = headingKind(section.heading)
      if (!kind) continue
      findings.push({
        ruleId: 'strengths',
        checkId: 'structure',
        severity: 'info',
        span: section.headingSpan,
        message:
          kind === 'question'
            ? `Heading "${truncate(section.heading, 80)}" is phrased as the question a user would actually ask.`
            : `Heading "${truncate(section.heading, 80)}" opens with an action verb, naming the task the user wants done.`,
        whyItMatters:
          'A heading phrased the way users ask is a strong retrieval match.',
        suggestion: 'Keep phrasing headings as user questions or tasks.',
        sectionHeading: sectionLabel(section),
        positive: true
      })
    }

    // (b) First table block, (c) first numbered-list block.
    let firstTable: { block: Block; section: Section } | null = null
    let firstNumbered: { block: Block; section: Section } | null = null
    for (const section of doc.sections) {
      for (const block of section.blocks) {
        if (block.type === 'table' && !firstTable) {
          firstTable = { block, section }
        }
        if (block.type === 'numbered-list' && !firstNumbered) {
          firstNumbered = { block, section }
        }
      }
    }

    if (firstTable) {
      findings.push({
        ruleId: 'strengths',
        checkId: 'structure',
        severity: 'info',
        span: firstTable.block.span,
        message:
          'This article presents structured facts as a table instead of burying them in prose.',
        whyItMatters:
          'Tables give the agent rows and columns it can read reliably.',
        suggestion: 'Keep using tables for facts that vary by option or plan.',
        sectionHeading: sectionLabel(firstTable.section),
        positive: true
      })
    }

    if (firstNumbered) {
      findings.push({
        ruleId: 'strengths',
        checkId: 'structure',
        severity: 'info',
        span: firstNumbered.block.span,
        message:
          'This article lays out its procedure as a numbered list, one step per item.',
        whyItMatters: 'Numbered steps can be quoted directly into an answer.',
        suggestion: 'Keep writing procedures as numbered steps.',
        sectionHeading: sectionLabel(firstNumbered.section),
        positive: true
      })
    }

    findings.sort((a, b) => a.span.start - b.span.start)
    return findings
  }
}

export default strengths
