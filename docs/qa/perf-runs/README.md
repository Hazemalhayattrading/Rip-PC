# Reference-hardware performance runs

This folder holds the results of the manual fps protocol in [`docs/qa/test-plan.md` §6.5](../test-plan.md#65-3d-frame-rate-ci-proxy-and-the-reference-hardware-gate).
They are the absolute gate for BUILD_PROMPT §8:

- **60 fps** on the reference laptop (Intel Core Ultra 7 155H on its Arc iGPU, Chrome with hardware
  acceleration);
- **60 fps** on desktop;
- **120 fps** on a high-end desktop GPU.

CI cannot measure these. Its headless SwiftShader runs are a relative signal only, and they stay
in `artifacts/perf/`, never here.

## What goes here

One JSON file per probe invocation, written by `tests/perf/fps-probe.mjs --mode reference`:

```
docs/qa/perf-runs/<YYYY-MM-DDTHHMMZ>-<target>-<device-slug>.json
```

For example, `2026-09-30T1845Z-referenceLaptop-acme-book-14-core-ultra-7-155h.json`. The name
carries the UTC time to the minute.

The protocol asks for two invocations 5 minutes apart, the second being the sustained check. Keep
both files: the gate uses the lower median.

## How to produce a run

Follow the checklist in test plan §6.5, then run:

```sh
node tests/perf/fps-probe.mjs --mode reference --target referenceLaptop \
  --device "<brand model>, Core Ultra 7 155H, <RAM size and channels>" \
  --notes "Intel driver <version>; Best performance; <display resolution> @ <Hz>; mains power" \
  --url "https://hazemalhayattrading.github.io/Rip-PC/build/looks?b=<reference build>&perf=1"
```

- For the desktop, use `--target desktop` or `--target highEndDesktop`.
- The reference build codes are listed in `tests/perf/fps-scenarios.json` (Phase 3).
- Send both files to qa-lead. qa-lead reviews them and commits them with
  `qa: add fps reference run <device>`.

## Fields that decide the result

| Field | Meaning |
|---|---|
| `verdict` | `PASS`, `FAIL`, `INCONCLUSIVE` or `INVALID`. Only `PASS` closes the gate |
| `reasons` | Why the probe decided that |
| `median.avgFps` | Median over 3 measured passes of the camera path, with the frame-rate limit off. Compared with `target.avgFpsMin` from `tests/perf/budget.json` |
| `median.onePercentLowFps`, `median.minFps`, `median.p95Ms`, `median.p99Ms`, `median.framesOverPct` | Smoothness, recorded for every run. `framesOverPct` counts frames that missed a 60 Hz deadline (over 25 ms) |
| `calibrationFps` | Idle frame rate before the path. It must be above 1.05 × the target for a miss to count; otherwise the run is `INCONCLUSIVE` (still capped) |
| `gpu.renderer` | The unmasked WebGL renderer. A software renderer, or anything but the expected GPU ("Arc" on the laptop), makes the run `INVALID` |
| `device`, `browser`, `app.build`, `method`, `viewport`, `scene` | What was measured, on what, and how: machine, Chrome version and flags, app commit, runs, window size and device pixel ratio, draw calls and triangles |

## Review checklist (qa-lead, before committing)

- The `gpu.renderer` is the intended GPU and is not software.
- `browser.launchArgs` include `--disable-gpu-vsync` and `--disable-frame-rate-limit`, and
  `calibrationFps` shows the uncap worked.
- The per-run averages agree within `fps.maxRunSpreadPct` (the probe enforces this).
- `device.notes` names the GPU driver version, the power mode, the memory channels and the display.
- `app.build.sha` is the commit being gated.
