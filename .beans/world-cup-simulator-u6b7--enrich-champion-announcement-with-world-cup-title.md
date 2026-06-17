---
# world-cup-simulator-u6b7
title: Enrich champion announcement with World Cup title history + GitHub link
status: completed
type: feature
priority: normal
created_at: 2026-06-17T07:35:53Z
updated_at: 2026-06-17T07:41:32Z
---

When the simulator crowns a champion, the announcement should celebrate the team's real World Cup pedigree instead of just naming the winner. The headline should count the current simulated win as the team's latest title (e.g. Brazil, with 5 real titles, "wins their 6th title") and list the years of the team's prior real titles (e.g. 58, 62, 70, 94, 2002). Additionally, add a classic GitHub icon/link on the page pointing at the project repo so visitors can star it.

The World Cup winners data will be curated once from public web sources (all editions through the most recent) and baked into the app as a small static dataset — no runtime fetching (Approach A: static baked-in dataset).

**Notes:**
- Repo for the GitHub link: https://github.com/rodrigoluizs/world-cup-simulator
- Counting rule (confirmed by user): the current simulated win counts as the latest title. A team with N real titles that wins the sim is announced as winning their (N+1)th title; the listed years are the N prior real winning years.
- First-time winners (0 real titles): announce "wins their first title" with no prior-years list.
- Dataset must cover every World Cup edition and its winner/year, sourced from the web during implementation; accuracy of years per team is part of acceptance.
- Years may be shown in the short style from the example (58, 62, 70, 94, 2002).
- The GitHub link should use the classic GitHub mark/icon and be clearly clickable to star the repo.

## High-Level Plan

**Approach** — Curate a static dataset of World Cup winners (team + year for every edition) from public web sources and embed it in the app. When a champion is determined, look the team up in the dataset, compute its title number (real titles + the current win) and the list of prior winning years, and render an enriched announcement. Add a static GitHub icon/link to the page. This keeps the app fully client-side, offline-capable, deterministic, and testable, with the only cost being a manual one-line update after a future tournament.

**Steps**
- Research the web to compile the authoritative list of World Cup winners (winning nation and year) for every edition; derive per-team title counts and winning years.
- Introduce a curated static dataset of that history into the app.
- When the simulator produces a champion, resolve the champion against the dataset to determine: whether it is a first-time winner, the new title number (prior real titles + this win), and the ordered list of prior winning years.
- Update the champion announcement UI to show the enriched message: first-time wording for never-winners, otherwise "wins their {ordinal} title" plus the prior winning years.
- Add a classic GitHub icon linking to the project repo, placed visibly on the page and inviting a star.

**Acceptance Criteria**
- When Brazil is crowned, the announcement reads as their 6th title and lists 58, 62, 70, 94, 2002 (or full years) — matching real history plus the current win.
- A team that has previously won shows "wins their {N+1}th title" and the list of its prior winning years, with N = its real historical titles.
- A team with no real World Cup titles shows "wins their first title" and no prior-years list.
- Every World Cup edition's winner/year is represented in the dataset and the per-team counts are correct.
- A GitHub icon/link to https://github.com/rodrigoluizs/world-cup-simulator is visible on the page and navigates to the repo.
- Existing simulation behavior (bracket, results, anything unrelated to the announcement text) is unchanged.

**Non-Goals**
- No runtime/live fetching of winners data (rejected Approach B/C).
- No automated refresh pipeline for future tournaments — updates are manual.
- No counting of runner-up / third-place or any stat beyond titles and their years.
- No restyling of the broader page beyond adding the announcement enrichment and the GitHub link.

## Refined Plan

### Files to change
- src/data/worldCupTitles.ts:NEW — static history dataset + lookup; `Record<string, number[]>` keyed by `Team.code` (BRA, GER, ITA, ARG, FRA, URU, ENG, ESP → winning years). GER includes West Germany titles. ITA included even though absent from the 2026 roster.
- src/render/championTitle.ts:NEW — pure presentation helpers (ordinal + message builder) so they are unit-testable without the DOM; keeps render/bracket.ts thin.
- src/render/bracket.ts:154 — extend the `revealFinalChampion` banner `innerHTML` to add a title-history line below `.final-champion-name`, built from the helper. No signature change (still receives full `Team`, has `team.code`).
- src/main.ts:46 — add a classic GitHub anchor (SVG mark) inside `<header class="app-header">`, linking to https://github.com/rodrigoluizs/world-cup-simulator (target _blank, rel noopener, aria-label inviting a star).
- src/style.css:NEW-RULES — add `.final-champion-titles` styling for the history line and `.github-link` styling for the header icon. (File exists; appending rules.)
- src/render/championTitle.test.ts:NEW — vitest unit tests for the message builder + ordinal, co-located per project convention.

### New signatures
- titleYearsFor(code: string): number[] — prior real winning years for a team code, ascending; [] if none. (worldCupTitles.ts)
- ordinal(n: number): string — 1→"1st", 2→"2nd", 6→"6th", 11→"11th". (championTitle.ts)
- championTitleSummary(team: Team): { count: number; isFirst: boolean; priorYears: number[]; html: string } — count = priorYears.length + 1; isFirst when priorYears empty. (championTitle.ts)

### Test sketch
- championTitleSummary BRA — Team{code:'BRA'} → count 6, priorYears [1958,1962,1970,1994,2002], html contains "6th title"
- championTitleSummary ENG — Team{code:'ENG'} → count 2, priorYears [1966], html contains "2nd title"
- championTitleSummary first-timer — Team{code:'CAN'} → isFirst true, count 1, priorYears [], html contains "first title" and no year list
- ordinal edge cases — ordinal(1)→"1st", ordinal(2)→"2nd", ordinal(3)→"3rd", ordinal(6)→"6th", ordinal(11)→"11th", ordinal(13)→"13th"
- titleYearsFor GER — 'GER' → includes West Germany years (e.g. 1954,1974,1990,2014); unknown code → []

## Implementation Log

**Branch:** feat/world-cup-simulator-u6b7-enrich-champion-announcement-world-cup

**Commits:**
- fb298de — feat(champion): add World Cup titles dataset and pure presentation helpers
- 01a9ae6 — feat(champion): enrich announcement with title history and add GitHub link

**Final test status:** PASS (56/56 tests, 9 test files)

## Summary of Changes

- Added `src/data/worldCupTitles.ts`: curated static dataset of all 22 World Cup editions (1930–2022) keyed by `Team.code`; all 8 winning nations (BRA 5, GER 4, ITA 4, ARG 3, FRA 2, URU 2, ENG 1, ESP 1). West Germany titles stored under `GER`.
- Added `src/render/championTitle.ts`: DOM-free helpers `titleYearsFor`, `ordinal`, and `championTitleSummary`; first-time winners get "wins their first title!", returning winners get "wins their Nth title!" with short prior-year list (e.g. 58, 62, 70, 94, 2002).
- Updated `src/render/bracket.ts`: `revealFinalChampion` now injects the `championTitleSummary` HTML into the champion banner.
- Updated `src/main.ts`: classic GitHub SVG mark/icon added to the app header, linking to https://github.com/rodrigoluizs/world-cup-simulator with target `_blank` and aria-label.
- Updated `src/style.css`: `.final-champion-titles`, `.final-champion-prior-years`, `.github-link`, and `.github-icon` rules added.
- AC exercised by tests: Brazil → 6th title + [58,62,70,94,2002]; England → 2nd title + [66]; Canada → first title (no years); GER → 5th title; ordinal edge cases (11th, 12th, 13th, 21st).
