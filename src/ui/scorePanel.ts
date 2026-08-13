import type { Band, CheckStatus, Report } from '../engine/types.js'
import { CHECK_FLOOR } from '../engine/score.js'
import { el } from './dom.js'
import { icon, type IconName } from './icons.js'
import { summaryLine } from './format.js'

const BAND_ICON: Record<Band, IconName> = {
  'agent-ready': 'success',
  'needs-edits': 'warning',
  struggle: 'error'
}

const STATUS_ICON: Record<CheckStatus, IconName> = {
  pass: 'success',
  'needs-work': 'warning',
  fail: 'error'
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: 'pass',
  'needs-work': 'needs work',
  fail: 'fail'
}

/**
 * The weakest check, shown next to the composite every time rather than
 * only when it is bad. A composite is an average, and an average hides the
 * one collapsed dimension that decides whether an agent can answer.
 */
function weakestRow(report: Report): HTMLElement {
  const check = report.weakestCheck
  const row = el(
    'p',
    { class: 'score-weakest' },
    el('span', { class: 'score-weakest-label' }, 'Weakest check'),
    el('span', { class: 'score-weakest-name' }, check.def.name),
    el('span', { class: 'score-weakest-num' }, `${check.score} / 100`),
    el(
      'span',
      { class: `chip chip-${check.status}` },
      icon(STATUS_ICON[check.status]),
      STATUS_LABEL[check.status]
    )
  )
  return row
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
    weakestRow(report),
    el('p', { class: 'score-summary' }, summaryLine(report))
  )

  const out = [hero, meta]

  if (report.floored) {
    out.push(
      el(
        'p',
        { class: 'score-floor-note' },
        icon('warning'),
        `Scored ${report.overall}, but not agent-ready: ${report.weakestCheck.def.name} is at ${report.weakestCheck.score}, below the floor of ${CHECK_FLOOR}. One check this far down decides the answer on its own, whatever the average says.`
      )
    )
  }

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
