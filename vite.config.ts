/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/will-my-agent-answer-this/',
  build: {
    target: 'es2022'
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
