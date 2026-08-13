import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/image-without-alt'

const PROSE =
  'Open the identity portal, select Security devices, and choose Reset token. The confirmation prompt appears on your registered phone within a few seconds of the request.'

describe('image-without-alt', () => {
  it('flags an image with empty alt text as a minor when prose surrounds it', () => {
    const doc = parse(
      `## Reset\n\n${PROSE}\n\n![](https://intranet.example/reset.png)\n`
    )
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('image-without-alt')
    expect(f.checkId).toBe('structure')
    expect(f.severity).toBe('minor')
    expect(f.whyItMatters).toContain('no OCR')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(
      '![](https://intranet.example/reset.png)'
    )
  })

  it('raises it to a major when the image is carrying the section alone', () => {
    const doc = parse('## Reset\n\n![](https://intranet.example/reset.png)\n')
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    expect(findings[0]!.severity).toBe('major')
    expect(findings[0]!.message).toContain('no content an agent can read')
  })

  it('near-miss: an image with real alt text is not flagged', () => {
    const doc = parse(
      `## Reset\n\n${PROSE}\n\n![The Reset token button](https://intranet.example/reset.png)\n`
    )
    expect(rule.run(doc)).toEqual([])
  })

  it('near-miss: a link is not an image', () => {
    const doc = parse(
      `## Reset\n\n${PROSE}\n\n[Reset your token](https://intranet.example/reset)\n`
    )
    expect(rule.run(doc)).toEqual([])
  })

  it('flags each alt-less image, in document order', () => {
    const doc = parse(
      `## Reset\n\n${PROSE}\n\n![](https://intranet.example/a.png)\n\n![](https://intranet.example/b.png)\n`
    )
    const findings = rule.run(doc)
    expect(findings).toHaveLength(2)
    expect(findings[0]!.span.start).toBeLessThan(findings[1]!.span.start)
  })
})
