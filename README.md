# Will My Agent Answer This?

**A Knowledge-Base AI-Readiness Linter.** Paste a support/KB article and get
a 0–100 "agent-answerability" score with an explainable checklist of why an
AI agent (a RAG chatbot) would or wouldn't be able to answer from it —
plus inline highlights of every failing passage.

Free · No account · No telemetry · 100% client-side.

## Two pages, one URL

| Path | What it is |
| --- | --- |
| `index.html` | The **product teardown** — the essay documenting the problem, the evidence, the gap analysis, the decisions and the kill list. This is the front door. |
| `tool.html` | The **tool** itself. |

Deployed: `roanukz.github.io/agent-answer/` (teardown) and
`roanukz.github.io/agent-answer/tool.html` (tool). Both pages share
`src/tokens.css`, so the essay and the thing it describes read as one
product.

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
−0; only the first three findings per rule count; 85+ is agent-ready,
**and no article is agent-ready with any single check below 60**. Same
input, same score, always.

That floor is not decoration. Without it the weighted average certifies
articles it should refuse: the 15%-weight check driven to 0 with the
other four perfect scores exactly 85.0 and used to pass, while the same
collapse on the 25% check scores 81.25 and fails. Whether a failed check
sank an article depended only on which check it was. The three cases are
pinned as unit tests in `tests/score.test.ts`. The result header shows
the weakest check beside the composite every time.

### Sections, and the pieces they are delivered in

Twenty-three of the 25 rules score the heading sections you wrote. Two
score the *pieces* the retrieval software would deliver, which is not the
same thing: a long, perfectly self-contained section is exactly the one
that gets split again. Those boundaries are computed with Moveworks'
published snippetization algorithm — one vendor's documented behavior,
labeled as such everywhere it appears, not an industry standard — and
drawn onto the pasted article. Token counts are an estimate at four
characters per token, never a tokenizer, and the 512-token maximum and
500-character chat cutoff are Moveworks' own published numbers.

## Privacy promise — and how to verify it

Your text never leaves the browser. There is no server, no account, no
analytics, no external font or script — the analysis is plain TypeScript
running on your machine. The same rule binds the teardown page: no
external fonts, scripts, analytics or images, and the Open Graph card is
a file in this repo.

To verify: load the page, **turn off Wi-Fi**, paste an article, and
analyze. Everything works. You can also open the browser's network tab
(after the initial page load there are zero requests) or grep the built
bundle, where `fetch(`, `XMLHttpRequest` and `sendBeacon` do not appear.

The built pages also carry a strict content security policy, injected at
build time by a plugin in `vite.config.ts`:

```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; base-uri 'none'; form-action 'none'
```

`default-src 'none'` covers `connect-src`, so the browser refuses every
outbound request even if a future dependency attempts one. Paste
`fetch('https://example.com')` into the console on the live site and it
is blocked. `style-src` allows inline styles because the finding tooltip
is positioned at a computed pixel coordinate; it permits styling, never a
request. It is build-only, because the dev server needs a WebSocket for
hot reload.

## Local development

```bash
npm install
npm run dev      # dev server
npm test         # vitest (engine, rules, parser, scoring, paste, fixtures)
npm run build    # typecheck + production build to dist/
npm run smoke    # score both test fixtures from Node and print the results
```

The analysis engine (`src/engine/`) is pure, DOM-free TypeScript — every
rule is a small module with its own unit tests in `tests/rules/`. The
build has two entries (`index.html`, `tool.html`), wired in
`vite.config.ts`.

### The share card

`og-image.svg` is the source; `public/og-image.png` is what ships, at
2400×1254 — twice the 1200×627 Open Graph size, because a 1× asset is
scaled up on high-DPI screens and visibly softens. The
`og:image:width` / `og:image:height` tags must match whatever is
committed. To regenerate after editing the SVG, render at 4× and
downsample — supersampling gives noticeably cleaner edges:

```bash
soffice --headless --convert-to 'png:draw_png_Export:{"PixelWidth":{"type":"long","value":4800},"PixelHeight":{"type":"long","value":2508}}' --outdir /tmp/og og-image.svg && sips -z 1254 2400 /tmp/og/og-image.png --out public/og-image.png
```

The UI uses the same token-based design system as
[Save the Dates](https://github.com/Roanukz): cool gray neutrals, an
anodized teal primary, semantic color ramps, and system fonts only. The
portable core lives in `src/tokens.css`; application styles read role
tokens, never raw ramp values.

## Deploying

Pushing to `main` runs tests, builds, and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. One-time setup: in the repo settings,
set **Pages → Source** to **"GitHub Actions"**. The Vite `base` is
`/agent-answer/`, which must match the repo name; change it in
`vite.config.ts` if the repo is named differently.

## v2 roadmap

- DOCX/HTML ingestion
- Batch mode
- Local-embedding semantic self-containment check (in-browser, still no
  server) — re-scored down the list, because the concrete insight it was
  meant to deliver turned out to be a character count

The teardown's [RICE table](index.html) is the current, prioritized
version of this list. Every source quoted in the teardown was re-checked
at its own page in August 2026.

## Non-goals

No accounts. No telemetry. No server. No auto-rewrite — the tool tells
you exactly what to fix and why, but the words stay yours.
