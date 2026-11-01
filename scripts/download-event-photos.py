"""Κατεβάζει τις φωτογραφίες των εκδηλώσεων από το παλιό site (ipirotikos.gr), τις μετατρέπει σε WebP
(πλάτος έως 1600px) και ενημερώνει τα αρχεία των εκδηλώσεων ώστε να δείχνουν στα τοπικά αντίγραφα.

Τρέξτε μέσα από τον φάκελο scripts του repo:   python download-event-photos.py
Χρειάζεται Python 3 (η βιβλιοθήκη Pillow εγκαθίσταται μόνη της). Στο τέλος φτιάχνει το αρχείο
event-photos-ready.zip με ό,τι πρέπει να ανέβει στο GitHub."""
import json, re, subprocess, sys, time, zipfile, io, urllib.request
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    print('Εγκατάσταση Pillow…'); subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet', 'pillow'])
    from PIL import Image
root = Path(__file__).resolve().parent.parent
ev_dir = root / 'content' / 'events'
if not ev_dir.exists(): sys.exit('Τρέξτε το αρχείο μέσα από τον φάκελο scripts του repo (δίπλα να υπάρχουν οι φάκελοι content και assets).')
MAXW = 1600
changed = []; total = ok = 0; failed = []
for f in sorted(ev_dir.glob('*.json')):
    d = json.loads(f.read_text(encoding='utf-8')); dirty = False
    photos = [m for m in d.get('media', []) if m.get('type') == 'photo' and str(m.get('src', '')).startswith('http')]
    for n, m in enumerate(photos, 1):
        total += 1
        rel = f"assets/event-media/{d.get('id', f.stem)}/{n:02d}.webp"; dest = root / rel
        try:
            if not dest.exists():
                req = urllib.request.Request(m['src'], headers={'User-Agent': 'Mozilla/5.0'})
                im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert('RGB')
                if im.width > MAXW: im = im.resize((MAXW, round(im.height * MAXW / im.width)), Image.LANCZOS)
                dest.parent.mkdir(parents=True, exist_ok=True); im.save(dest, 'WEBP', quality=82, method=6)
                time.sleep(0.4)
            m.setdefault('remoteSrc', m['src']); m['src'] = rel; dirty = True; ok += 1
            print(f'ok  {rel}  ({dest.stat().st_size // 1024} KB)')
        except Exception as ex:
            failed.append(m['src']); print(f'ΑΠΟΤΥΧΙΑ {m["src"][:80]}…: {ex}')
    if dirty:
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'); changed.append(f)
zp = root / 'event-photos-ready.zip'
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in list((root / 'assets' / 'event-media').rglob('*.webp')) + changed:
        z.write(p, p.relative_to(root))
print(f'\nΤέλος: {ok}/{total} φωτογραφίες. Αρχείο προς ανέβασμα: {zp}')
if failed: print('Απέτυχαν:', *failed, sep='\n  ')
