"""Generate 1200x630 social preview cards (assets/og/*.jpg) and favicons.
Run: python scripts/make-og.py   (needs Pillow + DejaVu fonts)"""
import json, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
root = Path(__file__).resolve().parents[1]
pages = json.loads((root / 'scripts' / 'seo-pages.json').read_text(encoding='utf-8'))
SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANSB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
W, H = 1200, 630
emblem = Image.open(root / 'assets' / 'syndesmos-emblem.png').convert('RGB')

def circle(im, size):
    im = im.resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new('RGBA', (size, size)); out.paste(im, (0, 0)); out.putalpha(mask)
    return out

def gradient():
    g = Image.new('RGB', (W, H)); px = g.load()
    for y in range(H):
        for x in range(W):
            t = (x / W * .45 + y / H * .55)
            px[x, y] = (int(0x72 + (0x3a - 0x72) * t), int(0x1f + (0x10 - 0x1f) * t), int(0x2d + (0x18 - 0x2d) * t))
    return g

base = gradient()
d = ImageDraw.Draw(base)
GOLD = (0xd9, 0xb7, 0x7c); CREAM = (0xf7, 0xf0, 0xe3)

def wrap(draw, text, font, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        trial = (cur + ' ' + w).strip()
        if draw.textlength(trial, font=font) <= maxw: cur = trial
        else: lines.append(cur); cur = w
    lines.append(cur); return lines

def card(slug, eyebrow, title):
    im = base.copy(); dr = ImageDraw.Draw(im)
    # frame and rule
    dr.rectangle((28, 28, W - 29, H - 29), outline=(0xd9, 0xb7, 0x7c), width=2)
    em = circle(emblem, 150); im.paste(em, (80, 76), em)
    dr.text((258, 96), 'ΗΠΕΙΡΩΤΙΚΟΣ ΣΥΝΔΕΣΜΟΣ ΠΕΙΡΑΙΩΣ', font=ImageFont.truetype(SANSB, 26), fill=GOLD)
    dr.text((258, 138), 'Από το 1886', font=ImageFont.truetype(SANS, 24), fill=CREAM)
    f_eye = ImageFont.truetype(SANSB, 24)
    dr.text((80, 300), eyebrow.upper(), font=f_eye, fill=GOLD)
    size = 76
    while True:
        f = ImageFont.truetype(SERIF, size)
        lines = wrap(dr, title, f, W - 160)
        if len(lines) <= 3 and size >= 52 or size <= 52: break
        size -= 4
        if len(lines) <= 2: break
    y = 345
    for ln in lines[:3]:
        dr.text((80, y), ln, font=f, fill=CREAM); y += int(size * 1.22)
    dr.line((80, H - 78, 220, H - 78), fill=GOLD, width=3)
    dr.text((80, H - 64), 'Η Ήπειρος στον Πειραιά', font=ImageFont.truetype(SANS, 24), fill=CREAM)
    out = root / 'assets' / 'og' / f'{slug}.jpg'
    im.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
    return out.stat().st_size

for slug, p in pages.items():
    if p.get('noindex'): continue
    print(slug, card(slug, p['eyebrow'], p['card']))

# favicons
em = circle(emblem, 512)
for name, s in (('favicon-32.png', 32), ('favicon-192.png', 192), ('apple-touch-icon.png', 180)):
    im = em.resize((s, s), Image.LANCZOS)
    if name.startswith('apple'):
        bg = Image.new('RGB', (s, s), (0x72, 0x1f, 0x2d)); bg.paste(im, (0, 0), im); bg.save(root / 'assets' / name)
    else:
        im.save(root / 'assets' / name)
