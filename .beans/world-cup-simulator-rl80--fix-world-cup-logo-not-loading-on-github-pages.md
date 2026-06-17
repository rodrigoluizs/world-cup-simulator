---
# world-cup-simulator-rl80
title: Fix World Cup logo not loading on GitHub Pages
status: completed
type: bug
priority: normal
created_at: 2026-06-17T07:54:27Z
updated_at: 2026-06-17T07:56:34Z
---

The in-page header logo uses an absolute path /world-cup-logo.png in src/main.ts. Under the Vite base /world-cup-simulator/ (GitHub Pages), this resolves to the domain root and 404s. Prefix with import.meta.env.BASE_URL so it respects the base path.

## Summary of Changes

- Fixed the in-page header logo in `src/main.ts`: changed the hardcoded absolute `src="/world-cup-logo.png"` to `src="${import.meta.env.BASE_URL}world-cup-logo.png"` so it respects the Vite `base` (`/world-cup-simulator/`) on GitHub Pages. Vite already rewrote the favicon in index.html, but JS string literals are left untouched.
- Verified the production bundle now emits `/world-cup-simulator/world-cup-logo.png`.
- Darkened the top bar (navy `rgba(11,23,49,0.88)`) and switched the title + GitHub link hover to light so the gold trophy stands out.
