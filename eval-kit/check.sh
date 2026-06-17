#!/usr/bin/env bash
# check.sh - is this bean (the factory's output) trustworthy?
#
# Run from the sandbox:
#   bash eval-kit/check.sh eval-kit/beans/good-bean.md     # a good bean: all PASS
#   bash eval-kit/check.sh eval-kit/beans/broken-bean.md   # a broken bean: some FAIL
#
# Each eval is one line. A useful eval passes the good bean and fails the broken one.

BEAN="${1:?usage: check.sh <bean-file>}"
BODY="$(cat "$BEAN")"
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; }

# Just the High-Level Plan section (some checks look only there).
HLP="$(awk '/^## High-Level Plan$/{f=1;next} /^## /{f=0} f' <<<"$BODY")"

# --- evals ---

# 1. Planner stayed at altitude: the High-Level Plan names no source file.
grep -qE '\.ts\b' <<<"$HLP" \
  && fail "High-Level Plan names no source file" \
  || pass "High-Level Plan names no source file"

# 2. Refine ran: the bean has a Refined Plan.
grep -qx '## Refined Plan' <<<"$BODY" \
  && pass "Refined Plan is present" \
  || fail "Refined Plan is present"

# --- your turn: add a couple, same shape. an idea to uncomment: ---

# acceptance criteria are not a placeholder like "it works":
# grep -qi 'it works' <<<"$BODY" \
#   && fail "acceptance criteria are real" \
#   || pass "acceptance criteria are real"
