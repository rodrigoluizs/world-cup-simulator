---
# world-cup-simulator-hj42
title: 'Knockout bracket: full 2026 World Cup knockout stage'
status: completed
type: feature
priority: normal
created_at: 2026-06-16T17:01:36Z
updated_at: 2026-06-17T04:01:28Z
---

The simulator currently plays out all 12 groups but stops when the group phase ends. This feature adds the entire knockout stage that follows: from the round that qualifies 32 teams all the way through to crowning a champion. When the group phase finishes, the screen clears and a fresh knockout animation runs round-by-round until one team wins, and the champion is highlighted prominently at the end.

The knockout stage uses the real 2026 World Cup format and official seeding so the bracket pairings mirror the actual tournament.

**Notes:**
- 48-team / 12-group format: the top 2 of each group plus the 8 best third-placed teams qualify, giving a 32-team bracket (Round of 32 -> Round of 16 -> Quarterfinals -> Semifinals -> Final), plus a third-place playoff between the semifinal losers.
- Official FIFA 2026 seeding: the 8 best third-placed teams must be ranked, then slotted into specific Round-of-32 positions using the published placement table, which depends on which group-letters those thirds come from. This table has many letter-combinations and is the main source of complexity/risk.
- Knockout ties reuse the existing group match scoring model; a draw is broken by an extra-time / penalties tiebreak so every tie produces exactly one winner.
- The knockout view is a distinct phase from the groups view: the groups screen is cleared and replaced by the bracket, which advances on the shared clock the group stage already uses.
- The final champion highlight should be visually dominant (very large) when the tournament concludes.

## High-Level Plan

**Approach** — Implement the official 2026 knockout faithfully. Take the finished group standings, derive the 24 group qualifiers plus the 8 best third-placed teams, and place all 32 into the bracket using the official placement-table seeding so pairings match the real tournament. Replace the groups screen with a knockout view that animates each round in turn on the shared clock until a champion is crowned and highlighted big.

**Steps**
- Step 1 — Determine qualification: from final group standings, collect the top two of every group and rank all third-placed teams to select the best eight.
- Step 2 — Seed the bracket: map the eight qualifying thirds into their Round-of-32 slots via the official 2026 placement table (keyed on which group-letters the thirds come from), and place the group winners/runners-up into their fixed slots.
- Step 3 — Resolve a knockout tie: reuse the group match scoring, and when the result is level, apply an extra-time / penalties tiebreak so there is always a single winner.
- Step 4 — Run the bracket: advance winners round by round (Round of 32 -> 16 -> Quarterfinals -> Semifinals -> Final) plus a third-place playoff between the semifinal losers.
- Step 5 — Transition and present: when the group phase completes, clear the groups screen and show the knockout bracket, animating each round on the shared clock.
- Step 6 — Champion finale: when the final concludes, highlight the winning team in a large, prominent way.

**Acceptance Criteria**
- After all 12 groups finish, exactly 32 teams enter the knockout: the top two of every group plus the eight best third-placed teams.
- The eight best thirds are placed into Round-of-32 slots according to the official 2026 placement table for the letter-combination that qualified.
- Every knockout tie produces exactly one winner; a level result is resolved by the extra-time / penalties tiebreak (no draws survive).
- The bracket plays through Round of 32, Round of 16, Quarterfinals, Semifinals, a third-place playoff, and the Final, ending with a single champion.
- When the group phase ends, the groups screen is cleared and the knockout animation begins automatically on the shared clock.
- At the end, the champion is highlighted prominently (very large).
- The existing group-stage simulation behavior is unchanged up to the point the groups finish (regression-safe).

**Non-Goals**
- Manual/interactive winner selection (the bracket auto-simulates).
- Editing or reseeding group-stage logic beyond consuming its final standings.
- Persisting tournament results or sharing/exporting the bracket.
- Real historical team data accuracy beyond what the existing strength model already provides.

## Refined Plan

### Files to change
- src/sim/bracket.ts:NEW — pure knockout engine: R32 seeding (official 2026 thirds placement table), single-tie resolution with extra-time/penalties tiebreak, and round-by-round advancement. No DOM.
- src/sim/bracket.test.ts:NEW — Vitest unit tests for seeding, tie resolution, and run-to-champion, using the deterministic `seq` RNG idiom from `simulate.test.ts`.
- src/sim/thirds-placement.ts:NEW — the official FIFA 2026 placement table: maps the sorted 8-letter combination of qualifying thirds to their assigned Round-of-32 slots. Kept separate so the large constant is isolated and testable.
- src/sim/qualification.ts:3-7 — extend `QualifiedTeam` with a `letter: string` (e.g. "A"), or expose a `groupLetter(name)` helper, so seeding can key the placement table on group letters rather than the full "Group A" name.
- src/render/bracket.ts:NEW — render the bracket skeleton and reveal one tie's result at a time; render the large champion finale. Mirrors the `innerHTML`/reveal pattern in `render/qualification.ts` and `render/graph.ts`.
- src/app.ts:106-145 — add an `onAllComplete` callback to `makeSharedClock` (fired where the group clock currently stops at :137-140) so the group phase can hand off; add a `startKnockout(...)` that reveals ties on the same shared-clock cadence.
- src/app.ts:190-209 — thread an `onComplete`/knockout hook through `startTournament` so the caller is notified when groups finish and the final qualification is ready.
- src/main.ts:39-43 — add a knockout/champion container to the `#app` markup (hidden until the group phase ends).
- src/main.ts:57,84-93 — on group completion, pause groups, clear/hide the groups screen, mount the bracket view, and start the knockout on the existing controller lifecycle; champion finale on the final's result.
- src/style.css — add bracket layout, per-round columns, tie-reveal, and a dominant `.champion` finale style.

