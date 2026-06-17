---
# world-cup-simulator-pq8z
title: Center match boxes and stack QF-onwards rounds vertically
status: completed
type: feature
priority: normal
created_at: 2026-06-17T09:10:58Z
updated_at: 2026-06-17T09:20:54Z
---

UX: knockout round panels should center their match boxes horizontally on screen. From quarter-finals onwards (QF, SF, 3P), stack matches vertically instead of laying them out horizontally.

## Summary of Changes
- `.round-panel` switched from a stretch grid to a centered flex row (`justify-content: center`), so match boxes are centered on screen for every round.
- Added `.round-panel--vertical` (applied to QF, SF, 3P) to stack ties in a centered column instead of a horizontal row.
- `main.ts` tags round panels from quarter-finals onwards with the vertical modifier.
