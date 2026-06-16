---
name: implement
description: Use after /refine — takes a bean that carries a `## Refined Plan`, creates a `feat/<bean-id>-<slug>` branch, walks each refined-plan step (edit → build → test → commit) with a hard build+test gate, and logs the commits back to the bean. Never pushes, never merges, never commits on `main`.
argument-hint: <bean-id>
model: claude-sonnet-4-6
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Implementer (Bean-Implementer)

You execute a refined plan that already lives inside a Bean. This is the **first
skill that writes code**. You work on a feature branch, one logical step per
commit, with a hard build + test gate before every commit. You append an
implementation log back to the Bean and flip its status to `completed` only
when every step is green.

## When to use

- User invokes `/implement <bean-id>` after `/refine` has appended a
  `## Refined Plan` block to the Bean
- The Bean's body contains the literal heading `## Refined Plan` followed by
  `### Files to change`, `### New signatures`, `### Test sketch`
- The repo has `.beans.yml` (beans CLI initialised). If `beans` is missing:
  refuse politely and point at `brew install hmans/beans/beans` + `.beans.yml`.

## Workflow

### Phase 1 — Preflight (read-only)

Read the bean and the world. Bail before touching anything if state is wrong.

```bash
beans show <bean-id> --json
```

Parse the JSON. Capture `id`, `title`, `status`, `body`. From `.body` extract
the block between the literal heading `## Refined Plan` and the next `## `
heading (or end-of-body). Within that block, capture each line under
`### Files to change` as a step candidate — each line of form
`path:line — description` (or `path:NEW — description`).

**Abort cleanly when any of these holds — do NOT mutate the bean, do NOT
create a branch, do NOT edit source:**

- `## Refined Plan` heading is missing → user must run `/refine <bean-id>`
  first
- The Refined Plan block is empty (no `### Files to change` entries)
- Bean status is `completed` or `scrapped`
- `git status --porcelain` is non-empty (working tree dirty)
- `git rev-parse --abbrev-ref HEAD` is not `main`

Run each check explicitly:

```bash
test -z "$(git status --porcelain)" || { echo "ERROR: working tree not clean"; exit 1; }
HEAD_BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$HEAD_BRANCH" = "main" ] || { echo "ERROR: not on main (on $HEAD_BRANCH)"; exit 1; }
```

### Phase 2 — Branch

Build a slug from the Bean `title`:

- Lowercase
- Transliterate any non-ASCII characters to ASCII (e.g. `ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`, `é→e`)
- Replace any run of non-alphanumeric characters with a single `-`
- Trim leading/trailing `-`
- Truncate to ~40 characters

Branch name: `feat/<bean-id>-<slug>`.

```bash
BRANCH="feat/<bean-id>-<slug>"
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 && { echo "ERROR: branch $BRANCH already exists"; exit 1; }
git checkout -b "$BRANCH"
[ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || { echo "ERROR: checkout failed"; exit 1; }
```

If the branch already exists, abort — do not re-use it, do not `-f`. The
upstream bean was supposed to be implemented from a clean slate.

### Phase 3 — Implement loop

For each step (one entry under `### Files to change` is one step; group entries
that describe a single logical change into one step if the Refined Plan's
prose suggests it — but prefer one-file-one-step when in doubt):

**Step 3.1 — Edit**

For each file listed in the step:

- `Read` the file first; the `:line` hints in the Refined Plan are anchors,
  not gospel — verify against current content
- Apply edits with `Edit` (existing files) or `Write` (`:NEW` entries)
- Never edit `.beans/*.md` directly

**Step 3.2 — Build**

Run this project's **Build** command (defined in `CLAUDE.md` under "Build and
test") — for example `npm run build`.

If the build fails, you get **at most 2 fix attempts** for the *current step*.
A fix attempt is: read the failing diagnostic, change the smallest thing that
addresses it, rerun the build. If still red after 2 attempts → **stop the
loop**, jump to Phase 4 with `Final test status: FAIL` and Phase 5 (status
remains `in-progress`).

**Step 3.3 — Test**

Run this project's **Test** command (defined in `CLAUDE.md` under "Build and
test") — for example `npm test`.

Same 2-attempt rule. Tests must be green before the commit — there are no
"fix it later" commits.

**Step 3.4 — Pre-commit guard (mandatory)**

Before every commit, verify you are still on the feature branch:

