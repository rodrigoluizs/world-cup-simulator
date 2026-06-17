---
# world-cup-simulator-gqk1
title: 'Hidden Mineirazo modifier: rigged Brazil 7x1 Germany final'
status: completed
type: feature
priority: normal
created_at: 2026-06-17T06:44:51Z
updated_at: 2026-06-17T07:13:35Z
---

A hidden easter-egg modifier the user arms before pressing Play. It is toggled by clicking the "2026 FIFA World Cup" title on the start screen; while armed, the title is styled with a green-yellow-blue Brazil gradient so the user can confirm it is on. When armed and the simulation runs, the tournament is rigged so Brazil and Germany each win their way through the bracket and genuinely meet in the final, which always ends Brazil 7x1 Germany. The rigged final plays out goal-by-goal on the match timer exactly like a normal match. When the modifier is off, the simulator behaves exactly as today.

**Notes:**
- Trigger is a clickable toggle on the existing title text; armed state shown via a Brazil-colours gradient on the title.
- Chosen strategy: lightweight outcome-forcing intercept over the existing result generation. The engine's normal timer/goal-by-goal playback is reused; only the outcomes are predetermined.
- "Full path to final" means both Brazil and Germany must be forced to win every match required for them to reach the final, so the final pairing is genuinely Brazil vs Germany (not just an overridden label).
- Goal timing for the 7x1 is generated to sum to the scoreline; exact authored minutes/scorers are out of scope (that was the alternative, scripted approach).
- Off state must be byte-for-byte the current behaviour (regression-safe).

## High-Level Plan

**Approach** — Add a hidden, user-armed modifier that intercepts the simulator's match-outcome generation. While armed, matches on Brazil's and Germany's paths are forced to wins so the two genuinely meet in the final, and the final is locked to a 7x1 Brazil result. All existing timer and goal-by-goal playback is reused unchanged; only the outcomes are predetermined. This satisfies "always" with the least risk and a trivial off-switch.

**Steps**
- Add a hidden toggle on the start screen: clicking the "2026 FIFA World Cup" title arms/disarms the modifier, and the armed state is signalled by a green-yellow-blue Brazil gradient on the title.
- Carry the armed state into the simulation run so the engine knows the modifier is active when Play is pressed.
- When armed, force the outcome of every match required for Brazil and Germany to advance, so both reach the final and meet there.
- When armed, force the final's result to Brazil 7x1 Germany, distributing goals across the match timer so it plays out goal-by-goal like any other match.
- When disarmed, bypass all of the above so the simulation is identical to current behaviour.

**Acceptance Criteria**
- Clicking the title toggles the modifier; the armed state is visually distinct via the Brazil-colours gradient, and clicking again disarms it (gradient removed).
- With the modifier armed, every simulated run produces a Brazil vs Germany final.
- That final always ends 7x1 in Brazil's favour and plays out goal-by-goal on the timer like a normal match.
- Brazil and Germany each win the actual matches required to reach the final (the pairing is real, not a relabelled final).
- With the modifier off, the tournament simulation is identical to current behaviour (regression-safe).

**Non-Goals**
- Authoring specific goal minutes, scorers, or a scripted narrative for the 7x1 (that was the rejected scripted approach).
- Biasing team strengths probabilistically (rejected: cannot guarantee "always").
- Any persistence of the modifier across page reloads, or exposing it in normal UI/menus.
- Changing match outcomes for any teams other than as required to put Brazil and Germany in the final.

## Refined Plan

### Files to change
- src/sim/mineirazo.ts:NEW — easter-egg constants (BRA/GER codes, 7-1 final score) + `rigGroupResults` that forces Brazil and Germany to win their group matches. Depends only on model types (no bracket import → no cycle).
- src/sim/bracket.ts:197 — add an `options` param to `createKnockout`; when armed, resolve each R32→SF tie so the side that is Brazil or Germany always wins, and replace the final with a Brazil-home vs Germany-away tie forced to 7-1. Third-place and all other ties keep the normal `resolveTie` path.
- src/sim/bracket.ts:140 — add internal `rigResolveTie(tie, rng)` (BRA wins if present, else GER wins if present, else delegates to `resolveTie`) and `buildMineirazoFinal(finalists)` (picks BRA/GER from the two SF winners, builds home=BRA away=GER tie + 7-1 `TieResult`). Exported for tests.
- src/app.ts:20 — add `mineirazo?: boolean` to `StartOptions`; thread it into `createGroupSimulation`.
- src/app.ts:40 — add `mineirazo?: boolean` to `GroupSimOptions`; at :92 wrap `simulateGroup` output with `rigGroupResults` when armed.
- src/app.ts:258 — add `mineirazo?: boolean` to `KnockoutOptions`; at :284 pass `{ mineirazo }` as the new `createKnockout` options arg.
- src/main.ts:47 — make the `<h1>2026 FIFA World Cup</h1>` a click target; add a module-level armed flag toggled on click, toggling a `mineirazo` class on the title.
- src/main.ts:189 — extract the groups-grid reset block into a `resetTournamentUI()` helper; reuse it from both the grid handler and the new title-toggle handler. On toggle, call reset then `startGroupPhase(false)` so the run stays paused until Play.
- src/main.ts:142 — `startGroupPhase` passes `mineirazo: armed` into `startTournament`; `startKnockoutPhase` (:125) passes `mineirazo: armed` into `startKnockout`.
- src/style.css:82 — `.app-header h1` clickable affordance (cursor, user-select none); `.app-header h1.mineirazo` green-yellow-blue gradient text (background-clip: text).
- src/sim/mineirazo.test.ts:NEW — unit tests for `rigGroupResults`.
- src/sim/bracket.test.ts:36 — add a rigged-`createKnockout` describe block (qualification fixture with Winner C = BRA, Winner E = GER).

