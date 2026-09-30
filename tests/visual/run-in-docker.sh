#!/usr/bin/env bash
# Runs the visual-regression projects inside the pinned Playwright image (docs/qa/test-plan.md §11).
# Baselines are made and compared only here: another machine's fonts and anti-aliasing differ.
#
#   tests/visual/run-in-docker.sh                      compare with the committed baselines
#   tests/visual/run-in-docker.sh --update-snapshots   write new baselines (visual-tester only,
#                                                      then review every diff before committing)
#   QA_SNAPSHOT_DIR=artifacts/visual/calibration-1 tests/visual/run-in-docker.sh --update-snapshots
#                                                      capture into a scratch folder, e.g. to
#                                                      calibrate maxDiffPixelRatio
#
# Any other arguments go to `playwright test`. Needs Docker; the image is about 2 GB.
# Owner: qa-lead (visual-tester).
set -euo pipefail

# Playwright 1.56.1 with Chromium 1194: the same version as @playwright/test in package.json.
IMAGE='mcr.microsoft.com/playwright:v1.56.1-noble'
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# --ipc=host: without it Chromium can run out of shared memory and crash. --init: reaps zombie
# processes (both recommended by playwright.dev/docs/docker). node_modules lives in a named
# volume, so the host's own node_modules is never replaced by the container's.
exec docker run --rm --init --ipc=host \
  --volume "${repo}:/work" \
  --volume rig-lab-visual-node-modules:/work/node_modules \
  --workdir /work \
  --env QA_SNAPSHOT_DIR \
  "${IMAGE}" \
  bash -c 'npm ci && npm run build && npx playwright test --project="visual-*" "$@"' visual "$@"
