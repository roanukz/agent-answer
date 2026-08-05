/**
 * Node smoke script: score both fixtures and print a compact summary.
 * Run with: npm run smoke
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyze } from '../src/engine/analyze.js'

const here = dirname(fileURLToPath(import.meta.url))
// Compiled to dist-smoke/scripts/, so the project root is two levels up.
const root = join(here, '..', '..')

function report(name: string, file: string): void {
  const source = readFileSync(join(root, 'tests', 'fixtures', file), 'utf8')
  const r = analyze(source)
  console.log(`\n=== ${name} ===`)
  console.log(`score: ${r.overall}  (${r.bandLabel})`)
  console.log(`words: ${r.doc.wordCount}  headings: ${r.doc.headingCount}`)
  for (const c of r.checks) {
    console.log(
      `  ${c.def.name.padEnd(26)} ${String(c.score).padStart(3)}  ${c.status}`
    )
  }
  const byRule = new Map<string, number>()
  for (const f of r.issues) {
    byRule.set(f.ruleId, (byRule.get(f.ruleId) ?? 0) + 1)
  }
  console.log(
    '  issues: ' +
      ([...byRule.entries()].map(([id, n]) => `${id}×${n}`).join(', ') ||
        'none')
  )
  console.log(
    '  strengths: ' + (r.strengths.length > 0 ? r.strengths.length : 'none')
  )
}

report('bad-article', 'bad-article.md')
report('good-article', 'good-article.md')
