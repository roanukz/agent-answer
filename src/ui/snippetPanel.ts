/**
 * "Where Moveworks would cut this" — the split map.
 *
 * Labeled as one vendor's published algorithm everywhere it appears, on
 * purpose. Nobody else publishes their boundaries in enough detail to
 * compute, so this is not a survey of the field and must not read like one.
 */

import type { Report } from '../engine/types.js'
import type { SnippetMap } from '../engine/snippets.js'
import { MOVEWORKS_HARD_MAX_TOKENS } from '../engine/size.js'
import { el } from './dom.js'
import { icon } from './icons.js'
import { splitVerdict } from './format.js'

/** The sentence of the algorithm that decided this article's boundaries. */
function ruleQuote(map: SnippetMap): string {
  if (map.reason === 'faq') {
    return '"we look for the largest header which occurs more than 4 times and the majority of instances end in a question mark (?)"'
  }
  return '"We look for the largest header style that has at least 2 instances, so if H1 is present but only once, and H2 occurs 3 times, then snippetization will occur on H2."'
}

export function renderSnippetPanel(report: Report): HTMLElement {
  const map = report.snippets
  const panel = el('section', { class: 'card snippet-panel' })

  panel.append(
    el('h2', {}, 'Where Moveworks would cut this'),
    el(
      'p',
      { class: 'snippet-caveat' },
      icon('notice'),
      "This is one vendor's published algorithm, not an industry standard. Moveworks documents how it divides an article, so this map is computed from your own headings. Another vendor will cut somewhere else."
    ),
    el('p', { class: 'snippet-verdict' }, splitVerdict(map)),
    el('blockquote', { class: 'snippet-quote' }, ruleQuote(map))
  )

  if (map.oneH1AwayFromMoving) {
    panel.append(
      el(
        'p',
        { class: 'snippet-fragile' },
        icon('warning'),
        'Your one H1 is not used, because a level needs at least two instances. Add a second H1 and every boundary below moves to H1, splitting the article somewhere else entirely. Nothing would tell you.'
      )
    )
  }

  const list = el('ol', { class: 'snippet-list' })
  for (const snippet of map.snippets) {
    const over = snippet.tokenEstimate > MOVEWORKS_HARD_MAX_TOKENS
    const item = el(
      'li',
      { class: over ? 'snippet-item snippet-item-over' : 'snippet-item' },
      el(
        'span',
        { class: 'snippet-name' },
        snippet.heading ?? '(before the first cut)'
      ),
      el(
        'span',
        { class: 'snippet-size' },
        `${snippet.bodyChars.toLocaleString('en-US')} characters, about ${snippet.tokenEstimate.toLocaleString('en-US')} tokens`
      )
    )
    if (over) {
      item.append(
        el(
          'span',
          { class: 'chip chip-fail' },
          icon('error'),
          'splits again'
        )
      )
    }
    list.append(item)
  }
  panel.append(list)

  panel.append(
    el(
      'p',
      { class: 'snippet-note' },
      `Token counts are an estimate at four characters per token, not a tokenizer. The 512-token maximum is Moveworks' own, published for its structure-aware chunking; its target size is 256.`
    )
  )
  return panel
}
