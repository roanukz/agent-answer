/**
 * Render the parsed document from the DocModel — headings styled, lists,
 * tables, and code preserved — with <mark> highlights over every finding
 * span. All content is inserted as text nodes; raw input never reaches
 * innerHTML.
 */

import type {
  Block,
  Report,
  ScoredFinding,
  Section,
  Severity
} from '../engine/types.js'
import { el } from './dom.js'

interface MarkInfo {
  start: number
  end: number
  severity: Severity
  id: string
  message: string
}

const SEV_RANK: Record<Severity, number> = { major: 3, minor: 2, info: 1 }

function topSeverity(marks: MarkInfo[]): Severity {
  return marks.reduce<Severity>(
    (best, m) => (SEV_RANK[m.severity] > SEV_RANK[best] ? m.severity : best),
    'info'
  )
}

/**
 * Wrap the sub-ranges of `text` (which begins at source offset `base`)
 * covered by marks in <mark> elements; everything else becomes plain text.
 */
function renderTextWithMarks(
  text: string,
  base: number,
  marks: MarkInfo[]
): DocumentFragment {
  const frag = document.createDocumentFragment()
  const end = base + text.length
  const local = marks
    .filter((m) => m.start < end && m.end > base)
    .map((m) => ({
      ...m,
      start: Math.max(m.start, base),
      end: Math.min(m.end, end)
    }))
  if (local.length === 0) {
    frag.append(document.createTextNode(text))
    return frag
  }
  const points = new Set<number>([base, end])
  for (const m of local) {
    points.add(m.start)
    points.add(m.end)
  }
  const sorted = [...points].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!
    const b = sorted[i + 1]!
    if (a >= b) continue
    const covering = local.filter((m) => m.start < b && m.end > a)
    const slice = text.slice(a - base, b - base)
    if (covering.length === 0) {
      frag.append(document.createTextNode(slice))
    } else {
      frag.append(
        el(
          'mark',
          {
            class: `sev-${topSeverity(covering)}`,
            'data-fids': covering.map((m) => m.id).join(' '),
            'data-msg': covering.map((m) => m.message).join(' • ')
          },
          slice
        )
      )
    }
  }
  return frag
}

const LIST_MARKER_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)/
const QUOTE_MARKER_RE = /^(\s*>\s?)/
const TABLE_SEP_RE = /^\s*\|?[\s:|-]+\|?\s*$/

interface Line {
  text: string
  start: number
}

function blockLines(block: Block): Line[] {
  const lines: Line[] = []
  let offset = block.span.start
  for (const text of block.text.split('\n')) {
    lines.push({ text, start: offset })
    offset += text.length + 1
  }
  return lines
}

function renderList(block: Block, marks: MarkInfo[]): HTMLElement {
  const ordered = block.type === 'numbered-list'
  const list = el(ordered ? 'ol' : 'ul', {})
  let current: HTMLLIElement | null = null
  for (const line of blockLines(block)) {
    const marker = LIST_MARKER_RE.exec(line.text)
    if (marker) {
      current = el('li', {})
      current.append(
        renderTextWithMarks(
          line.text.slice(marker[1]!.length),
          line.start + marker[1]!.length,
          marks
        )
      )
      list.append(current)
    } else if (current) {
      current.append(document.createTextNode(' '))
      const lead = line.text.length - line.text.trimStart().length
      current.append(
        renderTextWithMarks(line.text.trim(), line.start + lead, marks)
      )
    }
  }
  return list
}

function renderTable(block: Block, marks: MarkInfo[]): HTMLElement {
  const table = el('table', {})
  const lines = blockLines(block).filter((l) => l.text.trim() !== '')
  const hasSeparator = lines.some(
    (l) => TABLE_SEP_RE.test(l.text) && l.text.includes('-')
  )
  let headerDone = !hasSeparator
  for (const line of lines) {
    if (TABLE_SEP_RE.test(line.text) && line.text.includes('-')) continue
    const row = el('tr', {})
    // Split the raw line on '|' while tracking source offsets per cell.
    let cellStart = 0
    const segments: Array<{ text: string; start: number }> = []
    for (let i = 0; i <= line.text.length; i++) {
      if (i === line.text.length || line.text[i] === '|') {
        segments.push({
          text: line.text.slice(cellStart, i),
          start: line.start + cellStart
        })
        cellStart = i + 1
      }
    }
    // Leading/trailing empty segments come from boundary pipes.
    const cells = segments.filter(
      (s, i) => !(s.text.trim() === '' && (i === 0 || i === segments.length - 1))
    )
    for (const cell of cells) {
      const lead = cell.text.length - cell.text.trimStart().length
      row.append(
        el(
          headerDone ? 'td' : 'th',
          {},
          renderTextWithMarks(cell.text.trim(), cell.start + lead, marks)
        )
      )
    }
    table.append(row)
    if (!headerDone) headerDone = true
  }
  return table
}