### New signatures
- MINEIRAZO_HOME_CODE = 'BRA', MINEIRAZO_AWAY_CODE = 'GER', MINEIRAZO_HOME_GOALS = 7, MINEIRAZO_AWAY_GOALS = 1 — easter-egg constants (mineirazo.ts)
- rigGroupResults(matches: Match[], results: MatchResult[]): MatchResult[] — force Brazil and Germany to win their group matches
- createKnockout(qualification: QualificationResult, rng?: Rng, options?: { mineirazo?: boolean }): KnockoutState — optional rig flag added
- rigResolveTie(tie: Tie, rng: Rng): TieResult — Brazil/Germany always win their knockout tie, else normal
- buildMineirazoFinal(finalists: BracketTeam[]): { tie: Tie; result: TieResult } — Brazil-home vs Germany-away final forced 7-1

### Test sketch
- rigGroupResults forces Brazil win — BRA-as-away match, base result 3-0 to opponent → Brazil ends with more goals (winner)
- rigGroupResults forces Germany win — GER-as-home match, base result 0-2 to opponent → Germany ends with more goals (winner)
- rigGroupResults leaves other matches untouched — match without BRA/GER → result identical to input
- createKnockout armed → champion is Brazil — qualification (Winner C = BRA, Winner E = GER), any rng → champion().code === 'BRA'
- createKnockout armed → final is Brazil(home) 7 vs Germany(away) 1 — final round result: home.team.code === 'BRA', homeGoals === 7, awayGoals === 1
- createKnockout armed → Brazil and Germany win every tie on their path — every revealed tie containing BRA/GER has them as winner
- createKnockout unarmed → unchanged — same seq RNG yields the pre-existing results (regression-safe)

## Implementation Log

**Branch:** feat/world-cup-simulator-gqk1-hidden-mineirazo-modifier-rigged-brazil

**Commits:**
- a2ef198 — feat(sim): add mineirazo module forcing Brazil and Germany group wins
- 89c5547 — feat(sim): rig knockout final to Brazil 7-1 Germany when armed
- 9bcc32c — feat(app): thread mineirazo flag into group and knockout simulation
- 3086b51 — feat(main): hidden title toggle arming the Mineirazo modifier

**Final test status:** PASS  (48 tests, 8 files; tsc --noEmit + vite build clean)

## Summary of Changes

- Added `src/sim/mineirazo.ts` — single source of truth for the rigged teams (BRA/GER) and 7-1 scoreline, plus `rigGroupResults` forcing Brazil and Germany to win their group matches.
- Rigged the knockout in `src/sim/bracket.ts` — `rigResolveTie` forces Brazil/Germany through every round, and `buildMineirazoFinal` fixes the final to Brazil(home) 7-1 Germany(away), gated behind a new `createKnockout` option.
- Threaded a `mineirazo` flag through `src/app.ts` (`StartOptions`/`KnockoutOptions`) into both the group simulation and the knockout.
- Added the hidden trigger in `src/main.ts`: clicking the "2026 FIFA World Cup" title arms/disarms the modifier and re-runs the (paused) group stage; `src/style.css` gives the armed title a green-yellow-blue Brazil gradient.

All Acceptance Criteria are exercised by tests: `bracket.test.ts` proves an armed run always yields a Brazil-vs-Germany 7-1 final with both teams winning every tie on their path, and that the off state is unchanged; `mineirazo.test.ts` proves the group-stage rig forces their wins while leaving other matches untouched. The reused timeline/render path means the final still plays goal-by-goal on the timer. (Title-click DOM wiring is verified via build, consistent with the project's no-jsdom test setup.)
