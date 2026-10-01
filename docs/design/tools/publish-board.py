"""Downscale the rendered boards (2x) to 1600 px wide JPEGs under 300 KB in docs/design/board/."""
import io
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(ROOT, 'artifacts/screenshots/phase-0/WP-DS0/board')
DST = os.path.join(ROOT, 'docs/design/board')
NAMES = {'compare': 'compare.jpg', 'a': 'a-bench.jpg', 'b': 'b-folio.jpg', 'c': 'c-studio.jpg'}
for k, name in NAMES.items():
    im = Image.open(os.path.join(SRC, k + '.png')).convert('RGB')
    im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    q = 88
    while True:
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=0 if q >= 80 else 2)
        if buf.tell() <= 300 * 1000 or q <= 60:  # KB is 1,000 bytes (DS0-12)
            break
        q -= 3
    open(os.path.join(DST, name), 'wb').write(buf.getvalue())
    print(f'{name:14} {im.width}x{im.height} {buf.tell() // 1000} KB q{q}')
