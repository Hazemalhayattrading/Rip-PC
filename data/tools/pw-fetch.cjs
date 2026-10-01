// Capture a live page with the bundled headless Chromium (no UA changes, no stealth).
// Usage: node data/tools/pw-fetch.cjs <url> <outBase> [--wait=ms] [--full]
// Writes <outBase>.html, <outBase>.txt (innerText), <outBase>.png and prints a one-line summary.
/* global document -- read inside page.evaluate, which runs in the browser */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [url, outBase, ...flags] = process.argv.slice(2);
  if (!url || !outBase) {
    console.error('usage: pw-fetch.cjs <url> <outBase> [--wait=ms] [--full]');
    process.exit(2);
  }
  const waitFlag = flags.find((f) => f.startsWith('--wait='));
  const waitMs = waitFlag ? Number(waitFlag.split('=')[1]) : 4000;
  const full = flags.includes('--full');
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  let status = 0;
  let finalUrl = url;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp ? resp.status() : 0;
    await page.waitForTimeout(waitMs);
    finalUrl = page.url();
    const html = await page.content();
    const text = await page.evaluate(() => document.body ? document.body.innerText : '');
    fs.writeFileSync(outBase + '.html', html);
    fs.writeFileSync(outBase + '.txt', text);
    await page.screenshot({ path: outBase + '.png', fullPage: full });
    const title = await page.title();
    console.log(JSON.stringify({ status, finalUrl, title, htmlBytes: html.length, textChars: text.length, fetchedAtUtc: new Date().toISOString() }));
  } catch (e) {
    console.log(JSON.stringify({ status, finalUrl, error: String(e && e.message ? e.message : e).slice(0, 300), fetchedAtUtc: new Date().toISOString() }));
  } finally {
    await browser.close();
  }
})();
