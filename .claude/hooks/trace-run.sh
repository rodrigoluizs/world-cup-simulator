#!/usr/bin/env bash
# Stop hook - append a one-line record of this run to runs/trace.jsonl.
# Fires at the end of each assistant turn. Kept cheap and non-fatal on purpose.

# Stop hooks receive the hook payload as JSON on stdin; capture it before any
# git work. transcript_path points at the session JSONL we mine for tokens.
payload="$(cat 2>/dev/null)"

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
mkdir -p runs
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
changed="$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')"
commits="$(git rev-list --count HEAD 2>/dev/null || echo 0)"

# Token consumption from the transcript. Defaults keep the line well-formed when
# jq, the payload, or the transcript are unavailable.
in_tok=0; out_tok=0; cache_read=0; cache_create=0; context=0; session_out=0
model="unknown"
transcript=""
if command -v jq >/dev/null 2>&1 && [ -n "$payload" ]; then
  transcript="$(printf '%s' "$payload" | jq -r '.transcript_path // empty' 2>/dev/null)"
fi
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  # Last assistant turn = token snapshot at end of run (context = input + cache).
  read -r in_tok cache_create cache_read out_tok < <(
    jq -rs '
      [ .[] | select(.type=="assistant") | .message.usage ] | last // {}
      | "\(.input_tokens // 0) \(.cache_creation_input_tokens // 0) \(.cache_read_input_tokens // 0) \(.output_tokens // 0)"
    ' "$transcript" 2>/dev/null
  )
  # Cumulative output across the whole session, for growth tracking.
  session_out="$(
    jq -rs '[ .[] | select(.type=="assistant") | .message.usage.output_tokens // 0 ] | add // 0' \
      "$transcript" 2>/dev/null
  )"
  : "${in_tok:=0}" "${cache_create:=0}" "${cache_read:=0}" "${out_tok:=0}" "${session_out:=0}"
  context=$(( in_tok + cache_create + cache_read ))
  # Model of the last assistant turn.
  model="$(
    jq -rs '[ .[] | select(.type=="assistant") | .message.model ] | last // "unknown"' \
      "$transcript" 2>/dev/null
  )"
  : "${model:=unknown}"
fi

printf '{"at":"%s","branch":"%s","model":"%s","changed_files":%s,"commits":%s,"tokens":{"input":%s,"output":%s,"cache_read":%s,"cache_creation":%s,"context":%s,"session_output":%s}}\n' \
  "$ts" "$branch" "$model" "$changed" "$commits" \
  "$in_tok" "$out_tok" "$cache_read" "$cache_create" "$context" "$session_out" >> runs/trace.jsonl
exit 0
