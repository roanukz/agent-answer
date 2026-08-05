import type { Report } from '../engine/types.js'
import { el } from './dom.js'
import { summaryLine } from './format.js'

export function renderScorePanel(report: Report): HTMLElement[] {
  const number = el(
    'div',
    { class: `score-number band-${report.band}` },
    String(report.overall)
  )
  const meta = el(
    'div',
    { class: 'score-meta' },
    el('p', { class: 'score-band' }, report.bandLabel),
    el('p', { class: 'score-summary' }, summaryLine(report))
  )

  const out = [number, meta]

  if (report.strengths.length > 0) {
    const list = el('ul', { class: 'strength-list' })
    for (const s of report.strengths) {
      list.append(el('li', {}, s.message))
    }
    out.push(
      el(
        'div',
        { class: 'score-strengths' },
        el('h3', {}, 'Already agent-ready'),
        list
      )
    )
  }
  return out
}