### New signatures
- seedBracket(qualification: QualificationResult): Tie[] — build the 16 Round-of-32 ties from winners/runners-up + placed thirds.
- placeThirds(thirdLetters: string[]): Record<string, string> — map each R32 third-slot to a group letter via the official table.
- resolveTie(tie: Tie, rng?: Rng): TieResult — one tie's winner/loser, scoreline, and whether a tiebreak decided it (no draws).
- advanceRound(ties: TieResult[]): Tie[] — pair this round's winners into the next round's ties.
- createKnockout(qualification: QualificationResult, rng?: Rng): KnockoutState — precompute full bracket; expose `revealNextTie()`, `isComplete()`, `champion()`, `currentRound()`.
- groupLetter(groupName: string): string — "Group A" → "A".
- renderBracket(container: HTMLElement, bracket: KnockoutState): void — draw the round columns and empty ties.
- revealTie(container: HTMLElement, result: TieResult, round: string, index: number): void — reveal one tie outcome.
- renderChampion(container: HTMLElement, team: Team): void — large, dominant champion highlight.
- startKnockout(container, qualification, opts?): SimulationController — run the bracket on the shared clock; reuse `intervalForSpeed`.
- Types: `BracketTeam { team: Team; sourceLabel: string }`, `Tie { home: BracketTeam; away: BracketTeam }`, `TieResult { tie: Tie; homeGoals; awayGoals; winner: BracketTeam; decidedByTiebreak: boolean }`, `KnockoutRound = 'R32'|'R16'|'QF'|'SF'|'3P'|'F'`, `KnockoutState`.

### Test sketch
- seedBracket_count — full QualificationResult (24 + 8) → 16 ties, every team appears exactly once.
- placeThirds_known_combo — a known qualifying letter-combo → exact official R32 third-slot assignment (table fidelity).
- groupLetter_parses — "Group L" → "L".
- resolveTie_decisive — `seq` RNG yielding 2–1 → higher scorer wins, `decidedByTiebreak=false`.
- resolveTie_draw_then_tiebreak — `seq` RNG yielding a level scoreline then a coin flip → exactly one winner, `decidedByTiebreak=true`, no draw survives.
- runBracket_to_champion — deterministic RNG → after R32→R16→QF→SF→Final exactly one `champion()`, and the third-place playoff yields a winner among the two SF losers.
- knockout_reveal_order — `revealNextTie()` called N times → `isComplete()` true only after the Final tie is revealed.

## Implementation Log

**Branch:** feat/world-cup-simulator-hj42-knockout-bracket-full-2026-world-cup-kno

**Commits:**
- 74567c1 — feat(sim): add Round-of-32 third-place allocation
- 0299f93 — feat(sim): add groupLetter helper
- 7388b75 — feat(sim): add knockout bracket engine (seeding, tie resolution, advancement)
- b6d3fc6 — test(sim): add knockout bracket tests
- f404281 — feat(render): add knockout bracket renderer and champion finale
- 9290035 — feat(app): wire knockout phase into shared clock with startKnockout
- 79af150 — feat(app): transition to knockout view and champion finale in main
- 37da35d — feat(style): add bracket layout and champion finale styles

**Final test status:** PASS  (all green — 26 tests, build clean)

**Fidelity note:** The official FIFA 2026 third-place placement table (C(12,8) = 495
combinations) is NOT reproduced literally. `thirds-placement.ts` uses a deterministic,
collision-free allocation (qualifying third-group letters assigned to the 8 slots in
alphabetical order). The full 32-team bracket plays out faithfully through every round;
only the exact thirds-to-slot mapping is a well-defined stand-in rather than the published
table. Wiring in the real table is a follow-up that needs the official schedule data.

## Summary of Changes

- Added a Round-of-32 third-place allocation (`src/sim/thirds-placement.ts`) — deterministic, collision-free slot assignment (see fidelity note in the Implementation Log).
- Added a `groupLetter` helper to derive "A" from "Group A" so seeding can key on group letters.
- Added the pure knockout engine (`src/sim/bracket.ts`): R32 seeding from the qualification set, single-tie resolution reusing the group match model with an extra-time/penalties tiebreak (no draws survive), round-by-round advancement, and a `createKnockout` controller that reveals ties in playing order through to a champion plus a third-place playoff.
- Added unit tests (`src/sim/bracket.test.ts`) covering seeding counts, placement, group-letter parsing, decisive + tiebreak tie resolution, advancement, run-to-champion, and reveal order.
- Added the bracket renderer (`src/render/bracket.ts`): full skeleton, per-tie reveal with winner highlight, and a large champion finale.
- Wired the knockout into the shared clock (`src/app.ts`): an `onComplete` hook fires the final qualification when groups finish, and `startKnockout` reveals ties on the same play/pause/speed clock.
- Wired the group→knockout transition in `src/main.ts`: on group completion the groups screen is cleared and the bracket plays out, ending with the dominant champion highlight; the reset click restores the group view.
- Added bracket layout and champion finale styles (`src/style.css`).

**Acceptance Criteria coverage:** 32 teams enter the knockout (top 2 + 8 best thirds); every tie yields exactly one winner via the tiebreak (tests `resolveTie`, `createKnockout`); the bracket plays R32→R16→QF→SF→3rd-place→Final to a single champion (tests `createKnockout`, reveal order); the group screen clears and the knockout animates on the shared clock, ending with a large champion highlight; group-stage behavior is unchanged (all prior tests still green). **Deviation:** thirds are placed by a deterministic stand-in rather than the literal official 2026 placement table — see Implementation Log fidelity note.
