/**
 * Rich-paste capture: when the clipboard carries text/html (copying from a
 * rendered Zendesk / Confluence / ServiceNow page), convert it to markdown
 * so headings, lists, and tables survive the trip into the textarea.
 *
 * Everything runs locally. Page chrome that rides along with copied HTML
 * (script, style, iframe, nav, header, footer, aside) is dropped before
 * conversion.
 *
 * Images are KEPT, as markdown text. They used to be dropped along with the
 * chrome, which quietly made the image-without-alt rule unreachable on the
 * path most authors use: an unlabeled screenshot pasted from a real KB page
 * disappeared before any rule could see it, so the tool advertised a check it
 * could not perform. Keeping `![](src)` costs nothing, because it is inert
 * text: the textarea holds text, the article view builds text nodes rather
 * than elements, and the content security policy allows img-src from this
 * origin only. Nothing is ever fetched.
 */

import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

const STRIP_TAGS = [
  'script',
  'style',
  'iframe',
  'nav',
  'header',
  'footer',
  'aside'
] as const

let service: TurndownService | null = null

function getService(): TurndownService {
  if (service) return service
  service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  })
  service.use(gfm)
  // Defense in depth: DOMParser sanitizing runs first in the browser, but
  // turndown must also drop chrome tags itself so the conversion is safe
  // in any environment (turndown falls back to its own DOM in Node).
  service.remove([...STRIP_TAGS] as Parameters<TurndownService['remove']>[0])
  return service
}

/**
 * Convert clipboard HTML to markdown. Sanitizes with DOMParser when
 * available (browser); otherwise relies on turndown's own removal rules.
 */
export function htmlToMarkdown(html: string): string {
  const svc = getService()
  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    for (const tag of STRIP_TAGS) {
      for (const el of Array.from(parsed.querySelectorAll(tag))) el.remove()
    }
    return svc.turndown(parsed.body).trim()
  }
  return svc.turndown(html).trim()
}

/**
 * Intercept paste events on the textarea. If the clipboard has text/html,
 * convert to markdown and insert at the cursor; otherwise let the default
 * plain-text paste happen. `onConverted` fires after each rich conversion
 * (the UI shows its toast only once).
 */
export function attachPasteHandler(
  textarea: HTMLTextAreaElement,
  onConverted: () => void
): void {
  textarea.addEventListener('paste', (event: ClipboardEvent) => {
    const html = event.clipboardData?.getData('text/html')
    if (!html || html.trim() === '') return
    const markdown = htmlToMarkdown(html)
    if (markdown === '') return
    event.preventDefault()
    const { selectionStart, selectionEnd } = textarea
    textarea.setRangeText(markdown, selectionStart, selectionEnd, 'end')
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    onConverted()
  })
}
