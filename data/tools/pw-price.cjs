// Capture one live retailer product page with the bundled headless Chromium (no UA changes, no stealth,
// no captcha handling: a challenge page is reported as blocked and never worked around).
// Usage: node data/tools/pw-price.cjs <url> <outBase> <retailerKind> [--us-zip=<5-digit ZIP>]
//   retailerKind: amazon | newegg | generic
//   --us-zip (amazon.com product pages only): before the product page loads, set a US delivery location
//     the normal way, with Amazon's own "Deliver to" control: open the amazon.com home page in the same
//     browser context, answer "Stay on Amazon.com" if Amazon offers its local site, click "Deliver to",
//     type the ZIP into "or enter a US zip code", press Apply, then Continue or Done. The JSON line gets
//     "location": the header's location before and after, and on the product page ("productPage"); "ok" is
//     true only when the product page shows the ZIP. A challenge on the home page stops there: that page
//     is saved as the capture and reported as blocked.
// Writes <outBase>.html (the capture) and <outBase>.png, and prints one JSON line with what the page shows.
// The price runners pick <outBase> with capture-name.mjs, so a capture is never overwritten.
/* global document -- read inside page.evaluate, which runs in the browser */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// The challenge test of the page evaluate below, reused for the --us-zip home page step.
const CHALLENGE_TEXT =
  /Enter the characters you see below|Type the characters you see in this image|To discuss automated access|Are you a human\?|verify you are a human|Access Denied|Just a moment/i;

/** The location shown in Amazon's header ("Deliver to" line 2), or null. */
async function headerLocation(page) {
  return page
    .evaluate(() => {
      const el = document.querySelector('#glow-ingress-line2');
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
    })
    .catch(() => null);
}

const errorText = (e) => String(e && e.message ? e.message : e).slice(0, 2000);

/**
 * --us-zip: set a US delivery ZIP on amazon.com with the site's own control (see the usage above).
 * Always returns what it saw; a failed step leaves `error` and the run goes on to the product page,
 * whose header then shows where Amazon delivers to (so `ok` stays false).
 */
async function setUsZip(page, zip) {
  const loc = { zip, ok: false, challenge: false };
  try {
    await setUsZipSteps(page, zip, loc);
  } catch (e) {
    loc.error = errorText(e);
  }
  return loc;
}

async function setUsZipSteps(page, zip, loc) {
  const resp = await page.goto('https://www.amazon.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  loc.homeStatus = resp ? resp.status() : 0;
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  loc.challenge = await page.evaluate(
    (src) =>
      new RegExp(src, 'i').test(document.body ? document.body.innerText : '') ||
      !!document.querySelector('form[action*="validateCaptcha"], #captchacharacters'),
    CHALLENGE_TEXT.source,
  );
  if (loc.challenge) return;
  loc.before = await headerLocation(page);
  // From outside the US, Amazon may cover the page with "You are on Amazon.com / Visiting from KSA? Visit
  // Amazon.sa" (#redir-overlay), which blocks the header. A shopper answers "Stay on Amazon.com"; that
  // choice is recorded, and the location is then set with "Deliver to" as usual.
  const answerRedirect = async () => {
    const stay = page.locator('#redir-stay-at-www');
    if (await stay.isVisible().catch(() => false)) {
      await stay.click({ timeout: 15000 });
      loc.stayedOnAmazonCom = true;
      await page.waitForTimeout(1500);
    }
  };
  const input = page.locator('#GLUXZipUpdateInput');
  const openDialog = async () => {
    await answerRedirect();
    await page.locator('#nav-global-location-popover-link').click({ timeout: 15000 });
    await input.waitFor({ state: 'visible', timeout: 20000 });
  };
  // Tried twice, because the overlay above can appear after the first look for it.
  try {
    await openDialog();
  } catch (e) {
    loc.firstClickError = errorText(e);
    await page.waitForTimeout(2000);
    await openDialog();
  }
  await input.fill(zip);
  await page.waitForTimeout(1000);
  await page.locator('#GLUXZipUpdate').click({ timeout: 15000 });
  await page.waitForTimeout(3000);
  // Amazon then offers "Continue" (or the dialog's "Done"), which closes the dialog and reloads the page.
  for (const sel of ['#GLUXConfirmClose', 'button[name="glowDoneButton"]']) {
    const button = page.locator(sel).first();
    if (await button.isVisible().catch(() => false)) {
      loc.closedWith = sel;
      await button.click({ timeout: 15000 }).catch((e) => {
        loc.closeError = errorText(e);
      });
      break;
    }
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  loc.after = await headerLocation(page);
}

(async () => {
  const args = process.argv.slice(2);
  const [url, outBase, kind] = args.filter((a) => !a.startsWith('--'));
  const zipFlag = args.find((a) => a.startsWith('--us-zip='));
  const usZip = zipFlag ? zipFlag.slice('--us-zip='.length) : null;
  if (usZip !== null && (!/^\d{5}$/.test(usZip) || kind !== 'amazon' || !/^https:\/\/www\.amazon\.com\//.test(url))) {
    console.error('--us-zip=<5-digit ZIP> works only with kind amazon and an https://www.amazon.com/ page');
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  const out = { url, kind, status: 0, fetchedAtUtc: null };
  try {
    if (usZip !== null) {
      out.location = await setUsZip(page, usZip);
      if (out.location.challenge) {
        // A challenge before the product page: save it as the capture and stop (never worked around).
        out.finalUrl = page.url();
        out.fetchedAtUtc = new Date().toISOString();
        fs.writeFileSync(outBase + '.html', await page.content());
        await page.screenshot({ path: outBase + '.png', fullPage: false });
        out.title = await page.title();
        out.info = { challenge: true, stage: 'us-zip' };
        throw new Error('challenge page in the --us-zip step; stopped before the product page');
      }
      await page.waitForTimeout(3000);
    }
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
    if (out.location) {
      out.location.productPage = await headerLocation(page);
      out.location.ok = !!out.location.productPage && out.location.productPage.includes(usZip);
    }
  } catch (e) {
    out.error = String(e && e.message ? e.message : e).slice(0, 300);
    out.fetchedAtUtc = out.fetchedAtUtc || new Date().toISOString();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(out));
})();
