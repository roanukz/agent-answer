# Will My Agent Answer This?

**A Knowledge-Base AI-Readiness Linter.** Paste a support/KB article and get
a 0–100 "agent-answerability" score with an explainable checklist of why an
AI agent (a RAG chatbot) would or wouldn't be able to answer from it —
plus inline highlights of every failing passage.

Free · No account · No telemetry · 100% client-side.

## The manual test this automates

Teams rewriting their knowledge bases to be "AI-ready" are told to test
every article by hand: *pull a paragraph out, read it cold, rewrite if it
fails — for every paragraph*. An AI agent retrieves individual sections,
not whole articles, so any section that only makes sense in context will
be retrieved alone and misread alone. This tool runs that
read-it-cold test automatically, with deterministic rules instead of
vibes: self-contained sections, answer-first openings, unresolved
references, one idea per section, and parseable structure.

## How scoring works

Every rule, its exact deduction, and the retrieval principle behind it is
documented in the in-app **"How scoring works"** section at the bottom of
the page — transparency is the product's core trust feature. In short:
five weighted checks, each starting at 100; majors −25, minors −10, info
−0; only the first three findings per rule count; 85+ is agent-ready.
Same input, same score, always.

## Privacy promise — and how to verify it

Your text never leaves the browser. There is no server, no account, no
analytics, no external font or script — the analysis is plain TypeScript
running on your machine.

To verify: load the page, **turn off Wi-Fi**, paste an article, and
analyze. Everything works. You can also open the browser's network tab —
after the initial page load there are zero requests — or grep the built
bundle: `fetch(`, `XMLHttpRequest`, and `sendBeacon` do not appear in
`dist/`.

## Local development

```bash
npm install
npm run dev      # dev server
npm test         # vitest (engine, rules, parser, scoring, paste, fixtures)
npm run build    # typecheck + production build to dist/
npm run smoke    # score both test fixtures from Node and print the results
```

The analysis engine (`src/engine/`) is pure, DOM-free TypeScript — every
rule is a small module with its own unit tests in `tests/rules/`.

The UI uses the same token-based design system as
[Save the Dates](https://github.com/Roanukz): cool grey neutrals, an
anodised teal primary, semantic colour ramps, and system fonts only. The
portable core lives in `src/tokens.css`; application styles read role
tokens, never raw ramp values.

## Deploying

Pushing to `main` runs tests, builds, and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. One-time setup: in the repo settings,
set **Pages → Source** to **"GitHub Actions"**. The Vite `base` is
`/will-my-agent-answer-this/`; change it in `vite.config.ts` if your repo
name differs.

## v2 roadmap

- Local-embedding semantic self-containment check (in-browser, still no
  server)
- DOCX/PDF ingestion
- Batch mode

## Non-goals

No accounts. No telemetry. No server. No auto-rewrite — the tool tells
you exactly what to fix and why, but the words stay yours.
