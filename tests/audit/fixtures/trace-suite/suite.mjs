/**
 * A stand-in for the engine's rule tests, for tests/audit/compat-trace.test.mjs. Each scenario file
 * under src/ calls defineRuleSuite with the defect it plants; "none" is the clean suite. The test
 * bodies check nothing about the engine: only the names and whether they pass matter to the trace.
 * The products named are real catalogue parts, as in phase-1-plan §3.
 */
import { expect, it } from 'vitest';

function test(title, { skip = false, fail = false } = {}) {
  (skip ? it.skip : it)(title, () => {
    expect(fail, 'a planted failure').toBe(false);
  });
}

export function defineRuleSuite(defect = 'none') {
  // cpu-socket: categorical, ok and block.
  test(
    defect === 'kind-typo'
      ? '[cpu-socket] okay: Ryzen 7 9800X3D on the TUF Gaming X870-Plus WiFi, AM5 on AM5'
      : '[cpu-socket] ok: Ryzen 7 9800X3D on the TUF Gaming X870-Plus WiFi, AM5 on AM5',
  );
  test('[cpu-socket] block: Ryzen 7 9800X3D on the TUF Gaming Z890-Plus WiFi, AM5 on LGA1851', {
    fail: defect === 'failing-negative',
  });
  // cpu-socket reads only required fields, so it has no unknown-data test; the validator tests in
  // src/data/ stand in for it. A "warn:" test is a misnamed unknown-data test.
  if (defect === 'warn-misnamed') test('[cpu-socket] warn: the board socket is not published');

  // gpu-length: numeric, so it also needs the three boundary tests.
  test(
    defect === 'id-typo'
      ? '[gpu-lenght] ok: Sapphire Pulse RX 9070 XT (320 mm) in the Fractal North (355 mm)'
      : '[gpu-length] ok: Sapphire Pulse RX 9070 XT (320 mm) in the Fractal North (355 mm)',
  );
  test(
    defect === 'synthetic-wrong-kind'
      ? '[gpu-length] block: the same card with a front 360 mm radiator (synthetic null on sapphire-pulse-radeon-rx-9070-xt-16gb)'
      : '[gpu-length] block: the same card with a front 360 mm radiator (300 mm limit)',
  );
  // The Director's ruling of 2026-10-03: gpu-length may set a field to null on a real record, in
  // its unknown-data test only, titled "(synthetic null on <catalogue part id>)".
  const unknownTitles = {
    'no-unknown': null,
    'synthetic-null':
      '[gpu-length] unknown: a 420 mm front radiator, a size the case lists no limit for (synthetic null on fractal-north-charcoal-black-tg-light)',
    'synthetic-unknown-part':
      '[gpu-length] unknown: a 420 mm front radiator, a size the case lists no limit for (synthetic null on not-a-catalogue-part)',
    'synthetic-malformed':
      '[gpu-length] unknown: the card length is not published (synthetic null, Sapphire Pulse RX 9070 XT)',
  };
  const unknownTitle =
    defect in unknownTitles
      ? unknownTitles[defect]
      : '[gpu-length] unknown: the card length is not published';
  if (unknownTitle) test(unknownTitle);
  test('[gpu-length] boundary at: a 355 mm card against the 355 mm limit');
  test('[gpu-length] boundary inside: a 354 mm card against the 355 mm limit');
  test('[gpu-length] boundary outside: a 356 mm card against the 355 mm limit', {
    skip: defect === 'skipped-boundary',
  });

  // bios-version: ok and warn, with the two FlashBack variants Hazem's decision needs.
  test('[bios-version] ok: the board shipped with a BIOS that supports the CPU');
  test(
    '[bios-version] warn: Ryzen 7 9850X3D on the TUF Gaming X870-Plus WiFi, with BIOS FlashBack: gives the update steps',
  );
  if (defect !== 'variant-missing')
    test(
      '[bios-version] warn: Core i5-14600K on the Prime B760M-A WiFi D4, without BIOS FlashBack: names BIOS 1205',
    );
  test(
    defect === 'synthetic-wrong-rule'
      ? '[bios-version] unknown: the first BIOS is not published (synthetic null on asus-tuf-gaming-x870-plus-wifi)'
      : '[bios-version] unknown: the CPU is not on the board support list',
  );

  // Not rule tests: a plain name, and another bracket convention.
  test('formats a reason with its units');
  test('[golden] cb-2026-battlefield-6-1440p-raster-nvidia-geforce-rtx-5090: not a rule test');
}
