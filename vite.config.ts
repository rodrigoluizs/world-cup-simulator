/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  // Served from https://rodrigoluizs.github.io/world-cup-simulator/
  base: '/world-cup-simulator/',
  test: {
    environment: 'node',
  },
})
