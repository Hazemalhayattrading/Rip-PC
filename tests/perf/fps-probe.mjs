#!/usr/bin/env node
/**
 * Rig Lab fps probe: drives Chrome through the 3D garage's scripted camera path and records fps.
 * BUILD_PROMPT.md §8: 60 fps on the reference laptop (Core Ultra 7 155H, Arc iGPU) and on desktop,
 * 120 fps on a high-end desktop GPU. Targets and method come from tests/perf/budget.json (fps.*).
 * Protocol: docs/qa/test-plan.md §6.5. Owner: qa-lead. Needs @playwright/test (a devDependency).
 *
 *   Reference hardware (the absolute gate, headed Chrome with the GPU, frame-rate limit off):
 *     node tests/perf/fps-probe.mjs --mode reference --target referenceLaptop --device "<make model>" \
 *       --notes "<GPU driver, power mode, memory channels, display>" \
 *       --url "https://hazemalhayattrading.github.io/Rip-PC/build/looks?b=<reference build>&perf=1"
 *   CI proxy (headless Chromium, SwiftShader, relative signal only):
 *     node tests/perf/fps-probe.mjs --mode ci --url "http://127.0.0.1:4173/Rip-PC/build/looks?b=...&perf=1" [--cpu-throttle 4]
 *
 * Verdicts: PASS · FAIL · INCONCLUSIVE (frame rate capped below the target, so a miss can't be proven)
 *           INVALID (software rendering or the wrong GPU in reference mode) · PROXY (ci mode, never a §8 pass)
 * Exit codes: 0 PASS or PROXY · 1 FAIL (or a blocking CI regression) · 2 INVALID, INCONCLUSIVE or error
 */
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
const UNCAP_FLAGS = ['--disable-gpu-vsync', '--disable-frame-rate-limit'];

export function loadFpsBudget(file = path.join(HERE, 'budget.json')) {
  return JSON.parse(readFileSync(file, 'utf8')).fps;
}

/**
 * Decide the verdict. Pure, unit-tested.
 * A frame-rate cap can only lower the measured average, so avg >= target is a proven pass even when
 * capped. Below the target it is a FAIL only if the idle calibration shows the browser was not capped
 * near the target; otherwise the run is INCONCLUSIVE and must be repeated with uncapped Chrome.
 */
export function verdictFor({
  mode,
  renderer,
  expectRenderer,
  medianAvgFps,
  calibrationFps,
  targetFps,
  runAvgFps = [],
  maxRunSpreadPct = 15,
  baselineAvgFps = null,
  maxRegressionPct = 10,
  regressionBlocking = false,
}) {
  const reasons = [];
  if (mode === 'reference') {
    if (!renderer || SOFTWARE_RENDERER.test(renderer)) {
      reasons.push(
        `WebGL renderer is "${renderer ?? 'unknown'}": hardware acceleration is off, so this is not a reference measurement`,
      );
      return { verdict: 'INVALID', reasons };
    }
    if (expectRenderer && !renderer.toLowerCase().includes(expectRenderer.toLowerCase())) {
      reasons.push(
        `WebGL renderer "${renderer}" is not the expected "${expectRenderer}" GPU (hybrid laptops may pick the other GPU)`,
      );
      return { verdict: 'INVALID', reasons };
    }
  }
  if (runAvgFps.length > 1) {
    const spreadPct = ((Math.max(...runAvgFps) - Math.min(...runAvgFps)) / medianAvgFps) * 100;
    if (!(spreadPct <= maxRunSpreadPct)) {
      reasons.push(
        `runs disagree (${runAvgFps.join(' / ')} fps avg, spread ${spreadPct.toFixed(0)}% > ${maxRunSpreadPct}%): frames may not be reaching the screen, or the machine was busy; not a measurement`,
      );
      return { verdict: 'INCONCLUSIVE', reasons };
    }
  }
  if (mode === 'ci') {
    reasons.push(
      'CI proxy: SwiftShader software rendering; a relative regression signal, never a pass of the §8 bar',
    );
    if (baselineAvgFps) {
      const dropPct = ((baselineAvgFps - medianAvgFps) / baselineAvgFps) * 100;
      if (dropPct > maxRegressionPct) {
        reasons.push(
          `regression: ${dropPct.toFixed(1)}% below the baseline ${baselineAvgFps} fps (limit ${maxRegressionPct}%)${regressionBlocking ? '' : ', non-blocking until the noise floor is calibrated'}`,
        );
        return {
          verdict: regressionBlocking ? 'FAIL' : 'PROXY',
          regression: true,
          dropPct,
          reasons,
        };
      }
      reasons.push(`within ${maxRegressionPct}% of the baseline (${dropPct.toFixed(1)}% drop)`);
      return { verdict: 'PROXY', regression: false, dropPct, reasons };
    }
    return { verdict: 'PROXY', regression: false, dropPct: null, reasons };
  }
  if (medianAvgFps >= targetFps) {
    reasons.push(`median avg ${medianAvgFps} fps >= target ${targetFps} fps`);
    return { verdict: 'PASS', reasons };
  }
  if (calibrationFps < targetFps * 1.05) {
    reasons.push(
      `idle frame rate is capped at about ${calibrationFps} fps, below 1.05 x the ${targetFps} fps target; re-run with the frame-rate limit off`,
    );
    return { verdict: 'INCONCLUSIVE', reasons };
  }
  reasons.push(
    `median avg ${medianAvgFps} fps < target ${targetFps} fps (uncapped: idle ${calibrationFps} fps)`,
  );
  return { verdict: 'FAIL', reasons };
}

