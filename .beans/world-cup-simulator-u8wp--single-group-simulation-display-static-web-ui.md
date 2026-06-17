---
# world-cup-simulator-u8wp
title: Single-group simulation display (static web UI)
status: completed
type: feature
priority: normal
created_at: 2026-06-16T14:32:56Z
updated_at: 2026-06-16T14:59:48Z
---

Build the first slice of a 2026 World Cup simulator: a static, client-side web app that displays ONE group as a graph and progressively reveals simulated match results. The real composition of the chosen group is fetched from the web a single time and persisted to a local data file in the repo; at runtime the app reads only that file (no network). Match outcomes are decided purely at random. Once started, results appear one match at a time on a timer, filling the graph until the group is complete. This Bean is intentionally narrow — multiple groups and the elimination bracket are separate, later Beans — but the structure should not block them.

**Notes:**
- Chosen approach: static client-side web app, no backend (Approach A). Browser loads the persisted group file, runs the random simulation in-page, reveals on a timer.
- Group composition is captured from the web ONCE and committed as static data; runtime is offline/deterministic with respect to the team list.
- "Graph" means a visual node/edge style layout (teams and their matches), not a bar chart or plain table.
- Language/stack within the web-app approach is left to refinement; pick something that scales cleanly to many groups and a bracket later.
- Pure-random outcomes now; a strength/rating-based model is explicitly a future enhancement, not this Bean.

## High-Level Plan

**Approach** — Ship a single static web page that reads one real group's teams from a committed data file, simulates every match in that group with random outcomes, and reveals the results one at a time on a timer over a graph visualization. No server, no runtime network. Keep data, simulation, and rendering as separable concerns so later Beans can add more groups and a bracket without a rewrite.

**Steps**
- Capture the real composition of one World Cup 2026 group from the web a single time and persist it as a committed data file the app can load (team identities for that one group).
- Define the set of matches for that group (every team plays every other team once) derived from the loaded team list.
- Simulate each match with a purely random outcome, producing a result per match.
- Render the group as a graph: the teams and the matches between them, with result slots that start empty.
- Drive a timed auto-reveal that fills in one match result at a time until all matches in the group are shown, then signals completion.
- Provide a way to start (and re-run) the simulation so a fresh set of random results can be played out.

**Acceptance Criteria**
- Opening the app shows a graph of exactly one real 2026 World Cup group with all its teams visible and every match result initially empty.
- The team list rendered matches the composition captured from the web and stored in the committed data file; running the app requires no network call.
- After starting, match results appear one at a time on a timer (not all at once), until every match in the group has a result.
- Each match result is produced randomly, so re-running can yield different results across runs.
- When all matches are revealed, the app clearly indicates the group is complete.
- The data, simulation, and rendering responsibilities are separated enough that adding more groups or a bracket later does not require reworking this one.

**Non-Goals**
- Multiple groups displayed together (separate later Bean).
- Elimination / knockout rounds and bracket visualization (separate later Bean).
- Strength-, rating-, or odds-based outcomes; outcomes are random in this Bean.
- Fetching group data from the web at runtime; the web fetch happens once to seed the committed file.
- Any backend, server, persistence of past runs, multi-user, or sharing features.
- Group standings/points-table logic beyond showing per-match results (unless trivially implied by the reveal).

## Refined Plan

**Stack fit** — All source lives under `src/`; Vite bundles a committed JSON data file via a static `import` (satisfies "no runtime network"). Vitest runs in the `node` env, so pure logic (schedule generation, simulation) is unit-tested; DOM/SVG rendering is hand-rolled (no viz dependency added) and exercised manually via `npm run dev`. `verbatimModuleSyntax`/`isolatedModules` require `import type` for type-only imports.

