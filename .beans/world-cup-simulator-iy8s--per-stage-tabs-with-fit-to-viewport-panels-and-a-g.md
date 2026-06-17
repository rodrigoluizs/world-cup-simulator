---
# world-cup-simulator-iy8s
title: Per-stage tabs with fit-to-viewport panels and a goal-by-goal final reveal
status: completed
type: feature
priority: normal
created_at: 2026-06-17T04:57:51Z
updated_at: 2026-06-17T05:39:31Z
---

The tournament view should let users browse every stage without ever scrolling on desktop, and the final should feel dramatic. Today the app uses a group/knockout tab split with a champion rail. This feature reorganizes the layout into a single horizontal tab strip with one entry per stage (group stage as one or a few tabs, then Round of 32, Round of 16, Round of 8, Semifinals, Third Place, Final), where each panel is sized to fit the desktop viewport with no scrolling. The Final tab plays the championship match goal-by-goal with a live match-minute counter (0-90 plus extra time), then reveals the champion inline.

**Notes:**
- Approach A chosen: stage tabs with fit-to-viewport panels and free navigation; finale lives inside the Final tab.
- Unified tab strip replaces the current group/knockout split; group stage gets its own tab(s) within the same strip.
- No-scroll is desktop-first; small screens may fall back to a sensible scrollable layout.
- Active tab auto-advances to the latest simulated stage, but every tab stays clickable at any time.
- Goal-by-goal animation and minute counter are specific to the Final; other matches can resolve as they do today.
- Champion reveal should have a celebratory flourish and happen after the final's animation completes.

## High-Level Plan

**Approach** — Replace the current group/knockout tab split with a single horizontal tab strip that has one tab per tournament stage, each rendering a panel sized to fit the desktop viewport without scrolling. The Final tab additionally drives a dramatic finale: the championship match plays out goal-by-goal with a running match-minute counter, ending in an inline champion reveal. This is the lowest-friction evolution of the existing tabbed UI and keeps the finale where users expect it.

**Steps**
- Reorganize the tournament view into one unified tab strip covering every stage (group stage plus each knockout round), with the active tab auto-advancing to the latest simulated stage while remaining freely clickable.
- Make each stage panel fit the desktop viewport so no vertical scrolling is needed; condense match presentation as required to fit the stage with the most matches.
- Give the group stage its own tab(s) inside the same strip, presented compactly enough to fit without scrolling on desktop.
- Build the Final tab finale: animate the championship match goal-by-goal driven by a match-minute counter that runs 0-90 and into extra time when applicable.
- Reveal the champion with a celebratory flourish inline on the Final tab once the final's animation completes.
- Provide a graceful fallback to a scrollable layout on small/short screens where fit-to-viewport is not achievable.

**Acceptance Criteria**
- On a typical desktop viewport, every stage tab can be viewed in full without vertical scrolling, including the stage with the most matches.
- The tab strip shows one tab per stage (group stage plus Round of 32, Round of 16, Round of 8, Semifinals, Third Place, Final) and the user can switch to any tab at any time.
- As the tournament simulates, the active tab automatically advances to the most recently completed/available stage, without preventing manual tab switching.
- Opening the Final tab plays the championship match goal-by-goal with a visible match-minute counter that progresses through 0-90 and into extra time when the score requires it.
- After the final's animation finishes, the champion is revealed with a clear celebratory flourish.
- On viewports too small/short to fit a stage, the layout falls back to scrollable content rather than clipping or hiding matches.

**Non-Goals**
- Goal-by-goal animation for any match other than the Final.
- Guaranteed no-scroll on mobile/phone viewports (desktop-first only).
- A full-screen finale takeover or overlay decoupled from the Final tab.
- Changes to the underlying match simulation logic or how non-final results are produced.

## Refined Plan

### Files to change
- src/main.ts:25-59 — replace the static two-button `tab-bar` + two `tab-panel`s with a dynamically built per-stage tab strip (Group Stage + one tab per `ROUND_ORDER` round) and a matching panel per stage; keep the bracket render container and add an inline champion area on the Final panel.
- src/main.ts:83-104 — generalize `setActiveTab('groups'|'knockouts')` into `setActiveStage(stage)` over all tabs; in `startKnockoutPhase`, pass the Final panel as `finalContainer`, wire `onRoundChange` to auto-advance the active tab, and render the champion inline on the Final panel instead of the separate rail.
- src/main.ts:140-156 — extend the tab click wiring to every stage tab (enable each as its round becomes available); keep the groups-grid replay reset working with the new per-stage tabs/panels.
- src/app.ts:222-292 — extend `KnockoutOptions` (add `onRoundChange`, `finalContainer`); in `step()`, fire `onRoundChange` when `knockout.currentRound()` changes; special-case the `F` round to play the goal-by-goal final (build timeline, tick the minute counter, reveal goals) before calling `onChampion`. Non-final ties reveal exactly as today.
- src/render/bracket.ts:20-90 — add helpers to render the live final scoreboard + minute counter and to flash goals during the final, plus retarget `renderChampion` to an inline celebratory flourish in the Final panel; keep `renderBracket`/`revealTie`/`revealRound` (unique `#tie-<round>-<index>` ids stay valid across panels).
- src/sim/final-timeline.ts:NEW — pure, RNG-injectable builder that turns the final `TieResult` into a goal-by-goal playback script (needed so the finale is deterministic and unit-testable; mirrors `intervalForSpeed`/`isComplete`).
- src/style.css:128-160 — restyle `.tab-bar`/`.tab-btn` for a wider per-stage strip (wrap/scroll the strip itself on narrow widths).
- src/style.css:433-595 — fit-to-viewport stage panels (height-bounded via `dvh`), a compact dense layout for the 16-tie Round of 32, the live final minute counter, an enhanced champion flourish, and keep the `@media (max-width:900px)` scrollable fallback.
- src/sim/final-timeline.test.ts:NEW — Vitest coverage for the pure timeline builder.

