---
# world-cup-simulator-030j
title: Modern tabbed UI with progressive knockout reveal
status: completed
type: feature
priority: normal
created_at: 2026-06-17T04:20:48Z
updated_at: 2026-06-17T04:48:09Z
---

A full overhaul of the World Cup simulator's presentation layer. Today the bracket styling looks dated and every knockout stage is visible at once, which spoils the progression and clutters the screen alongside the group stage. This bean rebuilds the UI around three goals: a modern visual design, a tabbed split between group stage and knockouts, and a progressive reveal where each knockout stage only appears after the previous one has fully played out. The simulation logic itself stays unchanged — this is presentation only.

**Notes:**
- Chosen approach: full UI overhaul (rebuild the presentation/markup structure and styling together, with tabs and progressive reveal as first-class concepts).
- Progressive reveal is driven by the simulation/animation completing on the shared clock — the next stage appears automatically once the current stage's matches have all finished, no user button or fixed timer.
- Tabs: one for group stage, one for knockouts. When the group stage finishes, the view auto-switches to the knockouts tab and the group stage is no longer shown.
- Visual style: full creative freedom for a clean, modern look (typography, spacing, color system, subtle motion).
- Highest-risk option chosen knowingly: largest regression surface against the working simulator. Treat the existing simulation behavior as a hard regression boundary.

## High-Level Plan

**Approach** — Rebuild the presentation layer from the ground up rather than layering on top of existing markup. Introduce a modern, cohesive visual design and structure the view around two first-class concepts: a tabbed split (group stage vs. knockouts) and a stage-by-stage progressive reveal. The simulation engine and its results are reused as-is; only how they are displayed changes.

**Steps**
- Establish a modern visual design foundation — typography, spacing, color system, and motion conventions — applied consistently across the whole app.
- Introduce a two-tab layout: a group-stage tab and a knockouts tab, with clear active-tab indication.
- Auto-switch to the knockouts tab the moment the group stage finishes, and stop presenting the group stage once knockouts begin.
- Rebuild the knockout bracket presentation so each stage (round of 32 → round of 16 → ... → final → champion) is hidden until the previous stage has fully completed on the shared clock, then revealed.
- Tie the reveal trigger to simulation/animation completion of the current stage (no manual control, no fixed delay).
- Preserve the champion finale moment within the new design and reveal sequence.
- Verify the full run end-to-end: group stage plays, tab switches, each knockout stage reveals in order, champion is crowned.

**Acceptance Criteria**
- The app presents a visibly modern design distinct from the current dated styling, applied consistently across group and knockout views.
- The group stage and knockouts live in separate tabs; only one is shown at a time.
- When the group stage completes, the view automatically switches to the knockouts tab and the group stage is no longer displayed.
- A knockout stage's teams/matchups are hidden until the immediately preceding stage has fully finished playing, then appear; this holds for every stage through the final.
- The reveal advances automatically based on simulation/animation completion — no user action and no fixed timer is required.
- The simulation results (group standings, knockout outcomes, champion) are identical to today — no change to who advances or wins (regression-safe).
- The champion finale is preserved and presented within the new design.

**Non-Goals**
- No changes to the simulation logic, match outcomes, or qualification rules.
- No manual "next round" control, replay, or speed controls (reveal is automatic).
- No backend, persistence, or data-source changes (remains a static client-side app).
- No new tournament formats or team data changes.

## Refined Plan

