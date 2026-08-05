/**
 * slow-start — a headed section opens with a long paragraph that neither
 * restates the heading's topic in its first sentence nor contains any
 * instruction, so retrieval gets weak signal from the opening.
 */

import type { Finding, Rule } from '../types.js'
import {
  contentWords,
  sectionLabel,
  startsWithImperative,
  truncate,
  words
} from '../textUtils.js'

export const slowStart: Rule = {
  id: 'slow-start',
  checkId: 'answer-first',
  severity: 'minor',
  run(doc) {
    const findings: Finding[] = []
    for (const section of doc.sections) {
      if (section.heading === null) continue
      const first = section.blocks[0]
      if (!first || first.type !== 'paragraph') continue
      if (first.wordCount <= 60) continue
      if (first.sentences.length === 0) continue
      if (first.sentences.some((s) => startsWithImperative(s.text))) continue
      // Whole-word, case-insensitive: tokenize both sides the same way.
      // When the stopword filter eats every heading word ("Steps overview"),
      // fall back to all words of 4+ characters so the topic test never
      // becomes vacuously unpassable.
      const openerWords = new Set(words(first.sentences[0]!.text))
      let topicWords = contentWords(section.heading)
      if (topicWords.length === 0) {
        topicWords = words(section.heading).filter((w) => w.length >= 4)
      }
      if (topicWords.some((w) => openerWords.has(w))) {
        continue
      }
      findings.push({
        ruleId: 'slow-start',
        checkId: 'answer-first',
        severity: 'minor',
        span: first.span,
        message: `This section opens with a ${first.wordCount}-word paragraph that doesn't restate "${truncate(section.heading, 60)}" up front and gives no instruction.`,
        whyItMatters:
          "If the opening doesn't restate the topic, retrieval has weaker signal that this section answers the question.",
        suggestion:
          'Start the section with one direct sentence that names the topic and states the key point.',
        sectionHeading: sectionLabel(section)
      })
    }
    return findings.sort((a, b) => a.span.start - b.span.start)
  }
}

export default slowStart
