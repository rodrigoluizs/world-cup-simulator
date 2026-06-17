---
# world-cup-simulator-yg1k
title: Add token consumption to trace-run hook
status: completed
type: task
priority: normal
created_at: 2026-06-17T08:32:45Z
updated_at: 2026-06-17T08:40:54Z
---

Enhance .claude/hooks/trace-run.sh to record token usage (input/output/cache/context) per run in runs/trace.jsonl by parsing the Stop hook transcript_path.

## Summary of Changes

Enhanced `.claude/hooks/trace-run.sh` (Stop hook) to record token consumption per run.

- Reads the hook payload from stdin and extracts `transcript_path`.
- Uses jq to mine the session transcript for the last assistant turn's usage, adding a `tokens` object to each `runs/trace.jsonl` line: `input`, `output`, `cache_read`, `cache_creation`, `context` (input+cache total), and `session_output` (cumulative output across the session).
- Non-fatal by design: missing jq/payload/transcript fall back to zeros while keeping the JSON line well-formed.
- Verified with valid, empty-stdin, and bad-path inputs; test lines removed so trace.jsonl matches HEAD.