```bash
CUR=$(git rev-parse --abbrev-ref HEAD)
[ "$CUR" = "$BRANCH" ] || { echo "FATAL: not on $BRANCH (on $CUR) — refusing to commit"; exit 1; }
```

If HEAD reads `main`, abort hard. Never commit on `main`. This guard runs
**every step**, not just the first one — someone (or you) may have switched
branches mid-loop.

**Step 3.5 — Commit**

Stage only the files this step touched (named, never `-A` / `.`):

```bash
git add <only the files this step touched>
git commit -m "<step description from Refined Plan>"
SHA=$(git rev-parse --short HEAD)
```

Record `(SHA, step description)` for the implementation log. One logical step
per commit — do not batch multiple Refined Plan steps into one commit.

### Phase 4 — Implementation Log

Append a `## Implementation Log` block to the Bean. `beans update` has **no**
`--body-append` flag — fetch the current body, concatenate, write back via
`--body-file`:

```bash
CURRENT=$(beans show <bean-id> --json | jq -r '.body')
if [ -z "$CURRENT" ] || [ "$CURRENT" = "null" ]; then
  echo "ERROR: empty/null body for <bean-id> — aborting to avoid data loss" >&2
  exit 1
fi

TMP=$(mktemp)
{
  printf '%s\n\n' "$CURRENT"
  cat <<EOF
## Implementation Log

**Branch:** $BRANCH

**Commits:**
- <sha1> — <step 1 description>
- <sha2> — <step 2 description>
- <sha3> — <step 3 description>

**Final test status:** PASS  (all green)
EOF
} > "$TMP"

beans update <bean-id> --body-file "$TMP"
rm "$TMP"
```

If the loop stopped red, the log still gets written — with
`Final test status: FAIL`, the failing step description, the failing test
name, and a one-line note on what the 2 fix attempts tried.

### Phase 5 — Final status

**All green:**

```bash
beans update <bean-id> -s completed
```

Then append a `## Summary of Changes` block via the same
fetch-concat-`--body-file` pattern as Phase 4. One bullet per commit, plus a
one-line confirmation that the Acceptance Criteria from the High-Level Plan
were exercised by the tests.

**Red after 2 fix attempts:**

Status stays `in-progress`. Append a `## Implementation Notes` block
describing: last error message (verbatim), failing test name, source file
and line, what each fix attempt tried, and the suggested next move (e.g.
"revise Refined Plan — the file at path:line doesn't exist").

### Phase 6 — Report

Tell the user:

- Bean ID and final status (`completed` / `in-progress`)
- Branch name and number of commits
- Final test status (PASS / FAIL with one-line reason)
- Reminder: branch is **local only** — no push, no merge, user decides next

## Rules (hard)

- **Never commit on `main`.** Run `git rev-parse --abbrev-ref HEAD` before
  *every* commit. If it returns `main`, abort.
- **Never `git push`.** Never `git merge`. Never `git rebase`.
- **Tests green before every commit.** If Build or Test is red,
  do not stage. Do not commit. Do not "fix in the next commit".
- **Max 2 fix attempts per step.** After the second red build/test for the
  current step, stop the loop and log state. Do not enter an unbounded
  edit-build-test cycle.
- **One logical step per commit.** Do not batch Refined Plan steps. The
  commit log should read as the Refined Plan, one bullet at a time.
- **Stage named files only.** Never `git add -A`, never `git add .`. The
  Refined Plan lists the files; stage exactly those.
- **Never edit `.beans/*.md` directly** with `Edit` or `Write` — always
  through `beans update`. The CLI owns frontmatter (ID, timestamps).
- **No invented flags.** `beans update` has no `--body-append`. Use
  `beans show <id> --json | jq -r '.body'` to fetch, concatenate locally,
  then `beans update <id> --body-file <tmp>`. Always assert the fetched body
  is non-empty / non-`null` before writing back.
- **Abort cleanly when input is missing.** If `## Refined Plan` is absent or
  empty, tell the user to run `/refine` — do not invent files, do not
  fabricate steps from the High-Level Plan.
- **No subagent dispatch.** This skill writes code and runs builds — it must
  stay in the main loop so every edit, build, and test result is observable
  to the user. Spinning up a subagent to "do the implementation" defeats the
  build/test gate and burns tokens.
- **No restructuring beyond the Refined Plan.** If the plan says "add a branch
  to the existing handler", don't refactor the surrounding module. Scope
  discipline keeps commits small and reviewable.
