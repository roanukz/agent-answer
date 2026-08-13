import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/link-in-heading'

describe('link-in-heading', () => {
  it('flags a markdown link inside a heading', () => {
    const src = `## See the [remote access policy](https://intranet.example/policy)\n\nThe policy is reviewed each quarter.\n`
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('link-in-heading')
    expect(f.checkId).toBe('structure')
    expect(f.severity).toBe('minor')
    expect(f.whyItMatters).toContain('not to put hyperlinks in headings')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      '## See the [remote access policy](https://intranet.example/policy)'
    )
  })

  it('flags a bare URL in a heading', () => {
    const src =
      '## Policy at https://intranet.example/policy\n\nReviewed quarterly.\n'
    expect(rule.run(parse(src))).toHaveLength(1)
  })

  it('near-miss: a link in the body is exactly where it belongs', () => {
    const src = `## Remote access policy\n\nThe [policy](https://intranet.example/policy) is reviewed each quarter.\n`
    expect(rule.run(parse(src))).toEqual([])
  })

  it('near-miss: brackets in a heading that are not a link', () => {
    const src = '## Reset [beta] tokens\n\nThe beta programme ends in March.\n'
    expect(rule.run(parse(src))).toEqual([])
  })
})
