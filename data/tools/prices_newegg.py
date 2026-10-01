#!/usr/bin/env python3
"""Find seed parts on Newegg (US) and capture the live product page. Same rules as prices_run.py:
one request at a time, pauses, headless Chromium with its own user agent, never work around a challenge.

Usage: python3 data/tools/prices_newegg.py partId [partId ...] [partId=ITEM ...]
Appends to artifacts/prices/results-US-newegg.jsonl.

Capture names come from capture-name.mjs, one per attempt, as in prices_run.py. Same requirements and
the same history: it ran in the cloud container for the 2026-09-30 batch, and has not run since the
path and naming changes (the Windows PC has no Python).
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
PAUSE = 5

# partId: (query, required regex on the listing title, exclude regex)
PARTS = {
    'amd-ryzen-7-5700x3d': ('AMD Ryzen 7 5700X3D', r'5700x3d', r'bundle|combo|tray|motherboard'),
    'intel-core-ultra-7-270k-plus': ('Intel Core Ultra 7 270K Plus', r'270k plus', r'bundle|combo|tray|motherboard'),
    'intel-core-ultra-5-245k': ('Intel Core Ultra 5 245K', r'\b245k\b', r'bundle|combo|tray|motherboard|245kf'),
    'asus-tuf-gaming-b650m-plus-wifi': ('ASUS TUF GAMING B650M-PLUS WIFI', r'b650m-plus wi-?fi(?! ii)', r'bundle|combo|ii\b'),
    'asus-prime-b760m-a-wifi-d4': ('ASUS PRIME B760M-A WIFI D4', r'b760m-a wi-?fi d(?:dr)?4', r'bundle|combo'),
    'nvidia-geforce-rtx-5090-founders-edition': ('NVIDIA GeForce RTX 5090 Founders Edition', r'5090.*founders', r'block|water|bracket|cable'),
    'nvidia-geforce-rtx-5070-founders-edition': ('NVIDIA GeForce RTX 5070 Founders Edition', r'5070(?! ti).*founders', r'block|water|bracket|cable'),
    'asus-dual-geforce-rtx-4060-8gb-oc': ('ASUS Dual GeForce RTX 4060 OC DUAL-RTX4060-O8G', r'dual.*4060(?! ?ti).*oc|dual-rtx4060-o8g(?!-)', r'white|evo|v2|bundle'),
    'teamgroup-t-force-delta-rgb-ddr5-6000-cl30-2x16gb': ('Team T-Force Delta RGB 32GB DDR5 6000 FF3D532G6000HC30DC01', r'ff3d532g6000hc30dc01', r'white'),
    'gskill-trident-z-neo-ddr4-3600-cl16-2x16gb': ('G.SKILL Trident Z Neo 32GB 2 x 16GB DDR4 3600 F4-3600C16D-32GTZNC', r'f4-3600c16d-32gtznc', None),
    'teamgroup-t-force-vulcan-z-ddr4-3200-cl16-2x16gb': ('Team T-Force Vulcan Z 32GB DDR4 3200 TLZGD432G3200HC16CDC01', r'tlzgd432g3200hc16cdc01', None),
    'wd-black-sn850x-2tb': ('WD_BLACK SN850X 2TB WDS200T2X0E', r'wds200t2x0e', r'heatsink'),
    'wd-blue-sa510-2-5-inch-1tb': ('WD Blue SA510 1TB 2.5 WDS100T5B0A', r'wds100t5b0a', None),
    'deepcool-pn650m': ('DeepCool PN650M', r'pn650m', r'white|\bwh\b'),
    'deepcool-pn850m': ('DeepCool PN850M', r'pn850m', r'white|\bwh\b'),
    'deepcool-ak620': ('DeepCool AK620', r'deepcool.*\bak620\b', r'digital|zero dark|white|\bwh\b|g2|pro'),
    'deepcool-an400': ('DeepCool AN400', r'deepcool.*\ban400\b', r'\bbk\b|black'),
    'nzxt-kraken-plus-240': ('NZXT Kraken Plus 240 RL-KN240-B2', r'rl-kn240-b2|kraken plus 240(?! rgb)', r'rgb|white'),
    'fractal-terra-graphite': ('Fractal Design Terra Graphite FD-C-TER1N-01', r'ter1n-01|terra.*graphite', r'jade|silver'),
    'deepcool-ch560': ('DeepCool CH560', r'deepcool.*\bch560\b', r'digital|white|\bwh\b'),
    'deepcool-fc120-3-in-1': ('DeepCool FC120 3 in 1', r'deepcool.*\bfc120\b', r'white'),
    'arctic-p14-pwm-pst-black': ('ARCTIC P14 PWM PST', r'acfan00125a|arctic p14 pwm pst(?! co)', r'white|5 ?pack|5-pack|value pack|\bco\b|argb|slim|max'),
}
CHALLENGE = re.compile(r'Are you a human\?|verify you are a human|Access Denied|Just a moment', re.I)


def pw(args):
    r = subprocess.run(['node'] + args, capture_output=True, text=True, timeout=240)
    line = (r.stdout.strip().splitlines() or ['{}'])[-1]
    try:
        return json.loads(line)
    except Exception:  # noqa: BLE001
        return {'raw': line[:300]}


def capture_base(kind, pid, date):
    """The first free US Newegg capture name for this attempt (capture-name.mjs), absolute, without extension."""
    r = subprocess.run(['node', f'{TOOLS}/capture-name.mjs', kind, 'US', pid, 'newegg', date],
                       capture_output=True, text=True, check=True, timeout=60)
    return os.path.join(ROOT, r.stdout.strip())


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def results(path):
    s = open(path, encoding='utf-8', errors='replace').read()
    txt = re.sub(r'<[^>]+>', ' ', s)
    if CHALLENGE.search(txt):
        return None
    out = []
    # The rendered page puts the listing title in the anchor text (the title attribute is often "View Details").
    for m in re.finditer(r'<a href="(https://www\.newegg\.com/(?:[^"]+?/)?p/([A-Z0-9-]+)[^"]*)"[^>]*class="item-title"[^>]*>(.*?)</a>', s, re.S):
        href, item = html.unescape(m.group(1)), m.group(2)
        title = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', m.group(3)))).strip()
        sponsored = 'SB-_-' in href or 'SP-_-' in href
        out.append({'item': item, 'url': href.split('?')[0], 'title': title, 'sponsored': sponsored})
    return out


def main():
    rpath = f'{ROOT}/artifacts/prices/results-US-newegg.jsonl'
    os.makedirs(f'{ROOT}/artifacts/prices/search/US', exist_ok=True)
    for arg in sys.argv[1:]:
        if '=' in arg:
            # partId=ITEM: capture a listing chosen in review (e.g. the black variant when search picked white).
            pid, item = arg.split('=', 1)
            pick = {'item': item, 'url': f'https://www.newegg.com/p/{item}', 'title': '(chosen in review)', 'sponsored': False}
            rec = {'partId': pid, 'market': 'US', 'retailer': 'newegg', 'query': None, 'directItem': item}
            date = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
            base = capture_base('product', pid, date)
            prod = pw([f'{TOOLS}/pw-price.cjs', pick['url'], base, 'newegg'])
            rec.update({'pick': pick, 'productUrl': pick['url'], 'product': prod, 'capture': rel(base + '.html')})
            rec['outcome'] = 'blocked-product' if (prod.get('info') or {}).get('challenge') else 'captured'
            with open(rpath, 'a') as fh:
                fh.write(json.dumps(rec) + '\n')
            print(pid, '| direct', item, '|', ((prod.get('info') or {}).get('productTitle') or '')[:90], '|', rec['outcome'])
            time.sleep(PAUSE)
            continue
        pid = arg
        query, must, excl = PARTS[pid]
        rec = {'partId': pid, 'market': 'US', 'retailer': 'newegg', 'query': query}
        surl = 'https://www.newegg.com/p/pl?d=' + urllib.parse.quote_plus(query)
        sdate = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
        sbase = capture_base('search', pid, sdate)
        res = pw([f'{TOOLS}/pw-fetch.cjs', surl, sbase, '--wait=4000'])
        rec['searchCapture'] = rel(sbase + '.html')
        rec['searchUrl'] = surl
        rec['searchFetchedAtUtc'] = res.get('fetchedAtUtc')
        cands = results(sbase + '.html') if os.path.exists(sbase + '.html') else None
        if cands is None:
            rec['outcome'] = 'blocked-search'
            with open(rpath, 'a') as fh:
                fh.write(json.dumps(rec) + '\n')
            print(pid, 'BLOCKED at search; stopping')
            return
        matched = [c for c in cands if re.search(must, c['title'], re.I) and not (excl and re.search(excl, c['title'], re.I))
                   and not re.search(r'refurbished|renewed|open box|\bused\b', c['title'], re.I)]
        rec['candidates'] = matched[:5]
        pick = next((c for c in matched if not c['sponsored']), None) or (matched[0] if matched else None)
        time.sleep(PAUSE)
        if pick is None:
            rec['outcome'] = 'no-match'
            with open(rpath, 'a') as fh:
                fh.write(json.dumps(rec) + '\n')
            print(pid, 'no match among', len(cands))
            continue
        date = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
        base = capture_base('product', pid, date)
        prod = pw([f'{TOOLS}/pw-price.cjs', pick['url'], base, 'newegg'])
        rec.update({'pick': pick, 'productUrl': pick['url'], 'product': prod, 'capture': rel(base + '.html')})
        rec['outcome'] = 'blocked-product' if (prod.get('info') or {}).get('challenge') else 'captured'
        with open(rpath, 'a') as fh:
            fh.write(json.dumps(rec) + '\n')
        info = prod.get('info') or {}
        print(pid, '|', pick['item'], '|', (info.get('productTitle') or '')[:70], '|', info.get('price'), '|',
              (info.get('availability') or '')[:25], '|', (info.get('soldBy') or '')[:40])
        if rec['outcome'] == 'blocked-product':
            print('challenge page on product fetch; stopping')
            return
        time.sleep(PAUSE)


main()