const exitCodeFor = (verdict) => ({ PASS: 0, PROXY: 0, FAIL: 1 })[verdict] ?? 2;

const USAGE = `Usage: node tests/perf/fps-probe.mjs --url <garage url with perf=1> [options]
  --mode <ci|reference>     ci: headless Chromium + SwiftShader (default); reference: headed Chrome on the GPU
  --target <name>           budget.json fps.targets key: referenceLaptop (default), desktop, highEndDesktop
  --device <label>          free text: make and model of the machine (reference mode requires it)
  --notes <text>            what the probe cannot detect: GPU driver version, power mode, memory
                            channels, display resolution and refresh (reference mode requires it)
  --channel <name>          browser channel for reference mode (default: chrome, i.e. installed Google Chrome)
  --executable <path>       browser executable instead of a channel
  --cpu-throttle <n>        CPU slowdown via DevTools Protocol (ci proxy runs x1 and x4)
  --runs <n>                measured passes of the camera path (default: budget.json fps.runs)
  --baseline <file>         ci mode: earlier probe JSON to compare against
  --out <file>              JSON output (default: docs/qa/perf-runs/<YYYY-MM-DDTHHMMZ>-<target>-<device>.json
                            in reference mode, artifacts/perf/fps-<YYYY-MM-DDTHHMMZ>-cpu<n>x.json in ci mode)
  --ready-timeout <ms>      how long to wait for the scene contract (default 120000)
  --headless                force headless in reference mode (only to test the guard; gives INVALID)`;

async function probe(args) {
  const fps = loadFpsBudget();
  const mode = args.mode ?? 'ci';
  if (!['ci', 'reference'].includes(mode)) throw new Error(`--mode must be ci or reference`);
  const targetName = args.target ?? 'referenceLaptop';
  const target = fps.targets[targetName];
  if (!target)
    throw new Error(
      `unknown --target ${targetName}; budget.json has ${Object.keys(fps.targets).join(', ')}`,
    );
  if (mode === 'reference' && !args.device)
    throw new Error('--device "<make model>" is required in reference mode');
  if (mode === 'reference' && !args.notes)
    throw new Error(
      '--notes "<GPU driver, power mode, memory channels, display>" is required in reference mode',
    );
  const runs = Number(args.runs ?? fps.runs);
  const cpuThrottle = Number(args['cpu-throttle'] ?? 1);

  const { chromium } = await import('@playwright/test');
  const headless = mode === 'ci' || Boolean(args.headless);
  const launchOptions =
    mode === 'reference'
      ? {
          headless,
          args: [...UNCAP_FLAGS, '--start-maximized'],
          ...(args.executable
            ? { executablePath: args.executable }
            : { channel: args.channel ?? 'chrome' }),
        }
      : // No uncap flags in ci mode: with SwiftShader they let rAF run ahead of the GPU queue, which gave
        // 379 fps then 3.8 fps on the same scene (measured 2026-09-30). Headless is capped at 60 Hz anyway.
        { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  const browser = await chromium.launch(launchOptions);
  try {
    const context = await browser.newContext(
      mode === 'reference' && !headless
        ? { viewport: null }
        : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    );
    await context.addInitScript({ path: path.join(HERE, 'fps-meter.js') });
    const page = await context.newPage();
    if (cpuThrottle > 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
    }
    const response = await page.goto(args.url, { waitUntil: 'load' });
    if (!response || response.status() !== 200)
      throw new Error(`${args.url} returned HTTP ${response?.status() ?? 'no response'}`);
    const readyTimeout = Number(args['ready-timeout'] ?? 120_000);
    try {
      await page.waitForFunction(() => Boolean(window.__RIG_LAB_PERF__), undefined, {
        timeout: readyTimeout,
      });
    } catch {
      throw new Error(
        `window.__RIG_LAB_PERF__ did not appear within ${readyTimeout} ms at ${args.url}: open the 3D garage with perf=1 in the URL (scene contract: tests/perf/fps-meter.js)`,
      );
    }
    const gpu = await page.evaluate(() => {
      const gl =
        document.createElement('canvas').getContext('webgl2') ??
        document.createElement('canvas').getContext('webgl');
      if (!gl) return { renderer: null, vendor: null };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      };
    });
    const measured = await page.evaluate((opts) => window.__rigLabFpsMeter.run(opts), {
      runs,
      warmupRuns: fps.warmupRuns,
      calibrationMs: fps.calibrationMs,
    });
    const build = await page.evaluate(() => window.__RIG_LAB_BUILD__ ?? null);
    const baseline = args.baseline ? JSON.parse(readFileSync(args.baseline, 'utf8')) : null;
    const decision = verdictFor({
      mode,
      renderer: gpu.renderer,
      expectRenderer: target.expectRenderer,
      medianAvgFps: measured.median.avgFps,
      calibrationFps: measured.calibrationFps,
      targetFps: target.avgFpsMin,
      runAvgFps: measured.runs.map((r) => r.avgFps),
      maxRunSpreadPct: fps.maxRunSpreadPct,
      baselineAvgFps: baseline?.median?.avgFps ?? null,
      maxRegressionPct: fps.ciProxy.maxRegressionPct,
      regressionBlocking: fps.ciProxy.blocking,
    });
    return {
      schema: 'rig-lab/perf-run@1',
      kind: 'fps',
      recordedAt: new Date().toISOString(),
      mode,
      target: {
        name: targetName,
        avgFpsMin: target.avgFpsMin,
        hardware: target.hardware,
        source: target.source,
      },
      device: {
        label: args.device ?? `ci:${os.hostname()}`,
        cpu: os.cpus()[0]?.model ?? null,
        logicalCores: os.cpus().length,
        memoryGB: Math.round(os.totalmem() / 1e9),
        platform: `${os.platform()} ${os.release()}`,
        notes: args.notes ?? null,
      },
      browser: {
        version: browser.version(),
        headless,
        launchArgs: launchOptions.args,
        channel: launchOptions.channel ?? null,
      },
      gpu,
      app: { url: args.url, build },
      method: {
        runs,
        warmupRuns: fps.warmupRuns,
        calibrationMs: fps.calibrationMs,
        cpuThrottle,
        metric: fps.metric,
      },
      calibrationFps: measured.calibrationFps,
      runs: measured.runs,
      median: measured.median,
      scene: measured.scene,
      viewport: measured.viewport,
      baseline: baseline ? { file: args.baseline, avgFps: baseline.median?.avgFps ?? null } : null,
      verdict: decision.verdict,
      reasons: decision.reasons,
    };
  } finally {
    await browser.close();
  }
}

