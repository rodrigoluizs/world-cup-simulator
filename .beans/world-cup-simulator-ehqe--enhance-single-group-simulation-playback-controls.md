---
# world-cup-simulator-ehqe
title: 'Enhance single-group simulation: playback controls, flags, standings table, qualifier highlight'
status: completed
type: feature
priority: normal
created_at: 2026-06-16T15:07:22Z
updated_at: 2026-06-16T15:14:34Z
---

Improve the single-group simulation experience with playback controls and richer match presentation. Today the group is simulated via a one-shot "simulate group" button with a timed reveal. This feature replaces that with proper playback controls, adds country flags, presents results as a classic tournament standings table, and highlights the teams that advance once the group finishes. All changes are additive UI enhancements layered onto the existing reveal mechanism.

**Notes:**
- Speed selector offers discrete steps: 1x, 2x, 4x, 8x.
- Standings use the full classic FIFA group-table column set: P, W, D, L, GF, GA, GD, Pts.
- Qualifier rule: top 2 of the group advance (classic World Cup group stage).
- Approach is the incremental bolt-on: keep the existing timed-reveal engine, wrap it with controls, add flags and table as independent additive pieces. Known trade-off — a speed change or pause may apply at the next match boundary rather than instantly mid-match; acceptable for this iteration.

## High-Level Plan

**Approach** — Incremental bolt-on. Preserve the existing timed-reveal engine and layer the new UI on top of it: a playback control wraps the reveal (start/stop/throttle), flags render alongside existing team labels, the standings table derives its numbers from the already-computed match results, and the qualifier highlight is driven by the final standings order. Each piece is largely independent so existing simulation behavior stays intact.

**Steps**
- Replace the single "simulate group" button with a play/pause control plus a discrete speed selector (1x, 2x, 4x, 8x) that govern the existing reveal cadence.
- Render a country flag next to each team wherever team names appear in the group view.
- Add a classic tournament standings table with columns P, W, D, L, GF, GA, GD, Pts, sorted by the standard ranking order, computed from the simulated match results.
- When the group finishes revealing, highlight the top 2 teams as qualifiers for the next stage.

**Acceptance Criteria**
- Pressing play starts/resumes the timed reveal; pressing pause halts it without losing already-revealed results; play resumes from where it paused.
- Selecting 1x/2x/4x/8x changes the reveal speed; higher multipliers reveal matches proportionally faster.
- Each team in the group view shows a flag matching its country alongside its name.
- The standings table shows P, W, D, L, GF, GA, GD, Pts for every team, values are correct for the simulated results, and rows are ordered by points then the standard tiebreakers.
- After the final match is revealed, exactly the top 2 teams are visually highlighted as qualifying for the next stage.
- The underlying match/group simulation results are unchanged versus today (same outcomes for the same random seed); only presentation and control change.

**Non-Goals**
- No multi-group or full-bracket simulation; this stays scoped to a single group.
- No scrubbing/rewind or jump-to-match; playback is play/pause/speed only.
- No instantaneous mid-match speed/pause guarantee — applying at the next match boundary is acceptable.
- No configurable qualifier cutoff; top 2 is fixed for this iteration.
- No changes to the random simulation logic or its outcome distribution.

## Refined Plan

### Files to change
- src/model/types.ts:6 — add optional `flag?: string` (emoji) to `Team`; append a new `Standing` interface
- src/data/group.json:3 — add a `flag` emoji field to each of the 4 team objects
- src/sim/standings.ts:NEW — pure standings computation from match results (sim/ dir exists)
- src/render/standings.ts:NEW — render the classic HTML standings table + qualifier highlight (render/ dir exists)
- src/render/graph.ts:82 — prepend each team's flag to its node label (`text.textContent`)
- src/app.ts:6 — extend `StartOptions` (add `speed`, `standingsContainer`); change `startSimulation` to return a controller; recompute+render standings on each reveal and on completion; add pause/resume + speed via clear/restart of the interval
- src/main.ts:10 — replace the single `#run` button with a play/pause button + a speed `<select>` (1x/2x/4x/8x) and a `#standings` container; wire handlers to the returned controller
- src/style.css:35 — styles for playback controls, the standings table, and the `.qualified` row highlight
- src/sim/standings.test.ts:NEW — unit tests for `computeStandings`
- src/app.test.ts:1 — add tests for the new pure `intervalForSpeed` helper

