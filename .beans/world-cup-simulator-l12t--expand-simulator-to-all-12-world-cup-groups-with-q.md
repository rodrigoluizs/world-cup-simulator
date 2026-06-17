---
# world-cup-simulator-l12t
title: Expand simulator to all 12 World Cup groups with qualification tracker
status: completed
type: feature
priority: normal
created_at: 2026-06-16T15:31:45Z
updated_at: 2026-06-16T15:41:22Z
---

The simulator currently plays a single group. Expand it to render all 12 groups of the real 2026 FIFA World Cup (48-team format) in a grid, simulated together on one shared playback clock. On top of the group-stage grid, add an aggregate qualification tracker that surfaces the teams advancing under the real format: the 12 group winners, 12 runners-up, and the 8 best third-placed teams. This makes the all-groups view feel complete — the cross-group ranking only becomes meaningful once every group is present.

**Notes:**
- Real 2026 final draw, fully resolved (March 2026 playoffs concluded). Use exactly these nations:
  - Group A: Mexico, South Africa, South Korea, Czechia
  - Group B: Canada, Bosnia & Herzegovina, Qatar, Switzerland
  - Group C: Brazil, Morocco, Haiti, Scotland
  - Group D: United States, Paraguay, Australia, Türkiye
  - Group E: Germany, Curaçao, Ivory Coast, Ecuador
  - Group F: Netherlands, Japan, Sweden, Tunisia
  - Group G: Belgium, Egypt, Iran, New Zealand
  - Group H: Spain, Cape Verde, Saudi Arabia, Uruguay
  - Group I: France, Senegal, Iraq, Norway
  - Group J: Argentina, Algeria, Austria, Jordan
  - Group K: Portugal, DR Congo, Uzbekistan, Colombia
  - Group L: England, Croatia, Ghana, Panama
- Existing Group A data (Mexico, South Africa, South Korea, Czechia) already matches the real draw — reuse its team-record shape (name, code, confederation, flag) for all nations.
- One global play/pause/speed controller must drive all 12 groups on the same timeline, not 12 independent controllers.
- Best-third-place ranking criteria: points, then goal difference, then goals scored, then goals for (tie-break consistent with the existing standings sort). 8 of the 12 third-placed teams advance.
- Source: real format = 12 winners + 12 runners-up + 8 best third-placed = 32 teams advancing.

## High-Level Plan

**Approach** — Build a 12-group grid that reuses the existing single-group simulation and standings per group, driven by a single shared playback controller so all groups advance on one clock. Add a tournament-level qualification tracker that aggregates standings across all groups to identify the 12 winners, 12 runners-up, and 8 best third-placed teams under the real 2026 rules. Keep scope to the group stage; no knockout bracket.

**Steps**
- Introduce tournament-level data holding all 12 real groups (each with its four resolved nations), replacing the single-group input as the app's source.
- Render every group as a standings panel in a responsive grid, preserving the current per-group standings layout and qualifier highlight.
- Drive all groups from one shared playback controller (play / pause / speed) so a single timeline advances matches across every group simultaneously.
- Add a cross-group qualification tracker that, from current standings, computes the advancing set: all winners, all runners-up, and the 8 best third-placed teams by the agreed tie-break order.
- Surface the qualification tracker in the UI as an aggregate view distinct from the per-group grid, updating live as the simulation plays.

**Acceptance Criteria**
- All 12 real groups (A–L) render simultaneously with the exact nations from the resolved 2026 draw.
- Pressing play advances matches in every group on a single shared clock; pause and speed apply globally.
- Each group panel shows live standings with the qualifier highlight, identical in behavior to the current single-group view.
- When every match is simulated, the qualification tracker lists exactly 32 advancing teams: 12 winners, 12 runners-up, and 8 best third-placed teams ranked by points, then goal difference, then goals scored.
- The third-place ranking is deterministic for a given simulated result set and uses the same tie-break order as the existing standings sort.
- Build and tests stay green; existing standings/schedule/simulation logic remains correct (regression-safe).

**Non-Goals**
- No knockout bracket, Round of 32 seeding, or anything past the group stage.
- No configurable group count/size — the structure is the fixed real 2026 format (12 groups of 4).
- No live/real-result data fetching at runtime; the draw is static seed data baked into the app.
- No re-design of the existing standings table or playback UI beyond arranging groups into a grid and adding the qualification view.

## Refined Plan

