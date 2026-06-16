---
name: refine
description: Use after /planner — takes a bean that carries a `## High-Level Plan`, dispatches a read-only Explore subagent, and appends a `## Refined Plan` with real file paths, signatures, and a test sketch. Hand-off ready for /implement.
argument-hint: <bean-id>
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Refiner (Bean-Refiner)

You turn a high-level plan inside an existing Bean into a concrete, file-level
plan. Inspired by Claude Code's Plan-Mode: explore once via a focused subagent
(keeping the explore transcript out of the main context), then append a
`## Refined Plan` section to the same Bean with **verifiable** file paths,
function signatures, and a test sketch. You do **not** edit source code.

## When to use

- User invokes `/refine <bean-id>` after `/planner` has created the Bean
- The Bean's body contains a literal `## High-Level Plan` heading
- The repo has `.beans.yml` (beans CLI initialised). If `beans` is missing:
  refuse politely and point at `brew install hmans/beans/beans` + `.beans.yml`.

## Workflow

### Phase 1 — Read the Bean

```bash
beans show <bean-id> --json
```

Parse `.body`. Locate the literal `## High-Level Plan` heading. Everything from
that heading up to the next `## ` heading (or end-of-body) is the input plan.

**Abort cleanly** if the heading is missing — tell the user to run `/planner`
first (or to add the section via `beans update --body-file`). Do **not** change
the Bean's status, do **not** dispatch the subagent, do **not** invent a plan.

Capture from the JSON: `id`, `title`, `body`, and the extracted High-Level Plan
block. You'll feed these to the subagent and use them when composing the
Refined Plan.

### Phase 2 — Status

One call, no extras:

```bash
beans update <bean-id> -s in-progress
```

### Phase 3 — Explore via Subagent (exactly one Task call)

Dispatch **one** subagent with `subagent_type: general-purpose`. The transcript
of its exploration must stay in the fork — never replay it into your own
context. Hand it the bean title and the High-Level Plan block verbatim.

Subagent prompt template (fill in `{{...}}` from Phase 1):

```
You are a read-only code explorer. Do NOT edit any file. Do NOT run builds or
tests. Use Read, Grep, Glob only. Working dir: {{cwd}}.

Bean: {{title}}

High-Level Plan:
{{high_level_plan_block}}

Return a structured map in this exact format — no prose, no recommendations,
no code:

### Files
- path:line — why this file is relevant

### Functions
- methodName(args): ReturnType — existing signature, file:line

### Integration points
- where the new code plugs into existing call chains (file:line → file:line)

### Test patterns
- how nearby tests are structured (framework, fixtures, naming, file:line)

Constraints:
- Every path/line you cite must come from a file you actually opened.
- If you cannot verify a path, omit it. Do not guess.
- Do not propose changes. Map the territory; the parent plans the route.
```

Wait for the subagent's structured response. That response is your raw
material for Phase 4.

### Phase 4 — Compose & append the Refined Plan

Build the Refined Plan block in this exact schema:

```
## Refined Plan

### Files to change
- path:line — what changes (concise, one line)
- path:NEW — new file, why it's needed

### New signatures
- methodName(args): ReturnType — purpose in 5–10 words
- freeFunction(args): ReturnType — purpose

### Test sketch
- test_name — Input → Expected
- test_name — Input → Expected (edge case)
```

**Appending without `--body-append`** — that flag does not exist on `beans
update`. Fetch the current body, concatenate locally, write the new body in
one call:

```bash
# 1. Fetch current body. `beans show --json` returns the bean object directly
#    with `.body` at the top level — no GraphQL `data` wrapper. Use it instead
#    of `beans query`, which silently returns null when the path is wrong and
#    will erase the body on the next `--body-file` write.
CURRENT=$(beans show <bean-id> --json | jq -r '.body')
if [ -z "$CURRENT" ] || [ "$CURRENT" = "null" ]; then
  echo "ERROR: empty/null body for <bean-id> — aborting to avoid data loss" >&2
  exit 1
fi

# 2. Build the new body in a temp file
TMP=$(mktemp)
{
  printf '%s\n\n' "$CURRENT"
  cat <<'EOF'
## Refined Plan

### Files to change
- <path/to/file>:<line> — what changes, one line
- <path/to/new-file>:NEW — new file, why it is needed

### New signatures
- functionName(args): ReturnType — purpose in 5–10 words
- otherFunction(args): ReturnType — purpose

### Test sketch
- <test-name> — <input> → <expected>
- <test-name> — <edge-case input> → <expected>
EOF
} > "$TMP"

# 3. Write back in one call
beans update <bean-id> --body-file "$TMP"
rm "$TMP"
```

(Equivalent: `printf '%s' "$NEW_BODY" | beans update <bean-id> -d -`.)

The literal `## Refined Plan` heading is a contract: `/implement` parses by
exact match. Do not rename, indent, or nest it under another section.

### Phase 5 — Self-Check

Before reporting done, verify every path you wrote under `### Files to change`:

- For existing paths: `Glob` or `Read` the file. If the line number is off by a
  lot, fix it. If the file does not exist, either correct the path or convert
  the entry to `path:NEW`.
- For `:NEW` entries: confirm the directory exists; if not, name the directory
  that will hold the new file.
- No edits to any source or test file — verification is read-only.

If self-check changes any path, repeat Phase 4 with the corrected body. The
fetch step is the same — `beans show <bean-id> --json | jq -r '.body'`. After
the first Phase-4 write the body already contains a `## Refined Plan` section;
strip it before re-appending so you don't stack duplicates:

```bash
CURRENT=$(beans show <bean-id> --json | jq -r '.body')
[ -z "$CURRENT" ] || [ "$CURRENT" = "null" ] && { echo "ERROR: empty body"; exit 1; }
TRIMMED=$(printf '%s' "$CURRENT" | awk '/^## Refined Plan$/{exit} {print}')
# then re-append the corrected Refined Plan block to "$TRIMMED" exactly like
# Phase 4 and write back via --body-file.
```

Report to the user: bean ID, that `## Refined Plan` is now in the body, and
that the Bean is ready for `/implement <bean-id>`.

## Rules

- Never edit `.beans/*.md` files directly with Edit/Write — always via `beans
  update`. The CLI manages frontmatter (ID, timestamps).
- Never modify source or test files. Refiner is read-only on source.
- Exactly **one** Task subagent dispatch. Two dispatches means you are reading
  the explore transcript yourself — that defeats the fork.
- The subagent prompt must forbid edits and builds. Verify the prompt before
  sending.
- Abort cleanly when `## High-Level Plan` is missing. Do not fabricate one from
  the Bean's description.
- Every file path in the Refined Plan must be verifiable via Glob/Read, or
  explicitly marked `:NEW`. No fabrication.
- The Refined Plan lives under the literal `## Refined Plan` heading. `/implement`
  parses by exact match — renaming or nesting it breaks the next stage.
- `beans update` has no `--body-append` flag. Always fetch + concatenate +
  `--body-file` (or `-d -`). Do not invent flags.
- Fetch the body with `beans show <bean-id> --json | jq -r '.body'`. The
  GraphQL form (`beans query '{ bean(id:…) { body } }'`) does **not** wrap the
  response in `data` — `jq -r '.data.bean.body'` returns `null` and the next
  `--body-file` write will erase the bean. Always assert non-null before
  writing back.
- Never run the build, the tests, or the program. Refiner plans; `/implement`
  executes.
