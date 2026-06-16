# Factory starter: take the spine home

This is the planner, refine and implement factory you built on Day 1, lifted off
the calculator. The skills are the same. Only the build and test commands
changed, and those are now knobs in CLAUDE.md. Point this at a real project and
run a work item through all three stations.

Observability is already on: the Stop hook logs every run to runs/trace.jsonl,
so you have trace data from your first run.

## Set it up once

1. Make a new repo from this folder. Copy everything, including the dotfiles
   (.claude, .beans.yml, .gitignore) - the trailing dot matters:

   ```bash
   cp -R <path-to>/take-home/starter/. ~/my-project/
   cd ~/my-project
   git init
   ```

2. Scaffold a minimal real project. Paste the prompt below into Claude Code. It
   creates the smallest thing the factory can run against and fills in your
   build and test commands.

3. Commit the skeleton so the implement station starts from a clean tree:

   ```bash
   git add -A
   git commit -m "scaffold + factory"
   ```

Rename the bean prefix in .beans.yml to your project's short name while you are
there.

## The scaffold prompt

```
Scaffold the smallest real project I can run an agent factory against.
Stack: <pick one, e.g. TypeScript + Vitest, Python + pytest, Go>.

Create only a skeleton, not the feature:
- a manifest with a build command and a test command
- one source file with one trivial function
- one passing test for it
- extend .gitignore with this stack's dependency, build, and test-cache folders
  (e.g. Python: __pycache__/, .pytest_cache/; Node: node_modules/, dist/) - the
  implement gate runs build and test, and an un-ignored cache dirties the tree
  and aborts the next feature's preflight

Then install dependencies, run the build, run the tests, and show me all three
green. Set the Build and Test commands in CLAUDE.md to match. Do not build any
feature yet, I will do that through /planner next.
```

## Adapt it to your language

The factory is language-agnostic; adapting it to your stack is a deliberate step,
not an afterthought. Two things are yours to set (the scaffold prompt does both
for you, but set them by hand if you wire a project yourself):

- In CLAUDE.md, set Build and Test to your stack's commands (npm run build and
  npm test, pytest, cargo test, go test ./..., and so on). The implement gate
  runs them before every commit.
- In .gitignore, add your stack's dependency, build, and test-cache folders so
  build and test runs do not dirty the tree.

Nothing else moves. The stations, the contract and the guardrails are identical
in every language.

## Run the pipeline

```
/planner <your feature in one sentence>
/refine <bean-id>
/implement <bean-id>
```

Watch the Bean after each station, not just the chat. The Bean is the hand-off.
After a run, look at runs/trace.jsonl to see what the factory did.

## Prove it is your Day 1 factory

Diff these skills against the calculator skills you built on Day 1:

```bash
diff -ru <path-to>/dev-bootcamp-factory-workshop/sandbox/.claude/skills .claude/skills
```

Two things are project specific: the build command and the test command. The
rest of the diff is worked examples turned into placeholders. Every phase, every
guardrail and the station contract are unchanged. The factory was never about
the calculator.

## What is in here

```
.claude/skills/planner     create a Bean with a High-Level Plan
.claude/skills/refine      explore the code, append a Refined Plan
.claude/skills/implement   branch, edit, build, test, commit, log
.claude/settings.json      beans prime on start, trace hook on stop
.claude/hooks/             the trace hook
.beans.yml                 beans config (rename the prefix)
.gitignore                 ignores .beans/ and runs/ so they do not dirty the tree
CLAUDE.md                  your build and test commands, conventions, lessons
```
