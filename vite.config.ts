/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Absolute paths, so the two entries resolve no matter which directory the
// build is invoked from.
const page = (file: string) => fileURLToPath(new URL(`./${file}`, import.meta.url))

export default defineConfig({
  base: '/agent-answer/',
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