function renderCode(block: Block): HTMLElement {
  const lines = block.text.split('\n')
  const inner =
    lines.length >= 2 && /^\s*(```|~~~)/.test(lines[lines.length - 1] ?? '')
      ? lines.slice(1, -1)
      : lines.slice(1)
  return el('pre', {}, el('code', {}, inner.join('\n')))
}

function renderBlockquote(block: Block, marks: MarkInfo[]): HTMLElement {
  const quote = el('blockquote', {})
  const para = el('p', {})
  let first = true
  for (const line of blockLines(block)) {
    const marker = QUOTE_MARKER_RE.exec(line.text)
    const contentStart = marker ? marker[1]!.length : 0
    if (!first) para.append(document.createTextNode(' '))
    para.append(
      renderTextWithMarks(
        line.text.slice(contentStart),
        line.start + contentStart,
        marks
      )
    )
    first = false
  }
  quote.append(para)
  return quote
}

function renderBlock(block: Block, marks: MarkInfo[]): HTMLElement {
  switch (block.type) {
    case 'bulleted-list':
    case 'numbered-list':
      return renderList(block, marks)
    case 'table':
      return renderTable(block, marks)
    case 'code':
      return renderCode(block)
    case 'blockquote':
      return renderBlockquote(block, marks)
    default: {
      const p = el('p', {})
      p.append(renderTextWithMarks(block.text, block.span.start, marks))
      return p
    }
  }
}

function renderHeading(section: Section, marks: MarkInfo[]): HTMLElement {
  const level = Math.min(Math.max(section.level, 1), 6)
  const tag = `h${level}` as keyof HTMLElementTagNameMap
  const heading = el(tag as 'h2', {})
  const span = section.headingSpan!
  const covering = marks.filter((m) => m.start < span.end && m.end > span.start)
  if (covering.length === 0) {
    heading.textContent = section.heading ?? ''
  } else {
    heading.append(
      el(
        'mark',
        {
          class: `sev-${topSeverity(covering)}`,
          'data-fids': covering.map((m) => m.id).join(' '),
          'data-msg': covering.map((m) => m.message).join(' • ')
        },
        section.heading ?? ''
      )
    )
  }
  return heading
}

export function renderArticleView(
  report: Report,
  idOf: (f: ScoredFinding) => string
): HTMLElement {
  const marks: MarkInfo[] = report.issues.map((f) => ({
    start: f.span.start,
    end: f.span.end,
    severity: f.severity,
    id: idOf(f),
    message: f.message
  }))

  const doc = el('div', { class: 'article-doc' })
  for (const section of report.doc.sections) {
    if (section.heading !== null && section.headingSpan) {
      doc.append(renderHeading(section, marks))
    }
    for (const block of section.blocks) {
      doc.append(renderBlock(block, marks))
    }
  }

  const wrap = el('div', {})
  wrap.append(
    el('h2', { class: 'article-view-title' }, 'Your article, as an agent sees it'),
    doc
  )
  return wrap
}

/** Scroll to a finding's first mark and flash every mark that carries it. */
export function focusFinding(container: HTMLElement, findingId: string): void {
  const markEls = container.querySelectorAll<HTMLElement>(
    `mark[data-fids~="${findingId}"]`
  )
  if (markEls.length === 0) return
  markEls[0]!.scrollIntoView({ behavior: 'smooth', block: 'center' })
  for (const m of markEls) {
    m.classList.remove('flash')
    // Restart the animation even when the class was just present.
    void m.offsetWidth
    m.classList.add('flash')
  }
}

/** Tooltip on hover/tap of a mark. */
export function attachMarkTooltip(container: HTMLElement): void {
  const tooltip = document.getElementById('mark-tooltip')
  if (!tooltip) return

  const show = (mark: HTMLElement) => {
    tooltip.textContent = mark.getAttribute('data-msg') ?? ''
    tooltip.hidden = false
    const rect = mark.getBoundingClientRect()
    const top = rect.bottom + window.scrollY + 6
    let left = rect.left + window.scrollX
    tooltip.style.top = `${top}px`
    tooltip.style.left = '0px'
    const width = tooltip.offsetWidth
    const max = document.documentElement.clientWidth - width - 12
    if (left > max) left = Math.max(12, max)
    tooltip.style.left = `${left}px`
  }

  container.addEventListener('mouseover', (e) => {
    const mark = (e.target as HTMLElement).closest('mark')
    if (mark) show(mark as HTMLElement)
  })
  container.addEventListener('mouseout', (e) => {
    if ((e.target as HTMLElement).closest('mark')) tooltip.hidden = true
  })
  container.addEventListener('click', (e) => {
    const mark = (e.target as HTMLElement).closest('mark')
    if (mark) {
      show(mark as HTMLElement)
      window.setTimeout(() => {
        tooltip.hidden = true
      }, 2500)
    }
  })
}
