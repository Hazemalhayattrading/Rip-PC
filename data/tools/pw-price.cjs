// Capture one live retailer product page with the bundled headless Chromium (no UA changes, no stealth,
// no captcha handling: a challenge page is reported as blocked and never worked around).
// Usage: node data/tools/pw-price.cjs <url> <outBase> <retailerKind>
//   retailerKind: amazon | newegg | generic
// Writes <outBase>.html (the capture) and <outBase>.png, and prints one JSON line with what the page shows.
// The price runners pick <outBase> with capture-name.mjs, so a capture is never overwritten.
/* global document -- read inside page.evaluate, which runs in the browser */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [url, outBase, kind] = process.argv.slice(2);
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  const out = { url, kind, status: 0, fetchedAtUtc: null };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    out.status = resp ? resp.status() : 0;
    await page.waitForTimeout(6000);
    out.finalUrl = page.url();
    out.fetchedAtUtc = new Date().toISOString();
    const html = await page.content();
    fs.writeFileSync(outBase + '.html', html);
    await page.screenshot({ path: outBase + '.png', fullPage: false });
    out.title = await page.title();
    out.info = await page.evaluate((k) => {
      const txt = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
      };
      const body = document.body ? document.body.innerText : '';
      const challenge =
        /Enter the characters you see below|Type the characters you see in this image|To discuss automated access|Are you a human\?|verify you are a human|Access Denied|Just a moment/i.test(body) ||
        !!document.querySelector('form[action*="validateCaptcha"], #captchacharacters');
      if (k === 'amazon') {
        const priceSels = [
          '#corePrice_feature_div .a-price .a-offscreen',
          '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
          '#apex_desktop .a-price .a-offscreen',
          '#tp_price_block_total_price_ww .a-offscreen',
          '#price_inside_buybox',
          '#newBuyBoxPrice',
        ];
        let price = null;
        for (const s of priceSels) {
          const v = txt(s);
          if (v) { price = v; break; }
        }
        return {
          challenge,
          productTitle: txt('#productTitle'),
          price,
          availability: txt('#availability'),
          soldBy: txt('#merchantInfoFeature_feature_div .offer-display-feature-text-message') || txt('#sellerProfileTriggerId') || txt('#merchant-info'),
          shipsFrom: txt('#fulfillerInfoFeature_feature_div .offer-display-feature-text-message'),
          buyingOptionsOnly: !!document.querySelector('#buybox-see-all-buying-choices'),
          outOfStockBox: !!document.querySelector('#outOfStock'),
          deliveryBlock: txt('#mir-layout-DELIVERY_BLOCK') || txt('#deliveryBlockMessage'),
          asin: (document.querySelector('input#ASIN') || {}).value || null,
        };
      }
      if (k === 'newegg') {
        return {
          challenge,
          productTitle: txt('h1.product-title'),
          price: txt('.product-buy-box .price-current') || txt('.price-current'),
          availability: txt('.product-inventory'),
          soldBy: txt('.product-seller') || txt('.product-seller-sold-by'),
        };
      }
      return { challenge, h1: txt('h1') };
    }, kind);
  } catch (e) {
    out.error = String(e && e.message ? e.message : e).slice(0, 300);
    out.fetchedAtUtc = out.fetchedAtUtc || new Date().toISOString();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(out));
})();
