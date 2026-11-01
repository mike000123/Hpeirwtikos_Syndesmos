"""Κατεβάζει στον υπολογιστή σας τις φωτογραφίες των εκδηλώσεων από το παλιό site (ipirotikos.gr)
και τις βάζει σε ένα zip που στέλνετε στο Claude.
Τρέξτε:  python download-event-photos.py          (χρειάζεται μόνο Python 3, καμία εγκατάσταση)"""
import json, re, sys, time, zipfile, urllib.request
from pathlib import Path
here = Path(__file__).resolve().parent
js = (here.parent / 'assets' / 'events-data.js') if (here.parent / 'assets' / 'events-data.js').exists() else None
if js is None:
    sys.exit('Τρέξτε το αρχείο μέσα από τον φάκελο scripts του repo (δίπλα βρίσκεται ο φάκελος assets).')
text = js.read_text(encoding='utf-8')
data = json.loads(text[text.index('{'):text.rindex('}') + 1])
out = here / 'event-photos'; out.mkdir(exist_ok=True)
items = [(e['id'], m) for e in data['events'] for m in e.get('media', []) if m.get('type') == 'photo' and str(m.get('src', '')).startswith('http')]
print(f'{len(items)} φωτογραφίες')
ok = 0; failed = []
for n, (eid, m) in enumerate(items, 1):
    name = re.sub(r'[^\w.\-]+', '_', m.get('originalFile') or f'{n}.jpg')
    target = out / eid / name; target.parent.mkdir(exist_ok=True)
    if target.exists() and target.stat().st_size > 1000: ok += 1; continue
    try:
        req = urllib.request.Request(m['src'], headers={'User-Agent': 'Mozilla/5.0'})
        target.write_bytes(urllib.request.urlopen(req, timeout=60).read()); ok += 1
        print(f'[{n}/{len(items)}] ok  {eid}/{name}')
    except Exception as ex:
        failed.append((eid, name, str(ex))); print(f'[{n}/{len(items)}] ΑΠΟΤΥΧΙΑ {eid}/{name}: {ex}')
    time.sleep(0.4)
zp = here / 'event-photos.zip'
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_STORED) as z:
    for f in out.rglob('*'):
        if f.is_file(): z.write(f, f.relative_to(out))
print(f'\nΤέλος: {ok}/{len(items)} επιτυχίες. Στείλτε το αρχείο: {zp}')
if failed: print('Απέτυχαν:', *[f'{a}/{b}' for a, b, _ in failed], sep='\n  ')
