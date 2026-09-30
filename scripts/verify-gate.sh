#!/usr/bin/env bash
# Quality gate: a task can't be marked complete while `npm run verify` fails.
# Exit 2 = block completion and send the output back to the agent.
if [ ! -f package.json ] || ! grep -q '"verify"' package.json; then
  exit 0   # project not scaffolded yet (Phase 0) — nothing to check
fi
if ! out=$(npm run --silent verify 2>&1); then
  echo "Quality gate failed: npm run verify did not pass. Fix before marking the task complete." >&2
  echo "$out" | tail -n 40 >&2
  exit 2
fi
exit 0
