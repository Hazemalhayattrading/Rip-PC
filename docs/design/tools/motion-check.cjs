// Motion evidence for the WP-DS0 mocks: frame timing during real interactions, which properties
// animate, and that reduced motion really removes the motion.
//
//   NODE_PATH=/opt/node22/lib/node_modules node docs/design/tools/motion-check.cjs
//
// Headless Chromium on this container is not the Core Ultra 7 155H reference laptop; the 4x CPU
// throttled run is a stress proxy. QA re-measures on the reference machine (BUILD_PROMPT §8).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(ROOT, 'artifacts/screenshots/phase-0/WP-DS0/mocks/motion-log.json');
const MOCKS = {
  bench: { market: '.seg button[data-cur="usd"]', back: '.seg button[data-cur="sar"]', row: 'tr.part[data-id="7800x3d"] td.c-name' },
  folio: { market: '.market button[data-cur="usd"]', back: '.market button[data-cur="sar"]', row: 'tr.part[data-id="7800x3d"] td.c-name' },
  studio: { market: '.pill button[data-cur="usd"]', back: '.pill button[data-cur="sar"]', row: '.part[data-id="7800x3d"] .pn' },
};

async function run(browser, slug, sel, { throttle = 1, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(ROOT, 'docs/design/mocks', slug, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  if (throttle > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  // Sampler: every frame interval, long animation frames, and the properties of every running animation.
  await page.evaluate(() => {
    window.__f = []; window.__loaf = []; window.__props = new Set(); window.__anims = 0;
    let last = performance.now();
    const tick = (t) => { window.__f.push(t - last); last = t; for (const a of document.getAnimations()) { window.__anims++; const e = a.effect; if (a.transitionProperty) window.__props.add(a.transitionProperty); else if (e && e.getKeyframes) for (const k of e.getKeyframes()) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) window.__props.add(p); } if (window.__run) requestAnimationFrame(tick); };
    window.__run = true; requestAnimationFrame(tick);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push(Math.round(e.duration)); }).observe({ type: 'long-animation-frame', buffered: false }); } catch (_) {}
  });
  await page.click(sel.market); await page.waitForTimeout(700);
  await page.click(sel.back); await page.waitForTimeout(700);
  await page.click(sel.row); await page.waitForTimeout(800);
  const r = await page.evaluate(() => { window.__run = false; return { f: window.__f.slice(1), loaf: window.__loaf, props: [...window.__props], anims: window.__anims }; });
  await ctx.close();
  const f = r.f.slice().sort((a, b) => a - b);
  const pct = (p) => f[Math.min(f.length - 1, Math.floor(p * f.length))];
  return {
    frames: f.length, meanMs: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(2), p95Ms: +pct(0.95).toFixed(2), maxMs: +f[f.length - 1].toFixed(2),
    over20ms: f.filter((x) => x > 20).length, longAnimationFrames: r.loaf, animatedProperties: r.props, animationSamples: r.anims,
  };
}

(async () => {
  const browser = await chromium.launch();
  const log = {};
  for (const [slug, sel] of Object.entries(MOCKS)) {
    log[slug] = {
      normal: await run(browser, slug, sel),
      cpu4x: await run(browser, slug, sel, { throttle: 4 }),
      reducedMotion: await run(browser, slug, sel, { reduced: true }),
    };
    for (const [k, v] of Object.entries(log[slug])) {
      console.log(`${slug.padEnd(6)} ${k.padEnd(13)} frames=${v.frames} mean=${v.meanMs}ms p95=${v.p95Ms}ms max=${v.maxMs}ms >20ms=${v.over20ms} LoAF=${JSON.stringify(v.longAnimationFrames)} props=${JSON.stringify(v.animatedProperties)} samples=${v.animationSamples}`);
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(log, null, 2));
  await browser.close();
})();
