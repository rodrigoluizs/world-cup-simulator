---
# world-cup-simulator-pdc8
title: Last tie of each knockout round never shows its result before tab switches
status: completed
type: bug
priority: high
created_at: 2026-06-17T09:17:09Z
updated_at: 2026-06-17T09:20:54Z
---

In startKnockout's scheduleStep, revealing the last tie of a round advances currentRound() to the next round, so onRoundChange fires synchronously and switches the tab before the user sees the final tie's highlight/score. Defer the tab switch into the timer callback so the last result stays visible for a full interval (mirrors GROUP_FINISH_PAUSE_MS).

## Summary of Changes
- In `startKnockout.scheduleStep`, the `onRoundChange` tab switch is now deferred into the timer callback instead of firing synchronously after the last tie is revealed. The previous round's last tie stays visible (highlight + score) for a full interval before the view jumps to the next round.
