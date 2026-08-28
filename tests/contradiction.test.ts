/**
 * The tool must not praise and penalize the same thing at once.
 *
 * strengths celebrates the first table; answer-only-in-table flags a table
 * that carries the answer alone. Both are correct, and delivered together on
 * the same block they read as a contradiction, which is worse than either
 * being absent.
 */
import { describe, expect, it } from 'vitest'
import { analyze } from '../src/engine/analyze'

const TABLE = '| Feature | Soft | Hard |\n| --- | --- | --- |\n| Refresh | Auto | Manual |\n| Replace | Same day | Days |\n'

describe('a table carrying the answer alone', () => {
  const report = analyze(`# Tokens\n\n## Soft against hard\n\nSee below.\n\n${TABLE}`)

  it('is flagged', () => {
    expect(report.issues.map((f) => f.ruleId)).toContain('answer-only-in-table')
  })

  it('is not also celebrated as a strength', () => {
    const flagged = report.issues.find((f) => f.ruleId === 'answer-only-in-table')!
    const praised = report.strengths.some(
      (s) => s.span.start === flagged.span.start && s.span.end === flagged.span.end
    )
    expect(praised).toBe(false)
  })
})

describe('a table that supports a written answer', () => {
  const report = analyze(
    `# Tokens\n\n## Soft against hard\n\nMost people should use the soft token, because it refreshes by itself and the help desk can reissue it the same day. Take the hardware token only where mobile coverage is unreliable.\n\n${TABLE}`
  )

  it('is not flagged', () => {
    expect(report.issues.map((f) => f.ruleId)).not.toContain('answer-only-in-table')
  })

  it('is still celebrated', () => {
    expect(report.strengths.some((s) => s.message.includes('table'))).toBe(true)
  })
})

describe('suppression is surgical', () => {
  it('leaves strengths elsewhere in a flagged section alone', () => {
    // A question-form heading is a strength; the table below it is flagged.
    const report = analyze(`# Tokens\n\n## How do I choose a token?\n\nSee below.\n\n${TABLE}`)
    expect(report.issues.map((f) => f.ruleId)).toContain('answer-only-in-table')
    expect(report.strengths.length).toBeGreaterThan(0)
  })
})
