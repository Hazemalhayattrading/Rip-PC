"""Build Rig Lab Sans: a renamed Latin subset of Mona Sans, the typeface of the chosen direction (C, Studio).

    python3 docs/design/tools/build-font.py

Steps, all reproducible:
1. Fetch the source, Mona Sans 2.000 from google/fonts, into the git-ignored artifacts/ folder, and check
   its SHA-256, so a changed upstream file fails loudly instead of silently changing our font.
2. Instance the variable font to the ranges Studio uses: width 100-125 %, weight 300-600.
3. Subset to Latin (the Google Fonts "latin" range) plus the maths signs the UI prints (<= >= ~= minus).
4. Rename it. The OFL gives Mona Sans the Reserved Font Name "Mona", and a subset is a Modified
   Version, so no primary font name may contain "Mona". The copyright notice (name ID 0) and the licence
   records (IDs 13 and 14) are kept exactly as they are; the OFL requires them.
5. Write src/styles/fonts/rig-lab-sans.woff2. (The fallback face's metric overrides in tokens.css are
   calibrated in the browser, on Rig Lab's own text, by docs/design/tools/tokens-check.mjs.)

Needs fontTools with brotli (pip install fonttools brotli). Tested with fontTools 4.66.1.
"""
import hashlib
import io
import os
import urllib.request

from fontTools import subset
from fontTools.misc.timeTools import timestampFromString
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SOURCE_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/monasans/MonaSans%5Bwdth,wght%5D.ttf'
SOURCE_SHA256 = 'fd6e79634b5ae804a45aac7e2e3c2a325b41291fba59034f4732b0135b8475b3'  # Mona Sans 2.000, 349,140 bytes
CACHE = os.path.join(ROOT, 'artifacts', 'cache', 'fonts', 'MonaSans[wdth,wght].ttf')
OUT = os.path.join(ROOT, 'src', 'styles', 'fonts', 'rig-lab-sans.woff2')

AXES = {'wdth': (100, 125), 'wght': (300, 600)}
# Google Fonts "latin" plus U+2248 (almost equal), U+2264-2265 (less/greater or equal). U+2212 (minus) is in it.
UNICODES = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,'
            'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,U+2248,U+2264-2265')
FEATURES = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'pnum', 'lnum', 'case',
            'frac', 'numr', 'dnom', 'sups']
FAMILY, PS_FAMILY = 'Rig Lab Sans', 'RigLabSans'
KEEP_AS_IS = {0, 13, 14}  # copyright (carries the Reserved Font Name notice), licence, licence URL
BUILD_NOTE = 'riglab-subset 2026-09-30'
# A fixed head.modified, so the same inputs always give the same bytes (the timestamp alone moves the
# WOFF2 size by a few hundred bytes, because all tables share one Brotli stream).
BUILD_TIME = timestampFromString('Wed Sep 30 00:00:00 2026')


def parse_unicodes(spec):
    out = []
    for part in spec.split(','):
        part = part.strip()[2:]
        a, _, b = part.partition('-')
        out.extend(range(int(a, 16), int(b or a, 16) + 1))
    return out


def fetch_source():
    if not os.path.exists(CACHE):
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        with urllib.request.urlopen(SOURCE_URL, timeout=60) as r:
            open(CACHE, 'wb').write(r.read())
    data = open(CACHE, 'rb').read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != SOURCE_SHA256:
        raise SystemExit(f'Source font changed upstream: sha256 {digest}, expected {SOURCE_SHA256}. Review before rebuilding.')
    return data


def reload(font):
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    return TTFont(buf, lazy=False)


def rename(font):
    name = font['name']
    for rec in name.names:
        if rec.nameID in KEEP_AS_IS:
            continue
        text = rec.toUnicode()
        new = text.replace('Mona Sans', FAMILY).replace('MonaSans', PS_FAMILY)
        if rec.nameID == 3:
            new = f'{new};{BUILD_NOTE}'
        if rec.nameID == 5:
            new = f'{text}; {BUILD_NOTE}'
        if new != text:
            rec.string = new
    name.setName(f'{FAMILY} is a Latin subset of Mona Sans (SIL OFL 1.1), renamed because "Mona" is a '
                 f'Reserved Font Name. Instanced to width 100-125 and weight 300-600 for Rig Lab.', 10, 3, 1, 0x409)
    leftovers = [(r.nameID, r.toUnicode()) for r in name.names if 'mona' in r.toUnicode().lower() and r.nameID not in KEEP_AS_IS | {10}]
    if leftovers:
        raise SystemExit(f'Reserved Font Name still present in: {leftovers}')


def main():
    source = TTFont(io.BytesIO(fetch_source()), lazy=False)
    # Rename styles from STAT, so the new default (weight 300) is called Light, not the source's ExtraLight.
    font = reload(instancer.instantiateVariableFont(source, AXES, updateFontNames=True))
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = FEATURES
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    # The source has no glyph instructions, only Google Fonts' 7-byte dropout-control program (prep) and a
    # gasp table, which help Windows rasterise unhinted outlines. Keep them; they cost a few bytes.
    opts.hinting = True
    sub = subset.Subsetter(options=opts)
    sub.populate(unicodes=parse_unicodes(UNICODES))
    sub.subset(font)
    rename(font)
    font.flavor = 'woff2'
    font.recalcTimestamp = False
    font['head'].modified = BUILD_TIME
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    font.save(OUT)
    size = os.path.getsize(OUT)
    glyphs = len(font.getGlyphOrder())
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {size} bytes ({size / 1024:.1f} KB), {glyphs} glyphs, '
          f'axes {AXES}, default style {font["name"].getDebugName(17) or font["name"].getDebugName(2)}, '
          f'tables {" ".join(t for t in ("prep", "gasp") if t in font)} kept')


if __name__ == '__main__':
    main()
