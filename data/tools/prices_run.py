#!/usr/bin/env python3
"""Find each seed part on Amazon (US: amazon.com, SA: amazon.sa) and capture its live product page.

Usage: python3 data/tools/prices_run.py <US|SA> [partId ...] [partId=ASIN ...]
One request at a time, pause between requests, headless Chromium with its own user agent (no stealth,
no captcha handling). A challenge page stops the run for that market; it is never worked around.
Appends one JSON line per part to artifacts/prices/results-<market>.jsonl for review.

Every attempt gets its own capture name from capture-name.mjs (<partId>--<retailer>--<date>, then
--2, --3 ... for later attempts that day), so a rejected capture is never overwritten. Needs Python 3,
Node, `npm ci` (for Playwright) and `npx playwright install chromium`. It ran the 2026-09-30 seed batch
in the cloud container. Since then the paths are relative to this file, NODE_PATH is gone, and the
capture names come from capture-name.mjs. Not run since those changes: the Windows PC has no Python.
"""
import datetime
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(TOOLS, '..', '..'))
PAUSE = 4

# Accessories that name a GPU model in their title (water blocks, brackets, cables).
ACC_EX = r'block|water|bracket|backplate|cable|holder|riser|cooler|stand|support'

# partId: (search query, required regex, exclude regex or None)
PARTS = {
    'amd-ryzen-7-9850x3d': ('AMD Ryzen 7 9850X3D processor', r'9850x3d', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|co\.jp'),
    'amd-ryzen-7-9800x3d': ('AMD Ryzen 7 9800X3D processor', r'9800x3d', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|co\.jp'),
    'amd-ryzen-9-9950x': ('AMD Ryzen 9 9950X processor', r'9950x(?!3d)\b', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|x3d'),
    'amd-ryzen-7-9700x': ('AMD Ryzen 7 9700X processor', r'9700x\b', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)'),
    'amd-ryzen-5-9600x': ('AMD Ryzen 5 9600X processor', r'9600x\b', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|x3d'),
    'amd-ryzen-7-7800x3d': ('AMD Ryzen 7 7800X3D processor', r'7800x3d', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)'),
    'amd-ryzen-5-7600': ('AMD Ryzen 5 7600 processor', r'\b7600\b(?!x)', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|mpk|7600x'),
    'amd-ryzen-7-5700x3d': ('AMD Ryzen 7 5700X3D processor', r'5700x3d', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)'),
    'amd-ryzen-5-5600': ('AMD Ryzen 5 5600 processor', r'\b5600\b(?![xgt])', r'motherboard|bundle|tray|unboxed|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|5600x|5600g|5600t'),
    'intel-core-ultra-9-285k': ('Intel Core Ultra 9 285K processor', r'\b285k\b', r'motherboard|bundle|tray|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|285kf'),
    'intel-core-ultra-7-270k-plus': ('Intel Core Ultra 7 270K Plus processor', r'270k plus', r'motherboard|bundle|tray|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)'),
    'intel-core-ultra-7-265k': ('Intel Core Ultra 7 265K processor', r'\b265k\b', r'motherboard|bundle|tray|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|265kf'),
    'intel-core-ultra-5-245k': ('Intel Core Ultra 5 245K processor', r'\b245k\b', r'motherboard|bundle|tray|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|245kf'),
    'intel-core-i7-14700k': ('Intel Core i7-14700K processor', r'\b14700k\b', r'motherboard|bundle|tray|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|14700kf'),
    'intel-core-i5-14600k': ('Intel Core i5-14600K processor', r'\b14600k\b', r'motherboard|bundle|tray|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)|14600kf'),
    'intel-core-i5-12400f': ('Intel Core i5-12400F processor', r'\b12400f\b', r'motherboard|bundle|tray|combo|\+ ?(?:tuf|rog|prime|msi|asus|gigabyte|asrock|mag|mpg|aorus|b[678]50|x[678]70)'),
    'asus-tuf-gaming-b650-plus-wifi': ('ASUS TUF GAMING B650-PLUS WIFI motherboard', r'tuf.{0,12}b650-plus wi-?fi(?! ii)', r'b650m|b650e|bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'asus-tuf-gaming-x870-plus-wifi': ('ASUS TUF GAMING X870-PLUS WIFI motherboard', r'x870-plus wi-?fi', r'x870e|bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'asus-rog-strix-b650e-i-gaming-wifi': ('ASUS ROG STRIX B650E-I GAMING WIFI', r'b650e-i', r'bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'asus-tuf-gaming-b650m-plus-wifi': ('ASUS TUF GAMING B650M-PLUS WIFI motherboard', r'b650m-plus wi-?fi(?! ii)', r'bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+|b650m-plus ii'),
    'asus-tuf-gaming-b550-plus-wifi-ii': ('ASUS TUF GAMING B550-PLUS WIFI II motherboard', r'b550-plus wi-?fi ii', r'b550m|bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'asus-tuf-gaming-z890-plus-wifi': ('ASUS TUF GAMING Z890-PLUS WIFI motherboard', r'z890-plus wi-?fi', r'bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'asus-prime-b760m-a-wifi-d4': ('ASUS PRIME B760M-A WIFI D4 motherboard', r'b760m-a wi-?fi d(?:dr)?4', r'bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'nvidia-geforce-rtx-5090-founders-edition': ('NVIDIA GeForce RTX 5090 Founders Edition', r'5090.*founders|founders.*5090', ACC_EX),
    'nvidia-geforce-rtx-5080-founders-edition': ('NVIDIA GeForce RTX 5080 Founders Edition', r'5080.*founders|founders.*5080', ACC_EX),
    'nvidia-geforce-rtx-5070-founders-edition': ('NVIDIA GeForce RTX 5070 Founders Edition', r'5070(?! ti).*founders|founders.*5070(?! ti)', ACC_EX),
    'asus-tuf-gaming-geforce-rtx-5070-ti-16gb-oc': ('ASUS TUF Gaming GeForce RTX 5070 Ti 16GB OC TUF-RTX5070TI-O16G-GAMING', r'tuf.*5070 ?ti.*oc', r'white|bundle|combo'),
    'asus-dual-geforce-rtx-5060-ti-16gb-oc': ('ASUS Dual GeForce RTX 5060 Ti 16GB OC DUAL-RTX5060TI-O16G', r'dual.*5060 ?ti.*16', r'white|evo|bundle|combo|8gb'),
    'asus-dual-geforce-rtx-5060-8gb-oc': ('ASUS Dual GeForce RTX 5060 8GB OC DUAL-RTX5060-O8G', r'dual.*rtx ?5060(?! ?ti).*oc', r'white|evo|bundle|combo'),
    'asus-dual-geforce-rtx-4060-8gb-oc': ('ASUS Dual GeForce RTX 4060 OC 8GB DUAL-RTX4060-O8G', r'dual.*4060(?! ?ti).*oc', r'white|evo|bundle|combo|v2'),
    'sapphire-pulse-radeon-rx-9070-xt-16gb': ('SAPPHIRE PULSE Radeon RX 9070 XT 16GB', r'pulse.*9070 ?xt', r'bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'sapphire-pulse-radeon-rx-9070-16gb': ('SAPPHIRE PULSE Radeon RX 9070 16GB', r'pulse.*9070(?! ?xt)', r'bundle|combo|with (?:amd|intel|ryzen|core)|processor \+|cpu \+'),
    'sapphire-pulse-radeon-rx-9060-xt-oc-16gb': ('SAPPHIRE PULSE Radeon RX 9060 XT OC 16GB', r'pulse.*9060 ?xt.*16', r'bundle|combo|8gb'),
    'teamgroup-t-force-delta-rgb-ddr5-6000-cl30-2x16gb': ('TEAMGROUP T-Force Delta RGB DDR5 6000 CL30 32GB FF3D532G6000HC30DC01', r'ff3d532g6000hc30dc01|delta rgb.*ddr5.*(?:32gb|2x16).*6000.*cl30', r'bundle|with .{0,30}ssd|white|64gb|48gb|cl38|cl36|cl32|cl28'),
    'gskill-flare-x5-ddr5-6000-cl30-2x16gb': ('G.SKILL Flare X5 DDR5 6000 CL30 32GB F5-6000J3038F16GX2-FX5', r'flare x5.*(?:32gb|2x16)|f5-6000j3038f16gx2-fx5', r'white|64gb|48gb|cl36|cl32|cl28'),
    'gskill-trident-z5-neo-rgb-ddr5-6000-cl30-2x16gb': ('G.SKILL Trident Z5 Neo RGB DDR5 6000 CL30 32GB F5-6000J3038F16GX2-TZ5NR', r'trident z5 neo rgb.*(?:32gb|2x16)|f5-6000j3038f16gx2-tz5nr', r'64gb|48gb|cl36|cl32|cl28|96gb'),
    'gskill-trident-z5-ck-ddr5-8200-cl40-2x24gb': ('G.SKILL Trident Z5 CK DDR5 8200 48GB F5-8200C4052G24GX2-TZ5CK', r'trident z5 ck.*(?:48gb|2x24)|f5-8200c4052g24gx2-tz5ck', r'rgb|32gb|96gb'),
    'gskill-trident-z-neo-ddr4-3600-cl16-2x16gb': ('G.SKILL Trident Z Neo DDR4 3600 CL16 32GB F4-3600C16D-32GTZNC', r'trident z neo.*(?:32gb|2x16).*3600|f4-3600c16d-32gtznc', r'64gb|16gb \(2x8|cl18|cl14'),
    'teamgroup-t-force-vulcan-z-ddr4-3200-cl16-2x16gb': ('TEAMGROUP T-Force Vulcan Z DDR4 3200 CL16 32GB TLZGD432G3200HC16CDC01', r'vulcan z.*(?:32gb|2x16).*3200|tlzgd432g3200hc16', r'64gb|16gb \(2x8|red'),
    'wd-black-sn8100-2tb': ('WD_BLACK SN8100 2TB NVMe SSD WDS200T1X0M', r'sn8100.*2tb|2tb.*sn8100', r'with heatsink|w/ ?heatsink|1tb|4tb|8tb'),
    'wd-black-sn850x-2tb': ('WD_BLACK SN850X 2TB NVMe SSD WDS200T2X0E', r'sn850x.*2tb|2tb.*sn850x', r'with heatsink|w/ ?heatsink|1tb|4tb|8tb|ps5'),
    'wd-black-sn7100-1tb': ('WD_BLACK SN7100 1TB NVMe SSD WDS100T4X0E', r'sn7100.*1tb|1tb.*sn7100', r'2tb|4tb|500gb|sn7100x'),
    'wd-blue-sa510-2-5-inch-1tb': ('WD Blue SA510 SATA SSD 2.5 inch 1TB WDS100T5B0A', r'wds100t5b0a', r'm\.2|2tb|500gb|250gb|4tb'),
    'samsung-990-pro-2tb': ('Samsung 990 PRO 2TB NVMe SSD MZ-V9P2T0BW', r'990 pro.*2tb|2tb.*990 pro', r'heatsink|1tb|4tb|evo'),
    'deepcool-pn650m': ('DeepCool PN650M 650W ATX 3.1 power supply', r'pn650m', r'white|\bwh\b'),
    'deepcool-pn850m': ('DeepCool PN850M 850W ATX 3.1 power supply', r'pn850m', r'white|\bwh\b'),
    'nzxt-c850-gold-atx-3-1': ('NZXT C850 Gold ATX 3.1 PA-8G2BB-US', r'c850.*gold|pa-8g2bb', r'core|sfx|white|pa-8g2bw|pack of'),
    'nzxt-c1200-gold-atx-3-1': ('NZXT C1200 Gold ATX 3.1 PA-2G2BB-US', r'c1200.*gold|pa-2g2bb', r'core|white|pa-2g2bw|pack of'),
    'nzxt-c850-sfx-gold': ('NZXT C850 SFX Gold PS-8G1BB-US', r'c850 sfx|ps-8g1bb', r'white'),
    'deepcool-ak620': ('DeepCool AK620 CPU cooler', r'deepcool.{0,40}\bak620\b|\bak620\b.{0,60}deepcool', r'digital|zero dark|white|\bwh\b|g2|pro'),
    'deepcool-an400': ('DeepCool AN400 low profile CPU cooler', r'\ban400\b', r'\bbk\b|black'),
    'arctic-liquid-freezer-iii-pro-360': ('ARCTIC Liquid Freezer III Pro 360', r'liquid freezer iii pro 360', r'a-rgb|argb|white'),
    'arctic-liquid-freezer-iii-pro-280': ('ARCTIC Liquid Freezer III Pro 280', r'liquid freezer iii pro 280', r'a-rgb|argb|white'),
    'nzxt-kraken-plus-240': ('NZXT Kraken Plus 240 RL-KN240-B2', r'kraken plus 240|rl-kn240-b2', r'rgb|white|elite|core'),
    'fractal-north-charcoal-black-tg-light': ('Fractal Design North Charcoal Black TG Light FD-C-NOR1C-02', r'\bnorth\b.*(?:charcoal|black).*(?:tg|tempered glass)|nor1c-02', r'\bxl\b|white|chalk|mesh'),
    'fractal-pop-air-rgb-black-tg-clear-tint': ('Fractal Design Pop Air RGB Black TG Clear Tint FD-C-POR1A-06', r'pop air rgb.*black|por1a-06', r'mini|white|cyan|magenta|orange|solid|silent'),
    'fractal-pop-mini-air-rgb-black-tg-clear-tint': ('Fractal Design Pop Mini Air RGB Black TG Clear Tint FD-C-POR1M-06', r'pop mini air rgb.*black|por1m-06', r'white|silent'),
    'fractal-terra-graphite': ('Fractal Design Terra Graphite Mini-ITX case FD-C-TER1N-01', r'\bterra\b.*graphite|ter1n-01', r'jade|silver'),
    'deepcool-ch560': ('DeepCool CH560 ATX case', r'\bch560\b', r'digital|white|\bwh\b'),
    'arctic-p12-pwm-pst-black': ('ARCTIC P12 PWM PST 120mm case fan', r'\bp12 pwm pst\b', r'value pack|5 pack|5-pack|pack of 5|a-rgb|argb|white|max|pro|slim|\bco\b'),
    'arctic-p14-pwm-pst-black': ('ARCTIC P14 PWM PST black ACFAN00125A', r'\bp14 pwm pst\b', r'value pack|5 pack|5-pack|pack of 5|a-rgb|argb|white|max|pro|slim|\bco\b'),
    'deepcool-fc120-3-in-1': ('DeepCool FC120 3 in 1 ARGB fan', r'\bfc120\b', r'white|single'),
}

MARKET = {
    'US': {'retailer': 'amazon-us', 'search': 'https://www.amazon.com/s?k={q}', 'product': 'https://www.amazon.com/dp/{asin}'},
    'SA': {'retailer': 'amazon-sa', 'search': 'https://www.amazon.sa/-/en/s?k={q}', 'product': 'https://www.amazon.sa/-/en/dp/{asin}'},
}
CHALLENGE = re.compile(r'validateCaptcha|Enter the characters you see below|Type the characters you see|To discuss automated access', re.I)


def search_results(path):
    s = open(path, encoding='utf-8', errors='replace').read()
    if CHALLENGE.search(s):
        return None
    out = []
    pat = r'<div[^>]+data-asin="(B[0-9A-Z]{9})"[^>]*data-component-type="s-search-result"(.*?)(?=<div[^>]+data-asin="B[0-9A-Z]{9}"[^>]*data-component-type="s-search-result"|$)'
    for m in re.finditer(pat, s, re.S):
        asin, block = m.group(1), m.group(2)
        t = re.search(r'<h2[^>]*aria-label="([^"]+)"', block) or re.search(r'<h2[^>]*>.*?<span[^>]*>([^<]+)</span>', block, re.S)
        title = html.unescape(t.group(1)) if t else ''
        title = re.sub(r'^Sponsored Ad - ', '', title)
        price = re.search(r'<span class="a-offscreen">([^<]+)</span>', block)
        out.append({'asin': asin, 'title': title, 'price': html.unescape(price.group(1)) if price else None,
                    'sponsored': 'Sponsored' in block})
    return out


def pw(args):
    r = subprocess.run(['node'] + args, capture_output=True, text=True, timeout=240)
    line = (r.stdout.strip().splitlines() or ['{}'])[-1]
    try:
        return json.loads(line)
    except Exception:  # noqa: BLE001
        return {'raw': line[:300], 'stderr': r.stderr[-300:]}


def capture_base(kind, market, pid, retailer, date):
    """The first free capture name for this attempt (capture-name.mjs), as an absolute path without extension."""
    r = subprocess.run(['node', f'{TOOLS}/capture-name.mjs', kind, market, pid, retailer, date],
                       capture_output=True, text=True, check=True, timeout=60)
    return os.path.join(ROOT, r.stdout.strip())


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def main():
    market = sys.argv[1]
    # An argument "partId=ASIN" skips the search and captures that listing (an ASIN already identified
    # as this exact part, e.g. from the other market's matched listing).
    direct = dict(a.split('=', 1) for a in sys.argv[2:] if '=' in a)
    only = {a.split('=', 1)[0] for a in sys.argv[2:]}
    cfg = MARKET[market]
    os.makedirs(f'{ROOT}/artifacts/prices/{market}', exist_ok=True)
    os.makedirs(f'{ROOT}/artifacts/prices/search/{market}', exist_ok=True)
    results = f'{ROOT}/artifacts/prices/results-{market}.jsonl'
    for pid, (query, must, excl) in PARTS.items():
        if only and pid not in only:
            continue
        rec = {'partId': pid, 'market': market, 'retailer': cfg['retailer'], 'query': query}
        if pid in direct:
            date = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
            base = capture_base('product', market, pid, cfg['retailer'], date)
            purl = cfg['product'].format(asin=direct[pid])
            prod = pw([f'{TOOLS}/pw-price.cjs', purl, base, 'amazon'])
            rec.update({'pick': {'asin': direct[pid], 'title': None, 'price': None, 'sponsored': False, 'direct': True},
                        'productUrl': purl, 'product': prod, 'capture': rel(base + '.html')})
            rec['outcome'] = 'blocked-product' if (prod.get('info') or {}).get('challenge') else 'captured'
            with open(results, 'a') as fh:
                fh.write(json.dumps(rec) + '\n')
            info = prod.get('info') or {}
            print(pid, '| direct', direct[pid], '|', (info.get('productTitle') or '')[:70], '|', info.get('price'), '|',
                  (info.get('soldBy') or '')[:30])
            time.sleep(PAUSE)
            continue
        surl = cfg['search'].format(q=urllib.parse.quote_plus(query))
        sdate = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
        sbase = capture_base('search', market, pid, cfg['retailer'], sdate)
        res = pw([f'{TOOLS}/pw-fetch.cjs', surl, sbase, '--wait=4000'])
        rec['searchCapture'] = rel(sbase + '.html')
        rec['searchUrl'] = surl
        rec['searchFetchedAtUtc'] = res.get('fetchedAtUtc')
        cands = search_results(sbase + '.html') if os.path.exists(sbase + '.html') else None
        if cands is None:
            rec['outcome'] = 'blocked-search'
            with open(results, 'a') as fh:
                fh.write(json.dumps(rec) + '\n')
            print(pid, 'BLOCKED at search; stopping this market')
            return
        matched = [c for c in cands if re.search(must, c['title'], re.I) and not (excl and re.search(excl, c['title'], re.I))
                   and not re.search(r'renewed|refurbished|\bused\b|open box', c['title'], re.I)]
        rec['candidates'] = matched[:5]
        pick = next((c for c in matched if not c['sponsored']), None) or (matched[0] if matched else None)
        time.sleep(PAUSE)
        if pick is None:
            rec['outcome'] = 'no-match'
            with open(results, 'a') as fh:
                fh.write(json.dumps(rec) + '\n')
            print(pid, 'no matching listing among', len(cands), 'results')
            continue
        date = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
        base = capture_base('product', market, pid, cfg['retailer'], date)
        purl = cfg['product'].format(asin=pick['asin'])
        prod = pw([f'{TOOLS}/pw-price.cjs', purl, base, 'amazon'])
        fdate = (prod.get('fetchedAtUtc') or '')[:10]
        if fdate and fdate != date:  # crossed midnight UTC: rename so the file date equals retrievedAt
            nbase = capture_base('product', market, pid, cfg['retailer'], fdate)  # a free name, never overwrites
            for ext in ('.html', '.png'):
                if os.path.exists(base + ext):
                    os.rename(base + ext, nbase + ext)
            base = nbase
        rec.update({'pick': pick, 'productUrl': purl, 'product': prod, 'capture': rel(base + '.html')})
        rec['outcome'] = 'blocked-product' if (prod.get('info') or {}).get('challenge') else 'captured'
        with open(results, 'a') as fh:
            fh.write(json.dumps(rec) + '\n')
        info = prod.get('info') or {}
        print(pid, '|', pick['asin'], '|', (info.get('productTitle') or '')[:70], '|', info.get('price'), '|',
              (info.get('availability') or '')[:25], '|', (info.get('soldBy') or '')[:30])
        if rec['outcome'] == 'blocked-product':
            print('challenge page on product fetch; stopping this market')
            return
        time.sleep(PAUSE)


main()
