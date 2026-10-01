#!/usr/bin/env python3
"""Seeded 20% audit sample for the 2026-09-30 seed batch.

Draws ceil(20%) of every batch with one seeded generator, in a fixed order, from records sorted by ID:
spec records per category, price observations and gaps per market, game and creator benchmark rows, and
games. Writes the sample to artifacts/audit/sample-2026-09-30.json. The draw is reproducible: same seed,
same data, same sample. The results are recorded in data/audits.json.

Run from anywhere with Python 3: `python3 data/tools/audit_sample.py`. It drew the 2026-09-30 sample in the
cloud container (on the data as of that draw, before the audit fixes). Two changes since: ROOT was the
container's absolute path, and the script now refuses to overwrite an existing sample. Not run on the
Windows PC, which has no Python.
"""
import json
import math
import os
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SEED = 20260930
CATEGORIES = ['cpu', 'motherboard', 'ram', 'gpu-chip', 'gpu-card', 'storage', 'psu', 'cooler', 'case', 'case-fan']


def load(p):
    return json.load(open(f'{ROOT}/{p}', encoding='utf-8'))


rng = random.Random(SEED)


def draw(ids):
    ids = sorted(ids)
    n = math.ceil(len(ids) * 0.2)
    return {'population': len(ids), 'size': n, 'ids': sorted(rng.sample(ids, n))}


sample = {'seed': SEED, 'rule': 'ceil(20%) per batch, random.Random(seed).sample over IDs sorted ascending, in this key order', 'batches': {}}
for c in CATEGORIES:
    sample['batches'][f'spec:{c}'] = draw([r['id'] for r in load(f'data/parts/{c}.json')['items']])
for m in ['us', 'sa']:
    pf = load(f'data/prices/{m}.json')
    sample['batches'][f'price-observations:{m}'] = draw([f"{o['partId']}|{o['retailer']}" for o in pf['observations']])
    sample['batches'][f'price-gaps:{m}'] = draw([g['partId'] for g in pf['gaps']])
sample['batches']['benchmark:game'] = draw([r['id'] for r in load('data/benchmarks/game.json')['items']])
sample['batches']['benchmark:creator'] = draw([r['id'] for r in load('data/benchmarks/creator.json')['items']])
sample['batches']['games'] = draw([g['id'] for g in load('data/games.json')['games']])

OUT = f'{ROOT}/artifacts/audit/sample-2026-09-30.json'
if os.path.exists(OUT):
    raise SystemExit(f'{OUT} exists and is audit evidence; move it aside before drawing again')
os.makedirs(f'{ROOT}/artifacts/audit', exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as fh:
    json.dump(sample, fh, indent=2)
for k, v in sample['batches'].items():
    print(f"{k:28} {v['size']:>3}/{v['population']:<4} {', '.join(v['ids'])}")
