// Renders docs/design/board/index.html into the committed board images (at 2x, then downscaled
// by tools/publish-board.py): the combined comparison and one one-screen summary per direction.
//   NODE_PATH=/opt/node22/lib/node_modules node docs/design/tools/render-board.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(ROOT, 'artifacts/screenshots/phase-0/WP-DS0/board');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  for (const view of ['compare', 'a', 'b', 'c']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('file://' + path.join(ROOT, 'docs/design/board/index.html') + (view === 'compare' ? '' : '?view=' + view), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))));
    await page.waitForTimeout(400);
    const el = await page.$(view === 'compare' ? '#compare' : '#summary');
    await el.screenshot({ path: path.join(OUT, view + '.png') });
    const box = await el.boundingBox();
    // Row check: every image in a row must be the same height, so the captions share a baseline.
    const rows = await page.evaluate(() => [...document.querySelectorAll('.pair, .summary .shots')].filter((r) => r.offsetParent).map((r) => {
      const h = [...r.querySelectorAll('img')].map((i) => +i.getBoundingClientRect().height.toFixed(1));
      const t = [...r.querySelectorAll('.cap')].map((c) => c.getBoundingClientRect().top);
      return `heights ${h.join('/')} px, caption spread ${(Math.max(...t) - Math.min(...t)).toFixed(1)} px`;
    }));
    console.log(view, Math.round(box.width) + 'x' + Math.round(box.height), 'errors=' + errors.length, '|', rows.join(' | '));
    await page.close();
  }
  await browser.close();
})();
