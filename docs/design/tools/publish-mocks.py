"""Make the committed mock screenshots from the full-size captures in artifacts/.

Each image is downscaled with Lanczos (captured at 2x or 3x, so text stays sharp), cropped to the
same viewport per size, and given a caption strip. Limits: <= 1600 px wide, <= 300 KB, JPEG.

    python3 docs/design/tools/publish-mocks.py
"""
import io
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(ROOT, 'artifacts/screenshots/phase-0/WP-DS0/mocks')
DST = os.path.join(ROOT, 'docs/design/mocks')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
NAMES = {'bench': 'Direction A: Bench', 'folio': 'Direction B: Folio', 'studio': 'Direction C: Studio'}
SHOTS = {
    # name: (target width, label)
    '1440-dark': (1600, '1440 px, dark theme'),
    '1440-light': (1600, '1440 px, light theme'),
    '768-dark': (1152, '768 px, dark theme'),
    '390-dark': (780, '390 px, dark theme'),
    '390-light': (780, '390 px, light theme'),
    '390-dark-full': (585, '390 px, dark theme, full page'),
}
MAX = 300 * 1024


def caption(img, title, sub):
    w = img.width
    scale = w / 1600 if w >= 1000 else w / 780
    fs = max(14, round(20 * scale)) if w >= 1000 else max(13, round(19 * scale))
    f1, f2 = ImageFont.truetype(FONT_B, fs), ImageFont.truetype(FONT, fs)
    pad = round(fs * 0.8)
    strip = fs * 2 + pad * 3 if w < 1000 else fs + pad * 2
    out = Image.new('RGB', (w, img.height + strip), (24, 24, 26))
    out.paste(img, (0, 0))
    d = ImageDraw.Draw(out)
    if w >= 1000:
        d.text((pad, img.height + pad), title, font=f1, fill=(245, 245, 245))
        x = pad + d.textlength(title, font=f1) + fs
        d.text((x, img.height + pad), sub, font=f2, fill=(190, 190, 195))
    else:
        d.text((pad, img.height + pad), title, font=f1, fill=(245, 245, 245))
        d.text((pad, img.height + pad * 2 + fs), sub, font=f2, fill=(190, 190, 195))
    return out


def save(img, path):
    q = 86
    while True:
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=0 if q >= 80 else 2)
        if buf.tell() <= MAX or q <= 60:
            break
        q -= 3
    if buf.tell() > MAX:  # last resort: a slightly smaller image
        img = img.resize((round(img.width * .9), round(img.height * .9)), Image.LANCZOS)
        return save(img, path)
    open(path, 'wb').write(buf.getvalue())
    return buf.tell(), q, img.size


manifest = []
for slug, name in NAMES.items():
    for shot, (tw, label) in SHOTS.items():
        src = os.path.join(SRC, slug, shot + '.png')
        if not os.path.exists(src):
            print('missing', src)
            continue
        im = Image.open(src).convert('RGB')
        th = round(im.height * tw / im.width)
        im = im.resize((tw, th), Image.LANCZOS)
        im = caption(im, name, f'{label}. Design mock, illustrative values, not data.')
        out = os.path.join(DST, slug, shot + '.jpg')
        size, q, dims = save(im, out)
        manifest.append({'file': os.path.relpath(out, ROOT), 'bytes': size, 'quality': q, 'size': dims})
        print(f'{slug:6} {shot:14} {dims[0]}x{dims[1]}  {size // 1024:4} KB  q{q}')
json.dump(manifest, open(os.path.join(SRC, 'publish-manifest.json'), 'w'), indent=1)
