---
# world-cup-simulator-6tmq
title: Deploy app to GitHub Pages via GitHub Actions
status: completed
type: task
priority: normal
created_at: 2026-06-17T07:20:34Z
updated_at: 2026-06-17T07:22:19Z
---

Add a GitHub Actions workflow that builds the Vite app and deploys it to GitHub Pages. Configure Vite base path for the project subpath.

## Summary of Changes

- Added `.github/workflows/deploy.yml` (build on push to main + workflow_dispatch, deploy dist via official Pages actions).
- Set `base: '/world-cup-simulator/'` in vite.config.ts.
- Enabled Pages with source = GitHub Actions via API.
- PR: https://github.com/rodrigoluizs/world-cup-simulator/pull/12
