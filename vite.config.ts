/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// Absolute paths, so the two entries resolve no matter which directory the
// build is invoked from.
const page = (file: string) => fileURLToPath(new URL(`./${file}`, import.meta.url))

/**
 * The zero-network promise, enforced by the browser instead of asserted by
 * me. `default-src 'none'` covers connect-src, so fetch, XHR, WebSocket and
 * sendBeacon are all refused even if a future dependency tries one. That is
 * the claim this product makes, and now the browser holds it rather than my
 * discipline.
 *
 * style-src carries 'unsafe-inline' because the finding tooltip is positioned
 * at a computed pixel coordinate, which no static stylesheet can express.
 * That is a deliberate, narrow concession: it permits styling, never a
 * request. Scripts stay locked to same-origin with no inline and no eval.
 *
 * Build only. The dev server needs a WebSocket for hot reload, and blocking
 * it would make `npm run dev` noisy for no benefit. Production is where the
 * promise has to hold.
 */
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'"

const cspMeta = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml() {
    return [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend'
      }
    ]
  }
})

export default defineConfig({
  base: '/agent-answer/',
  plugins: [cspMeta()],
  build: {
    target: 'es2022',
    // Single-chunk app: the modulepreload polyfill would be the only
    // fetch() in the bundle. Zero network code is the brand promise.
    modulePreload: { polyfill: false },
    // Two pages, one URL. The product teardown is the front door; the tool
    // is one click away at /tool.html.
    rollupOptions: {
      input: {
        teardown: page('index.html'),
        tool: page('tool.html')
      }
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
