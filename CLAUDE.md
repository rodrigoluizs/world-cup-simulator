# CLAUDE.md

Context for Claude Code sessions in this project. It runs the three-station
factory from the bootcamp: planner, refine, implement. Fill in the two command
knobs and the conventions, then run the pipeline.

## Build and test

The implement station runs these as a hard gate before every commit. Set them
to match this project's stack.

- Build: `npm run build`   (tsc --noEmit typecheck + vite production build)
- Test:  `npm test`        (vitest run)

If this project has no test command yet, decide what proves a change is green (a
typecheck, a smoke run) and put it under Test. A factory with no green signal
cannot gate.

## Beans workflow

Work items are Beans, managed by the `beans` CLI. Never edit `.beans/*.md`
directly. The stations hand off through Beans:

1. Planner appends `## High-Level Plan` - approach and acceptance criteria, no file paths.
2. Refine appends `## Refined Plan` - files, signatures, test sketch.
3. Implement appends `## Implementation Log` - branch and commit SHAs, and sets status.

The headings are an exact-match contract between stations. Run `beans prime` for
the full reference; the SessionStart hook does this automatically.

## Conventions

Fill in as the project grows.

- TypeScript (ES2022, strict), bundled with Vite 6.
- Vitest 3 for tests; test files live next to source as `*.test.ts`.
- Static client-side web app, no backend. Source under `src/`, `index.html` is the Vite entry.

## Lessons

Guards added because the factory shipped something wrong once. One line each:
name the check and the signal it watches. Empty until your first learning loop.