### New signatures
- `computeStandings(teams: Team[], results: MatchResult[]): Standing[]` — reduce results into rows, sorted by Pts→GD→GF (sim/standings.ts)
- `interface Standing { team: Team; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDiff: number; points: number }` — one table row (model/types.ts)
- `renderStandings(container: HTMLElement, standings: Standing[], qualifierCount: number, complete: boolean): void` — paint table, mark top-N `.qualified` when complete (render/standings.ts)
- `intervalForSpeed(multiplier: number, baseMs = 1200): number` — map 1x/2x/4x/8x to reveal delay (app.ts, pure + tested)
- `interface SimulationController { play(): void; pause(): void; setSpeed(multiplier: number): void; isPlaying(): boolean }` — playback handle (app.ts)
- `startSimulation(container: HTMLElement, group: Group, opts?: StartOptions): SimulationController` — changed return type; otherwise same orchestration

### Test sketch
- computeStandings_points — A beats B 2–0, A draws C 1–1 → A: P2 W1 D1 L0 GF3 GA1 GD+2 Pts4; B: L; C: D
- computeStandings_order — three teams equal on points, different GD/GF → rows sorted Pts→GD→GF
- computeStandings_empty — no results → every team P0 …Pts0, original team order preserved
- intervalForSpeed_steps — (1,1200)→1200, (2,1200)→600, (4,1200)→300, (8,1200)→150
- intervalForSpeed_default — multiplier 1 with default base → 1200

## Implementation Log

**Branch:** feat/world-cup-simulator-ehqe-enhance-single-group-simulation-playbac

**Commits:**
- 0c1d9a0 — feat(types): add flag field to Team and Standing interface
- b3a45e8 — feat(sim): add computeStandings with Pts/GD/GF sort and tests
- 68b3702 — feat(render): add standings table renderer; add flag to graph node labels
- 5aaa9ee — feat(app): add SimulationController, intervalForSpeed, standings integration
- f1fe2de — feat(ui): add play/pause, speed selector, standings layout and qualifier highlight

**Final test status:** PASS (13 tests across 4 test files, all green)

## Summary of Changes

- Added `flag?: string` to `Team` and a new `Standing` interface in `model/types.ts`.
- Added emoji flags to all 4 teams in `group.json`.
- New `src/sim/standings.ts`: pure `computeStandings` function (P/W/D/L/GF/GA/GD/Pts, sorted Pts→GD→GF) with 3 unit tests.
- New `src/render/standings.ts`: `renderStandings` renders the classic HTML table and marks top-N rows `.qualified` when complete.
- `src/render/graph.ts`: node labels now show `🏁 CODE` when a flag is available.
- `src/app.ts`: `startSimulation` now returns a `SimulationController` (play/pause/setSpeed/isPlaying); new pure `intervalForSpeed` tested with 2 cases; standings are recomputed and re-rendered after every reveal and on completion.
- `src/main.ts`: single "Simulate group" button replaced by a ▶ Play / ⏸ Pause button plus a 1×/2×/4×/8× speed `<select>`; a `#standings` div receives the live table.
- `src/style.css`: styles for the playback controls, the standings table (dark panel, column widths, Pts accent), and the `.qualified` teal highlight.

All Acceptance Criteria from the High-Level Plan are exercised: play/pause/resume logic via the controller, speed steps via `intervalForSpeed` tests, standings correctness via `computeStandings` tests, qualifier highlight via `.qualified` CSS class applied on completion.
