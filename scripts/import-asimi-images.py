import json, pathlib, urllib.request, urllib.parse, hashlib, io, time
from PIL import Image, ImageOps, ImageDraw
names = [
 ('museum', 'Ioannina, castle, Silversmithing museum.jpg'),
 ('exhibit-04', 'Αργυροτεχνία Μουσείο Ιωάννινα 14062024 04.jpg'),
 ('exhibit-16', 'Αργυροτεχνία Μουσείο Ιωάννινα 14062024 16.jpg'),
 ('exhibit-92', 'Αργυροτεχνία Μουσείο Ιωάννινα 14062024 92.jpg'),
]
root = pathlib.Path('assets/asimi')
root.mkdir(exist_ok=True)
audit = []
contact = Image.new('RGB', (800, 640), 'white')
for i, (key, name) in enumerate(names):
    normalized = name.replace(' ', '_')
    digest = hashlib.md5(normalized.encode()).hexdigest()
    url = 'https://upload.wikimedia.org/wikipedia/commons/' + digest[0] + '/' + digest[:2] + '/' + urllib.parse.quote(normalized)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'EpirusAssociationWebsite/1.0 (https://github.com/mike000123/Hpeirwtikos_Syndesmos)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                payload = r.read()
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3)
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert('RGB')
    im.thumbnail((1440, 1440))
    target = root / (key + '.webp')
    im.save(target, quality=88, method=6)
    audit.append({'file':str(target), 'source': 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(normalized), 'original':url, 'author':'Vassiliki Feidopoulou' if key == 'museum' else 'Deiadameian', 'license':'CC BY-SA 4.0', 'licenseURL':'https://creativecommons.org/licenses/by-sa/4.0/', 'changes':'Resized and converted to WebP; no cropping or retouching.', 'width':im.width, 'height':im.height})
    thumb = im.copy()
    thumb.thumbnail((390, 280))
    x, y = (i % 2)*400, (i // 2)*320
    contact.paste(thumb,(x,y+25))
    ImageDraw.Draw(contact).text((x+8,y+6),key,fill='black')
(root / 'image-credits.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
contact.save(root / 'review.jpg', quality=80)
