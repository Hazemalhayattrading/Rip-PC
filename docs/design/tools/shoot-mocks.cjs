// Screenshots the WP-DS0 mocks and checks them. Full-size PNGs go to artifacts/ (git-ignored);
// tools/publish-mocks.py makes the committed, captioned JPEGs from them.
//
//   NODE_PATH=/opt/node22/lib/node_modules node docs/design/tools/shoot-mocks.cjs [slug ...]
//
// For every shot it records: console errors, page errors, horizontal overflow at that width,
// and whether the web fonts loaded. Results: artifacts/.../mocks/shoot-log.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(ROOT, 'artifacts/screenshots/phase-0/WP-DS0/mocks');
fs.mkdirSync(OUT, { recursive: true });
const SLUGS = process.argv.slice(2).length ? process.argv.slice(2) : ['bench', 'folio', 'studio'];
const SHOTS = [
  { name: '1440-dark', w: 1440, h: 900, dpr: 2, theme: 'dark' },
  { name: '1440-light', w: 1440, h: 900, dpr: 2, theme: 'light' },
  { name: '768-dark', w: 768, h: 1024, dpr: 2, theme: 'dark' },
  { name: '390-dark', w: 390, h: 844, dpr: 3, theme: 'dark', mobile: true },
  { name: '390-light', w: 390, h: 844, dpr: 3, theme: 'light', mobile: true },
  { name: '390-dark-full', w: 390, h: 844, dpr: 2, theme: 'dark', mobile: true, full: true },
];

(async () => {
  const browser = await chromium.launch();
  const log = {};
  for (const slug of SLUGS) {
    const file = path.join(ROOT, 'docs/design/mocks', slug, 'index.html');
    fs.mkdirSync(path.join(OUT, slug), { recursive: true });
    for (const s of SHOTS) {
      const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr, isMobile: !!s.mobile, hasTouch: !!s.mobile });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      await page.goto('file://' + file + '?theme=' + s.theme, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(700);
      const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight + ' ' + f.stretch));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const out = path.join(OUT, slug, s.name + '.png');
      await page.screenshot({ path: out, fullPage: !!s.full });
      log[slug + '/' + s.name] = { file: out, width: s.w, dpr: s.dpr, theme: s.theme, errors, horizontalOverflowPx: overflow, fontsLoaded: [...new Set(fonts)].length };
      console.log(`${slug}/${s.name}: errors=${errors.length} overflow=${overflow}px fonts=${[...new Set(fonts)].length}`);
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'shoot-log.json'), JSON.stringify(log, null, 2));
  await browser.close();
})();
