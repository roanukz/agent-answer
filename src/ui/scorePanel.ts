import type { Band, Report } from '../engine/types.js'
import { el } from './dom.js'
import { icon, type IconName } from './icons.js'
import { summaryLine } from './format.js'

const BAND_ICON: Record<Band, IconName> = {
  'agent-ready': 'success',
  'needs-edits': 'warning',
  struggle: 'error'
}

export function renderScorePanel(report: Report): HTMLElement[] {
  const meter = el('div', { class: 'score-meter' })
  meter.append(
    el('div', {
      class: 'score-meter-fill',
      style: `width: ${Math.max(0, Math.min(100, report.overall))}%`
    })
  )
  const hero = el(
    'div',
    { class: 'score-hero' },
    el('div', { class: 'score-number' }, String(report.overall), el('small', {}, ' / 100')),
    meter
  )

  const band = el('p', { class: `score-band band-${report.band}` })
  band.append(icon(BAND_ICON[report.band]), document.createTextNode(report.bandLabel))

  const meta = el(
    'div',
    { class: 'score-meta' },
    band,
    el('p', { class: 'score-summary' }, summaryLine(report))
  )

  const out = [hero, meta]

  if (report.strengths.length > 0) {
    const list = el('ul', { class: 'strength-list' })
    for (const s of report.strengths) {
      const li = el('li', {})
      li.append(icon('success'), document.createTextNode(s.message))
      list.append(li)
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