### New signatures
- buildFinalTimeline(result: TieResult, rng?: Rng): FinalTimeline — deterministic goal minutes, extra-time flag, running score
- interface FinalTimeline { goals: FinalGoalEvent[]; extraTime: boolean; finalMinute: number } — the final's playback script
- interface FinalGoalEvent { minute: number; side: 'home' | 'away'; homeScore: number; awayScore: number } — one goal at a minute
- renderFinalStage(container: HTMLElement, tie: Tie): void — build final scoreboard + minute counter DOM
- tickFinalMinute(container: HTMLElement, minute: number): void — update the live 0–90(+ET) counter
- revealFinalGoal(container: HTMLElement, goal: FinalGoalEvent): void — flash a goal and update the score
- setActiveStage(stage: 'groups' | KnockoutRound): void — switch active tab/panel for any stage (main.ts)
- KnockoutOptions.onRoundChange?(round: KnockoutRound): void — auto-advance the active stage tab
- KnockoutOptions.finalContainer?: HTMLElement — where the goal-by-goal final plays

### Test sketch
- buildFinalTimeline distributes all goals — 3–1 result → exactly 4 goals (3 home, 1 away), final running score 3–1
- buildFinalTimeline orders goals chronologically — minutes non-decreasing, each within 1..finalMinute
- buildFinalTimeline adds extra time on tiebreak — decidedByTiebreak=true → extraTime true and finalMinute > 90
- buildFinalTimeline uses regulation when decisive — decidedByTiebreak=false → extraTime false, finalMinute === 90
- buildFinalTimeline is deterministic under seeded rng — same `seq([...])` Rng → identical timeline
- buildFinalTimeline handles a goalless tiebreak — 0–0 + decidedByTiebreak → no goals, extraTime true (edge case)

## Implementation Log

**Branch:** feat/world-cup-simulator-iy8s-per-stage-tabs-fit-to-viewport-final-reveal

**Commits:**
- b3aa9ca — feat(sim): add buildFinalTimeline for goal-by-goal final playback script
- 33726ec — feat(render): export ROUND_LABELS, add per-round and live final-stage renderers
- 0629da3 — feat(app,main): per-stage tabs, containerForRound, goal-by-goal finale wiring
- 57afdec — feat(style): fit-to-viewport knockout panels, scrollable group stage, live final + inline champion
- 8266f5f — feat(app,render): auto-scroll group stage and keep final scoreboard + goal feed on champion reveal

**Final test status:** PASS  (npm run build + npm test — 38 tests, 7 files green)

## Summary of Changes

- Added `buildFinalTimeline` (`src/sim/final-timeline.ts`) — a pure, RNG-injectable builder that turns the final `TieResult` into a deterministic goal-by-goal script (minutes, running score, extra-time flag). Covered by 8 unit tests.
- `src/render/bracket.ts`: exported `ROUND_LABELS`; added `renderSingleRound` (per-stage panel), `renderFinalStage` / `tickFinalMinute` / `revealFinalGoal` (live scoreboard + minute counter + goal feed) and `revealFinalChampion` (inline crown that keeps the scoreboard and feed on screen).
- `src/app.ts`: `startKnockout` now renders each round into its own container (`containerForRound`), fires `onRoundChange` to auto-advance the active tab, and special-cases the Final to play goal-by-goal via the timeline before crowning the champion. Group simulation gained an `autoScroll` option (driven by the first group) so the group stage scrolls to follow the matches being revealed.
- `src/main.ts`: rebuilt the tab strip to one tab per stage (Group Stage + R32/R16/QF/SF/3P/F) with a generalized `setActiveStage`, per-stage panels, auto-advance wiring, and a preserved replay reset.
- `src/style.css`: knockout round panels and the final are bounded to the viewport (no scroll); the group stage keeps its full vertical view (standings included) and scrolls within its tab; live final scoreboard, minute counter (with FT marker), goal feed, and a gold inline champion banner; small-viewport fallback restores scrolling.

**Acceptance Criteria** were exercised by the goal-by-goal/extra-time tests on `buildFinalTimeline` and verified in-browser: per-stage tabs present and clickable, active tab auto-advances, each knockout round fits the viewport without scrolling, the Final plays goal-by-goal with a 0–90(+ET) counter, and the champion is revealed with a celebratory flourish while the scoreboard and goal feed remain visible. (Note: per user feedback during implementation, the original "group stage must also fit without scrolling" was revised to "group stage keeps its full scrollable vertical view with auto-scroll".)
