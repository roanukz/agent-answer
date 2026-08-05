/**
 * UI wiring only — all analysis lives in src/engine/ (pure, DOM-free).
 */

import './styles.css'
import { analyze } from './engine/analyze.js'
import type { Report, ScoredFinding } from './engine/types.js'
import { countWords, looksNonEnglish } from './engine/textUtils.js'
import { attachPasteHandler } from './paste.js'
import { el, clear } from './ui/dom.js'
import { showToast } from './ui/toast.js'
import { renderScorePanel } from './ui/scorePanel.js'
import { renderFixList } from './ui/fixList.js'
import { renderCheckCards } from './ui/checkCards.js'
import {
  attachMarkTooltip,
  focusFinding,
  renderArticleView
} from './ui/articleView.js'
import { buildMarkdownReport } from './ui/reportMarkdown.js'
import sampleArticle from '../tests/fixtures/bad-article.md?raw'

const LARGE_ARTICLE_WORDS = 50_000

const editor = document.getElementById('editor') as HTMLTextAreaElement
const analyzeBtn = document.getElementById('analyze') as HTMLButtonElement
const loadSampleBtn = document.getElementById('load-sample') as HTMLButtonElement
const backBtn = document.getElementById('back') as HTMLButtonElement
const copyBtn = document.getElementById('copy-report') as HTMLButtonElement
const inputView = document.getElementById('input-view') as HTMLElement
const resultsView = document.getElementById('results-view') as HTMLElement
const noticesHost = document.getElementById('results-notices') as HTMLElement
const scoreHost = document.getElementById('score-panel') as HTMLElement
const fixHost = document.getElementById('fix-list') as HTMLElement
const cardsHost = document.getElementById('check-cards') as HTMLElement
const articleHost = document.getElementById('article-view') as HTMLElement

let currentReport: Report | null = null
let pasteToastShown = false

/* ---------- input state ---------- */

function syncAnalyzeButton(): void {
  analyzeBtn.disabled = editor.value.trim() === ''
}

editor.addEventListener('input', syncAnalyzeButton)
syncAnalyzeButton()

attachPasteHandler(editor, () => {
  if (pasteToastShown) return
  pasteToastShown = true
  showToast('Formatting captured — headings detected from the page you copied.')
})

loadSampleBtn.addEventListener('click', () => {
  editor.value = sampleArticle
  syncAnalyzeButton()
  editor.focus()
})

/* ---------- analyze flow ---------- */

function notice(kind: 'info' | 'warn', text: string): HTMLElement {
  return el('div', { class: `notice notice-${kind}` }, text)
}

analyzeBtn.addEventListener('click', () => {
  const source = editor.value
  if (source.trim() === '') return

  inputView.hidden = true
  resultsView.hidden = false
  clear(noticesHost)
  clear(scoreHost)
  clear(fixHost)
  clear(cardsHost)
  clear(articleHost)

  const isLarge = countWords(source) > LARGE_ARTICLE_WORDS
  if (isLarge) {
    noticesHost.append(
      notice('info', 'Large article — analysis may take a few seconds.')
    )
  }
  // Let the notice paint before the (synchronous) analysis runs.
  window.setTimeout(() => runAnalysis(source), isLarge ? 50 : 0)
})

function runAnalysis(source: string): void {
  const report = analyze(source)
  currentReport = report

  const ids = new Map<ScoredFinding, string>()
  report.issues.forEach((f, i) => ids.set(f, `f${i}`))
  const idOf = (f: ScoredFinding): string => ids.get(f) ?? ''
  const goTo = (id: string) => focusFinding(articleHost, id)

  if (looksNonEnglish(source)) {
    noticesHost.append(
      notice('warn', 'Heuristics are tuned for English — scores may be unreliable.')
    )
  }
  if (report.doc.headingsInferred) {
    noticesHost.append(
      notice(
        'info',
        'No markdown headings found — I guessed the section boundaries. Add # headings for a more accurate score.'
      )
    )
  }

  scoreHost.append(...renderScorePanel(report))
  const fixes = renderFixList(report, idOf, goTo)
  fixHost.hidden = fixes.length === 0
  fixHost.append(...fixes)
  cardsHost.append(...renderCheckCards(report, idOf, goTo))
  articleHost.append(renderArticleView(report, idOf))
  attachMarkTooltip(articleHost)
  window.scrollTo({ top: 0 })
}

/* ---------- results actions ---------- */

backBtn.addEventListener('click', () => {
  resultsView.hidden = true
  inputView.hidden = false
  editor.focus()
})

copyBtn.addEventListener('click', async () => {
  if (!currentReport) return
  try {
    await navigator.clipboard.writeText(buildMarkdownReport(currentReport))
    const original = copyBtn.textContent
    copyBtn.textContent = 'Copied ✓'
    window.setTimeout(() => {
      copyBtn.textContent = original
    }, 1600)
  } catch {
    showToast("Couldn't copy — your browser blocked clipboard access.")
  }
})