### Files to change
- src/data/group.json:NEW — committed real 2026 WC group (group name + ordered team list). Fetched from the web ONCE during implementation, then written here; the app only imports it.
- src/model/types.ts:NEW — shared domain types (Team, Group, Match, MatchResult) so data/sim/render stay decoupled and multi-group/bracket can extend them later.
- src/sim/schedule.ts:NEW — round-robin match generation (every pair once) from a team list.
- src/sim/simulate.ts:NEW — random match/group simulation with an injectable RNG for deterministic tests.
- src/render/graph.ts:NEW — render the group as an SVG node/edge graph (teams = nodes on a ring, matches = edges with empty result slots) and reveal one match result in place.
- src/app.ts:NEW — orchestration: build matches → render empty graph → simulate → timed one-at-a-time reveal → completion signal; expose start/re-run.
- src/style.css:NEW — minimal styling for nodes/edges/result labels and completion state; imported by the entry.
- src/main.ts:1 — replace placeholder; import committed group data + style, mount `app` onto `#app`, kick off start and wire a start/re-run control.
- src/sim/schedule.test.ts:NEW — unit tests for match generation.
- src/sim/simulate.test.ts:NEW — unit tests for simulation with a deterministic RNG.
- src/math.ts:DELETE — scaffold placeholder, no longer referenced once main.ts is rewritten.
- src/math.test.ts:DELETE — placeholder test removed with src/math.ts.

### New signatures
- generateMatches(teams: Team[]): Match[] — round-robin, every unordered pair once
- type Rng = () => number — injectable randomness source (default Math.random)
- simulateMatch(match: Match, rng?: Rng): MatchResult — random scoreline for one match
- simulateGroup(matches: Match[], rng?: Rng): MatchResult[] — simulate all, order preserved
- renderGroupGraph(container: HTMLElement, group: Group, matches: Match[]): void — draw nodes + empty edges
- revealResult(container: HTMLElement, result: MatchResult, index: number): void — fill one edge's result slot
- startSimulation(container: HTMLElement, group: Group, opts?: { intervalMs?: number; rng?: Rng }): void — render empty, then timed reveal to completion
- isComplete(revealed: number, total: number): boolean — true when every match shown (drives completion signal)

### Test sketch
- generateMatches_roundRobin — 4 teams → 6 matches, each unordered pair exactly once
- generateMatches_noSelfPlay — no match has home === away
- simulateMatch_deterministic — fixed RNG → exact expected scoreline (repeatable)
- simulateMatch_scoreInRange — goals are non-negative integers within configured bounds for rng in [0,1)
- simulateGroup_preservesCount — N matches in → N results out, same order
- isComplete_boundary — (revealed=total) → true; (revealed<total) → false

## Implementation Log

**Branch:** feat/world-cup-simulator-u8wp-single-group-simulation-display

**Commits:**
- fd9b1a8 — domain types (Team, Group, Match, MatchResult)
- 1fce6b5 — committed Group A data (real 2026 WC draw, fetched once); enable JSON imports
- 5125193 — round-robin match generation with tests
- 5af4288 — random match/group simulation with injectable RNG and tests
- f7718d9 — SVG node/edge graph render with per-match result slots
- bbe6ceb — timed reveal orchestration + completion signal with tests
- a9a53d4 — wire single-group UI; remove scaffold placeholder

**Supporting changes (to enable planned files):** tsconfig `resolveJsonModule` (for the JSON data import) and `src/vite-env.d.ts` (Vite client types for the CSS import).

**Final test status:** PASS  (8 tests, 4 files → 3 after placeholder removal; build green)

## Summary of Changes

- Added decoupled domain types so data, simulation, and rendering stay independent (extensible for multi-group/bracket Beans).
- Committed the real 2026 World Cup **Group A** (Mexico, South Africa, South Korea, Czechia) as static JSON, fetched from the web once; the app imports it with no runtime network.
- Round-robin scheduler generates every pair once (n·(n−1)/2 matches).
- Pure-random simulation with an injectable RNG (deterministic in tests; Math.random in the app).
- Hand-rolled SVG graph: teams as nodes on a ring, matches as edges with result slots starting empty ("vs").
- Timed auto-reveal fills one match result at a time; on the last reveal a "Group complete ✓" badge appears. A start/re-run button replays a fresh random simulation (re-runs cancel any in-flight reveal).

**Acceptance Criteria coverage:** Schedule correctness (round-robin, no self-play), random+bounded+deterministic simulation, order preservation, and the completion boundary are exercised by the 8 unit tests. The graph render, timed one-at-a-time reveal, and completion badge are DOM/visual and verified via `npm run dev` (Vitest runs in the `node` env, so DOM rendering isn't unit-tested).
