import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The front of the teardown is layered: the lede hooks, the TL;DR answers,
 * the Summary argues, the parts show. Each layer has a length and a shape,
 * and the format is held here rather than remembered.
 */
const PAGE = fileURLToPath(new URL('../index.html', import.meta.url))

describe('front matter', () => {
  const html = () => readFileSync(PAGE, 'utf8')
  const text = (fragment: string) => fragment.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
  const sentences = (s: string) => s.split(/(?<=[.!?])\s+(?=[A-Z"])/).filter(Boolean)
  const section = (id: string) => {
    const m = html().match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))
    expect(m, `section #${id}`).not.toBeNull()
    return m![0]
  }

  it('keeps the lede to the hook: at most three sentences', () => {
    const lede = html().match(/<p class="lede">([\s\S]*?)<\/p>/)
    expect(lede).not.toBeNull()
    expect(sentences(text(lede![1]!)).length).toBeLessThanOrEqual(3)
  })

  it('has a TL;DR that spells out the acronym, stands alone, and fits in thirty seconds', () => {
    const brief = section('tldr')
    expect(brief).toContain('<p class="section-kicker">Thirty seconds</p>')
    expect(brief).toContain('<h2>TL;DR</h2>')
    expect(brief).toMatch(/Too long; didn't read/)
    const body = brief.match(/<p class="brief-body">([\s\S]*?)<\/p>/)
    expect(body).not.toBeNull()
    const plain = text(body![1]!)
    expect(sentences(plain).length).toBeLessThanOrEqual(5)
    expect(plain.split(' ').length).toBeLessThanOrEqual(100)
    expect(body![1]).not.toContain('<a ')
    expect((plain.match(/\d+/g) ?? []).length).toBeLessThanOrEqual(1)
  })

  it('has a Summary with the six leads in scientific-method order', () => {
    const summary = section('summary')
    expect(summary).toContain('<p class="section-kicker">Three minutes</p>')
    const leads = [...summary.matchAll(/<strong>([^<]*)<\/strong>/g)].map((m) => m[1]!.trim())
    expect(leads).toEqual(['The problem.', 'The thesis.', 'The method.', 'The results.', 'What it means.', 'Cautions, and how to check.'])
  })

  it('lists the TL;DR and the Summary in the contents rail as unnumbered front matter', () => {
    const page = html()
    expect(page).toContain('<li><a href="#tldr">TL;DR</a></li>')
    expect(page).toContain('<li><a href="#summary">Summary</a></li>')
  })
})
