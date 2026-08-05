/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/will-my-agent-answer-this/',
  build: {
    target: 'es2022',
    // Single-chunk app: the modulepreload polyfill would be the only
    // fetch() in the bundle. Zero network code is the brand promise.
    modulePreload: { polyfill: false }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