### Files to change
- src/main.ts:25 — replace `app.innerHTML`: wrap `.tournament-layout` and `#knockout` in a tab bar with two panels ("Group Stage" / "Knockouts"); keep `#champion-stage` outside panels.
- src/main.ts:49 — add tab elements/refs and a `setActiveTab(tab)` helper with active-tab indication; default to the group tab.
- src/main.ts:69 — `startKnockoutPhase`: call `setActiveTab('knockouts')` and disable/hide the group tab instead of only `tournamentLayout.hidden = true`; keep controller wiring + champion handling.
- src/main.ts:115 — re-run handler: reset tab state back to group tab when restarting the group phase (regression-safe).
- src/app.ts:248 — `startKnockout` `step()`: after `revealTie`, detect a round boundary via `isLastTieOfRound` and call `revealRound(container, next)` for the following round; only the first round is visible at start.
- src/render/bracket.ts:20 — `renderBracket`: render every round column but mark all rounds except the first as locked/hidden (e.g. `locked` class on `.bracket-round`).
- src/render/bracket.ts:76 — `renderChampion`: align finale markup with the new design; ensure it plays as the last reveal step.
- src/render/bracket.ts:NEW — add `revealRound` to un-hide a round column when the prior stage finishes.
- src/render/graph.ts:37 — `renderGroupGraph`: replace the ring-SVG node/edge graph with a modern match-card/list layout per group; keep one reveal slot per match keyed by index.
- src/render/graph.ts:98 — `revealResult`: fill the redesigned match-card's score slot and toggle revealed/winner state.
- src/sim/bracket.ts:NEW — add pure helpers `nextRound` and `isLastTieOfRound` for stage-boundary detection (kept in the model so they are unit-testable).
- src/style.css:1 — full visual redesign: new `:root` design tokens (type scale, spacing, color system, motion), restyle header/controls, group view, standings, qualification, redesigned match cards, bracket (incl. locked/revealed round states), and champion finale; add tab-bar styles.

### New signatures
- nextRound(round: KnockoutRound): KnockoutRound | null — next round in order, null after the final.
- isLastTieOfRound(bracket: KnockoutState, round: KnockoutRound, index: number): boolean — true when index is the round's final tie.
- revealRound(container: HTMLElement, round: KnockoutRound): void — un-hide the given round's bracket column.
- setActiveTab(tab: 'groups' | 'knockouts'): void — switch visible tab panel and active-tab styling (local to main.ts).

### Test sketch
- nextRound_advances — nextRound('R32') → 'R16'; nextRound('QF') → 'SF'.
- nextRound_endOfBracket — nextRound('F') → null (edge case).
- isLastTieOfRound_true — (R32, index 15) → true (R32 has 16 ties).
- isLastTieOfRound_false — (R32, index 0) → false.
- knockout_results_unchanged — full reveal loop on seeded RNG still yields same champion + totalTies === 32 (regression-safe; mirrors existing bracket.test.ts).

Note: renderers and main.ts remain DOM-untested (no jsdom in repo); behavioral coverage stays on the new pure helpers in sim/bracket.ts, matching the existing test pattern.

## Implementation Log

**Branch:** feat/world-cup-simulator-030j-modern-tabbed-ui-with-progressive-knock

**Commits:**
- c9d9ccd — add nextRound, isLastTieOfRound helpers for stage-boundary detection
- c49acf0 — lock all bracket rounds except R32 on render; add revealRound
- 248ac4a — reveal next bracket round after last tie of each stage completes
- d11959d — replace SVG ring graph with match-card list for group stage
- 7cb1c29 — add tab bar with group/knockout panels and auto-switch on group complete
- 81a8672 — full visual redesign with new design tokens, tab bar, match cards, bracket reveal
- 4841bbb — make tabs clickable and move champion finale to a right-side rail (feedback)
- e3b4ba6 — redesign visual identity to a light, Apple-inspired aesthetic with champion rail (feedback)

**Final test status:** PASS  (30/30 tests, build green)

**Browser-verified:** group stage plays → auto-switch to knockouts → R32→R16→QF→SF reveal in order → champion crowned on the right rail. Tabs switch both ways.

## Summary of Changes

- Added `nextRound` / `isLastTieOfRound` pure helpers for detecting stage boundaries (unit-tested).
- Bracket renderer locks every round except Round of 32; `revealRound` un-hides a round.
- Knockout clock reveals the next round only after the current round's last tie completes.
- Group-stage match graph rebuilt from an SVG ring into a clean match-card list.
- Two-tab layout (Group Stage / Knockouts) with auto-switch when the group stage finishes; both tabs remain clickable so the group results stay reviewable.
- Champion finale moved from the bottom of the page to a prominent sticky right-side rail.
- Full visual identity redesign to a light, Apple-inspired aesthetic (design tokens, pill tabs, soft shadows, rounded cards, SF-style typography).

All Acceptance Criteria were exercised: model helpers covered by 4 new unit tests + the regression test (champion unchanged, totalTies === 32); tabs, progressive reveal, auto-switch, and champion placement were verified end-to-end in the browser.
