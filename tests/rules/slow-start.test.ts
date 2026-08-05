import { describe, expect, it } from 'vitest'
import { parse } from '../../src/engine/parse'
import rule from '../../src/engine/rules/slow-start'

/** 70 words; no sentence starts with an imperative; the first sentence
 *  never mentions "webhook" or "retries". */
const SLOW_PARA =
  'When an endpoint responds with an error, the delivery system schedules another attempt using an exponential backoff schedule. ' +
  'Each subsequent attempt waits longer than the previous one, and the interval doubles until a maximum of six hours is reached. ' +
  'After twenty-four hours of continued failures, the delivery is marked as dead and no further attempts occur, although the payload remains available for manual replay from the dashboard for seven days.'

describe('slow-start', () => {
  it('flags a long opening paragraph that never restates the heading topic', () => {
    const src = `# Webhooks\n\nDeliveries and retry behavior are described below.\n\n## Webhook retries\n\n${SLOW_PARA}\n`
    const doc = parse(src)
    const findings = rule.run(doc)
    expect(findings).toHaveLength(1)
    const f = findings[0]!
    expect(f.ruleId).toBe('slow-start')
    expect(f.checkId).toBe('answer-first')
    expect(f.severity).toBe('minor')
    expect(f.sectionHeading).toBe('Webhook retries')
    expect(doc.source.slice(f.span.start, f.span.end)).toBe(SLOW_PARA)
  })

  it('stays quiet when the first sentence mentions a heading content word', () => {
    const para = SLOW_PARA.replace(
      'the delivery system schedules',
      'the webhook delivery system schedules'
    )
    const src = `## Webhook retries\n\n${para}\n`
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('matches heading words case-insensitively as whole words', () => {
    const para = SLOW_PARA.replace(
      'When an endpoint responds',
      'When an endpoint behind a Webhook responds'
    )
    const src = `## webhook retries\n\n${para}\n`
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('stays quiet when any sentence in the paragraph is an instruction', () => {
    const para = `${SLOW_PARA} Review the delivery log to confirm each attempt.`
    const src = `## Webhook retries\n\n${para}\n`
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('stays quiet for opening paragraphs of 60 words or fewer', () => {
    const shortPara =
      'When an endpoint responds with an error, the delivery system schedules another attempt using an exponential backoff schedule. ' +
      'Each subsequent attempt waits longer than the previous one, and the interval doubles until a maximum of six hours is reached.'
    const src = `## Webhook retries\n\n${shortPara}\n`
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('only applies when the first block is a paragraph', () => {
    const src = `## Webhook retries\n\n- attempts back off exponentially\n- deliveries die after one day\n\n${SLOW_PARA}\n`
    expect(rule.run(parse(src))).toHaveLength(0)
  })

  it('skips the implicit introduction section', () => {
    const src = `${SLOW_PARA}\n\n# Reference\n\nDetails follow.\n`
    expect(rule.run(parse(src))).toHaveLength(0)
  })
})