### Files to change
- src/data/tournament.json:NEW — the 12 resolved 2026 groups (A–L), each `{ name, teams: [{name,code,confederation,flag}×4] }`; reuses the team-record shape from src/data/group.json.
- src/model/types.ts:29 — add `Tournament { groups: Group[] }` next to the existing `Group` interface (file comment at :3 already anticipates this).
- src/sim/qualification.ts:NEW — pure cross-group ranking: 12 winners, 12 runners-up, 8 best third-placed, reusing the Pts→GD→GF comparator from standings.ts:43-45.
- src/sim/qualification.test.ts:NEW — unit tests for computeQualification (counts, third-place ranking, tie-breaks, partial).
- src/render/qualification.ts:NEW — renders the aggregate qualification panel from a QualificationResult.
- src/app.ts:43 — extract the per-group reveal/standings pipeline (app.ts:52-90) into a reusable engine; add startTournament that drives all 12 engines from ONE shared timer and refreshes the qualification panel each tick. Keep startSimulation working for the single-group path/tests.
- src/main.ts:6 — load tournament.json instead of group.json; build a responsive groups grid + one qualification panel; wire the single play/pause/speed controls (main.ts:34-35, 51-62) to one tournament controller; re-run on click (main.ts:64).
- src/style.css:138 — add `.groups-grid` responsive layout wrapping the per-group `.sim-layout` panels, plus `.qualification` aggregate-panel styles.

### New signatures
- startTournament(root: HTMLElement, tournament: Tournament, opts?: StartOptions): SimulationController — one shared clock across all groups.
- createGroupSimulation(container: HTMLElement, group: Group, opts: GroupSimOptions): GroupSimulation — per-group engine reused by single + tournament paths.
- interface GroupSimulation { revealNext(): void; isComplete(): boolean; standings(): Standing[] } — tick-driven group state.
- computeQualification(entries: { group: Group; standings: Standing[] }[]): QualificationResult — winners + runners-up + 8 best thirds.
- interface QualificationResult { winners: QualifiedTeam[]; runnersUp: QualifiedTeam[]; bestThirds: QualifiedTeam[] } — advancing 32.
- interface QualifiedTeam { team: Team; group: string; position: number } — a team's standing slot across the tournament.
- renderQualification(container: HTMLElement, result: QualificationResult, complete: boolean): void — aggregate panel renderer.

### Test sketch
- computeQualification_counts — 12 fully-played groups → winners.length 12, runnersUp.length 12, bestThirds.length 8 (32 total).
- computeQualification_winners — each group's position-1 team (top of computeStandings) → appears in winners, never in runnersUp/bestThirds.
- computeQualification_thirds_ranking — 12 third-placed teams with distinct points → bestThirds = the 8 highest by Pts→GD→GF, in that order.
- computeQualification_thirds_tiebreak — third-placed teams equal on points → ordered by goalDiff, then goalsFor (same order as standings.ts).
- computeQualification_partial — not all matches revealed → returns a deterministic ranking from current standings without throwing (fewer than 8 thirds allowed).
- intervalForSpeed_unchanged — existing app.ts helper still maps 1/2/4/8 → base/multiplier (regression guard on shared-clock refactor).

## Implementation Log

**Branch:** feat/world-cup-simulator-l12t-expand-simulator-to-all-12-world-cup-grou

**Commits:**
- b95c1a5 — feat(data): add resolved 2026 tournament draw and Tournament type
- 291fc89 — feat(sim): add computeQualification with 12 winners/runners-up/8 best thirds
- 33fe489 — feat(render): add renderQualification aggregate panel
- decd32e — feat(app): extract GroupSimulation engine; add startTournament with shared clock
- 69b0d98 — feat(ui): wire tournament grid and shared controller in main.ts
- 60dfc99 — feat(style): add groups-grid layout and qualification sidebar styles

**Final test status:** PASS (18 tests across 5 files, all green)

## Summary of Changes

- **`src/data/tournament.json`** — complete 2026 draw, all 12 groups A–L with 48 real teams and emoji flags.
- **`src/model/types.ts`** — added `Tournament { groups: Group[] }`.
- **`src/sim/qualification.ts`** — `computeQualification` derives 12 winners, 12 runners-up, and 8 best third-placed teams (Pts→GD→GF tie-break, matches standings.ts comparator).
- **`src/sim/qualification.test.ts`** — 5 unit tests covering counts (32 total), winner exclusion, thirds ranking, tie-break order, and partial-result safety.
- **`src/render/qualification.ts`** — `renderQualification` renders the live aggregate panel with three labelled sections.
- **`src/app.ts`** — extracted `createGroupSimulation` engine (tick-driven, no timer); `makeSharedClock` drives N groups from one interval; `startTournament` wires all 12; `startSimulation` preserved for existing tests.
- **`src/main.ts`** — loads `tournament.json`, builds a 12-panel grid with `data-group` selectors, one qualification sidebar, and one global play/pause/speed controller.
- **`src/style.css`** — `.tournament-layout`, `.groups-grid` (auto-fill 480px columns), `.group-panel`, `.qualification-aside` (sticky sidebar), and full qualification table styles.

Acceptance Criteria exercised by tests: 32-team count verified, third-place ranking and tie-break order verified, regression on `intervalForSpeed` and all prior standings/schedule/sim tests confirmed green.
