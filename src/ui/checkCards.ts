import type { CheckStatus, Report, ScoredFinding, Severity } from '../engine/types.js'
import { el } from './dom.js'
import { icon, type IconName } from './icons.js'
import { quoteOf } from './format.js'

const STATUS_LABEL: Record<string, string> = {
  pass: 'pass',
  'needs-work': 'needs work',
  fail: 'fail'
}

const STATUS_ICON: Record<CheckStatus, IconName> = {
  pass: 'success',
  'needs-work': 'warning',
  fail: 'error'
}

const SEVERITY_ICON: Record<Severity, IconName> = {
  major: 'error',
  minor: 'warning',
  info: 'info'
}

export function renderCheckCards(
  report: Report,
  idOf: (f: ScoredFinding) => string,
  onFindingClick: (id: string) => void
): HTMLElement[] {
  return report.checks.map((check) => {
    const card = el(
      'article',
      { class: 'card check-card' },
      el(
        'div',
        { class: 'check-head' },
        el('h3', {}, check.def.name),
        el(
          'div',
          { class: 'check-score' },
          el('span', { class: 'check-score-num' }, `${check.score} / 100`),
          el(
            'span',
            { class: `chip chip-${check.status}` },
            icon(STATUS_ICON[check.status]),
            STATUS_LABEL[check.status] ?? check.status
          )
        )
      ),
      el('p', { class: 'check-why' }, check.def.why)
    )

    const issues = check.findings.filter((f) => !f.positive)
    if (issues.length === 0) {
      card.append(
        el(
          'p',
          { class: 'check-clean' },
          icon('success'),
          'Nothing to fix in this check.'
        )
      )
      return card
    }

    for (const f of issues) {
      const top = el(
        'div',
        { class: 'finding-top' },
        el(
          'span',
          { class: `sev sev-${f.severity}` },
          icon(SEVERITY_ICON[f.severity]),
          f.severity
        ),
        el(
          'span',
          { class: 'finding-section' },
          f.docLevel ? 'whole document' : (f.sectionHeading ?? '')
        )
      )
      if (!f.counted) {
        top.append(
          el(
            'span',
            { class: 'uncounted-tag' },
            'not double-counted, same habit'
          )
        )
      }
      const node = el(
        'div',
        { class: 'finding', role: 'button', tabindex: '0' },
        top,
        el('p', { class: 'finding-message' }, f.message),
        el('blockquote', { class: 'finding-quote' }, quoteOf(report, f)),
        el(
          'p',
          { class: 'finding-why' },
          el('strong', {}, 'Why it matters: '),
          f.whyItMatters
        ),
        el(
          'p',
          { class: 'finding-suggestion' },
          el('strong', {}, 'Try instead: '),
          f.suggestion
        )
      )
      const go = () => onFindingClick(idOf(f))
      node.addEventListener('click', go)
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      })
      card.append(node)
    }
    return card
  })
}
