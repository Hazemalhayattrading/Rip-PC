/**
 * Rig Lab fps meter: records requestAnimationFrame timestamps while the 3D garage plays its scripted
 * camera path, and summarises them. Owner: qa-lead. Plain browser script, no dependencies.
 *
 * Used two ways (docs/qa/test-plan.md §6.5):
 *  1. Injected by tests/perf/fps-probe.mjs (the normal way, CI and reference hardware).
 *  2. Pasted into the Chrome DevTools console on the garage page, then:
 *       const r = await __rigLabFpsMeter.run(); copy(JSON.stringify(r));
 *
 * Scene contract (the 3D garage exposes this when the URL has perf=1; build-lead, Phase 3):
 *   window.__RIG_LAB_PERF__ = {
 *     version: 1,
 *     ready: Promise<void>,              // all parts of the current build loaded and first frame drawn
 *     runCameraPath(): Promise<void>,    // plays the fixed, time-based camera path, resolves at its end
 *     info(): { drawCalls, triangles, textures, geometries, dpr, canvasWidth, canvasHeight }
 *   }
 * The path is time-based (camera pose is a function of elapsed time), so a slower machine draws fewer
 * frames over the same path instead of a longer path.
 */
(function install(root) {
  'use strict';
  if (root.__rigLabFpsMeter) return;

  /** Record rAF timestamps until `stop()` resolves (or for durationMs when stop is a number). */
  function recordDuring(stop) {
    return new Promise(function (resolve, reject) {
      var stamps = [];
      var running = true;
      function tick(t) {
        stamps.push(t);
        if (running) root.requestAnimationFrame(tick);
      }
      root.requestAnimationFrame(tick);
      var done = typeof stop === 'number'
        ? new Promise(function (r) { root.setTimeout(r, stop); })
        : Promise.resolve().then(stop);
      done.then(function () {
        running = false;
        // One more frame so the last interval of the path is included.
        root.requestAnimationFrame(function (t) { stamps.push(t); resolve(stamps); });
      }, reject);
    });
  }

  /** Nearest-rank percentile of an ascending array. */
  function percentile(sortedAsc, q) {
    if (!sortedAsc.length) return NaN;
    var rank = Math.ceil(q * sortedAsc.length);
    return sortedAsc[Math.min(sortedAsc.length, Math.max(1, rank)) - 1];
  }

  /**
   * Summarise rAF timestamps (ms).
   * avgFps = (frames - 1) / elapsed; onePercentLowFps = 1000 / p99 interval; minFps = 1000 / max interval.
   * framesOverPct counts intervals above 1.5 x a 60 Hz interval (25 ms): frames that missed at least one
   * 60 Hz deadline. A 16.7 ms threshold would count normal vsync jitter as misses.
   */
  function summarize(stamps, longFrameMs) {
    var threshold = typeof longFrameMs === 'number' ? longFrameMs : 1.5 * (1000 / 60);
    var intervals = [];
    for (var i = 1; i < stamps.length; i += 1) intervals.push(stamps[i] - stamps[i - 1]);
    if (intervals.length < 2) throw new Error('fps-meter: fewer than 3 frames were recorded');
    var elapsed = stamps[stamps.length - 1] - stamps[0];
    var sorted = intervals.slice().sort(function (a, b) { return a - b; });
    var long = intervals.filter(function (d) { return d > threshold; }).length;
    var round = function (n, d) { var f = Math.pow(10, d); return Math.round(n * f) / f; };
    return {
      frames: stamps.length,
      durationMs: round(elapsed, 1),
      avgFps: round((intervals.length / elapsed) * 1000, 2),
      onePercentLowFps: round(1000 / percentile(sorted, 0.99), 2),
      minFps: round(1000 / sorted[sorted.length - 1], 2),
      p50Ms: round(percentile(sorted, 0.5), 2),
      p95Ms: round(percentile(sorted, 0.95), 2),
      p99Ms: round(percentile(sorted, 0.99), 2),
      maxMs: round(sorted[sorted.length - 1], 2),
      framesOverMs: round(threshold, 2),
      framesOverPct: round((long / intervals.length) * 100, 2),
    };
  }

  function median(values) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /** Median of each numeric field across runs. */
  function medianOf(runs) {
    var out = {};
    Object.keys(runs[0]).forEach(function (k) {
      if (typeof runs[0][k] === 'number') out[k] = median(runs.map(function (r) { return r[k]; }));
    });
    return out;
  }

  /** Calibrate the idle frame rate, warm up, then measure `runs` passes of the camera path. */
  async function run(options) {
    var opts = options || {};
    var runs = opts.runs || 3;
    var warmupRuns = opts.warmupRuns === undefined ? 1 : opts.warmupRuns;
    var calibrationMs = opts.calibrationMs || 2000;
    var scene = root.__RIG_LAB_PERF__;
    if (!scene || typeof scene.runCameraPath !== 'function') {
      throw new Error('fps-meter: window.__RIG_LAB_PERF__ is missing; open the garage with perf=1 in the URL');
    }
    await scene.ready;
    var calibration = summarize(await recordDuring(calibrationMs));
    for (var w = 0; w < warmupRuns; w += 1) await scene.runCameraPath();
    var results = [];
    for (var r = 0; r < runs; r += 1) {
      results.push(summarize(await recordDuring(function () { return scene.runCameraPath(); })));
    }
    return {
      meterVersion: 1,
      calibrationFps: calibration.avgFps,
      runs: results,
      median: medianOf(results),
      scene: typeof scene.info === 'function' ? scene.info() : null,
      viewport: { width: root.innerWidth, height: root.innerHeight, devicePixelRatio: root.devicePixelRatio },
    };
  }

  root.__rigLabFpsMeter = { version: 1, recordDuring: recordDuring, summarize: summarize, percentile: percentile, medianOf: medianOf, run: run };
})(typeof window !== 'undefined' ? window : globalThis);