export function defaultOut(record) {
  // UTC date and time to the minute, e.g. 2026-09-30T1845Z: the protocol's two back-to-back runs
  // (the sustained check) must never overwrite each other.
  const date = record.recordedAt.slice(0, 16).replace(':', '') + 'Z';
  if (record.mode === 'reference') {
    const slug = record.device.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    return path.join(ROOT, 'docs', 'qa', 'perf-runs', `${date}-${record.target.name}-${slug}.json`);
  }
  return path.join(ROOT, 'artifacts', 'perf', `fps-${date}-cpu${record.method.cpuThrottle}x.json`);
}

function printRecord(record, out) {
  const m = record.median;
  const lines = [
    `Rig Lab fps probe (${record.mode}) · target ${record.target.name}: >= ${record.target.avgFpsMin} fps avg`,
    `  device   ${record.device.label} · ${record.device.cpu} · ${record.device.platform}`,
    `  browser  Chrome/Chromium ${record.browser.version}${record.browser.headless ? ' (headless)' : ''} · CPU x${record.method.cpuThrottle}`,
    `  GPU      ${record.gpu.renderer}`,
    `  idle     ${record.calibrationFps} fps (calibration, shows whether the frame rate is capped)`,
    `  runs     ${record.runs.map((r) => `${r.avgFps}`).join(' / ')} fps avg`,
    `  median   avg ${m.avgFps} fps · 1% low ${m.onePercentLowFps} fps · min ${m.minFps} fps · p50 ${m.p50Ms} ms · p95 ${m.p95Ms} ms · p99 ${m.p99Ms} ms · frames over ${m.framesOverMs} ms ${m.framesOverPct}%`,
    `  scene    ${JSON.stringify(record.scene)} · viewport ${record.viewport.width}x${record.viewport.height} @${record.viewport.devicePixelRatio}x`,
    `  VERDICT  ${record.verdict}: ${record.reasons.join('; ')}`,
    `  written  ${out}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    ({ values: args } = parseArgs({
      args: argv,
      options: {
        url: { type: 'string' },
        mode: { type: 'string' },
        target: { type: 'string' },
        device: { type: 'string' },
        notes: { type: 'string' },
        channel: { type: 'string' },
        executable: { type: 'string' },
        'cpu-throttle': { type: 'string' },
        runs: { type: 'string' },
        baseline: { type: 'string' },
        out: { type: 'string' },
        'ready-timeout': { type: 'string' },
        headless: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      strict: true,
    }));
  } catch (error) {
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (!args.url) {
    process.stderr.write(`--url is required\n${USAGE}\n`);
    return 2;
  }
  try {
    const record = await probe(args);
    const out = path.resolve(args.out ?? defaultOut(record));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
    printRecord(record, out);
    return exitCodeFor(record.verdict);
  } catch (error) {
    process.stderr.write(`fps-probe: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
}

function invokedDirectly() {
  try {
    return (
      Boolean(process.argv[1]) &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exitCode = await main();
}
