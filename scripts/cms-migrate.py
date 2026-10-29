"""One-time migration: split existing data into editable content/ files (re-runnable)."""
import json, re, html
from pathlib import Path
root = Path(__file__).resolve().parents[1]
C = root / 'content'
def dump(p, d):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# events
js = (root/'assets/events-data.js').read_text(encoding='utf-8')
data = json.loads(js[js.index('{'):js.rindex('}')+1])
dump(C/'events-meta.json', {k: data[k] for k in ('updated','photoSource','videoSource')})
for e in data['events']:
    e = dict(e)
    d = e.get('date') or ''
    if len(d) == 10 and e.get('dateLabel') == f'{d[8:10]}.{d[5:7]}.{d[:4]}': e.pop('dateLabel')
    if not e.get('date'): e.pop('date', None)
    dump(C/'events'/f"{e['id']}.json", e)

# board + presidents
s = (root/'syndesmos.html').read_text(encoding='utf-8')
members = [{'role': html.unescape(a), 'name': html.unescape(b)} for a, b in re.findall(r'<div><dt>(.*?)</dt><dd>(.*?)</dd></div>', s)]
sup = re.search(r'<strong>Σύμβουλοι:</strong> (.*?)\. <strong>Αναπληρωματική:</strong> (.*?)\.</p>', s)
rep = re.search(r'Συνομοσπονδία:</strong> (.*?)\.</p>', s)
pres = [{'name': html.unescape(n), 'period': html.unescape(p)} for n, p in re.findall(r'<tr><td>\d+</td><th scope="row">(.*?)</th><td>(.*?)</td></tr>', s)]
dump(C/'board.json', {
  'members': members,
  'councillors': sup.group(1), 'substitutes': sup.group(2),
  'representatives': rep.group(1),
  'presidents': pres})

# settings
dump(C/'settings.json', {'phone': '210 4177378', 'email': 'isp@ipirotikos.gr', 'street': 'Φίλωνος 11Α',
  'postcode': '18531', 'hours': ''})
dump(C/'.applied.json', {'phone': '210 4177378', 'email': 'isp@ipirotikos.gr', 'street': 'Φίλωνος 11Α', 'postcode': '18531'})

# articles (plain text articles only)
def md_from_html(b):
    photos = []
    def fig(m):
        t = m.group(0)
        src = re.search(r'src="([^"]+)"', t).group(1); alt = re.search(r'alt="([^"]*)"', t).group(1)
        cap = re.search(r'<figcaption>(.*?)<span class="f-credit">(.*?)</span>', t, re.S)
        credit = re.sub(r'<a href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', cap.group(2))
        photos.append({'image': src, 'alt': html.unescape(alt), 'caption': html.unescape(cap.group(1)), 'credit': html.unescape(credit)})
        return f'\n\n[[φωτο {len(photos)}]]\n\n'
    b = re.sub(r'<figure class="f-photo">.*?</figure>', fig, b, flags=re.S)
    b = re.sub(r'<a class="f-ref" href="#feature-source-(\d+)"[^>]*>\[\d+\]</a>', r'[[\1]]', b)
    b = re.sub(r'<a href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', b)
    b = re.sub(r'<h3>(.*?)</h3>', r'\n\n### \1\n\n', b)
    b = re.sub(r'</p><p>', '\n\n', b); b = re.sub(r'</?p>', '', b)
    b = re.sub(r'\n{3,}', '\n\n', html.unescape(b)).strip()
    return b, photos
for slug in ('istoria', 'gefyria', 'kazania'):
    s = (root/f'{slug}.html').read_text(encoding='utf-8')
    hero = re.search(r'<div class="article-hero[^>]*>(?:<img[^>]*>)?<span>(.*?)</span><h1>(.*?)</h1><p>(.*?)</p>', s, re.S)
    imgm = re.search(r'<div class="article-hero[^>]*><img class="article-hero-image" src="([^"]+)" alt="([^"]*)"', s)
    lede = re.search(r'<p class="f-lede">(.*?)</p>', s, re.S).group(1)
    chapters = []
    for m in re.finditer(r'<section id="feature-chapter-(\d+)"><span class="f-chapter">(.*?)</span><h2>(.*?)</h2>(.*?)</section>', s, re.S):
        body, photos = md_from_html(m.group(4))
        chapters.append({'title': html.unescape(m.group(3)), 'body': body, 'photos': photos})
    label = re.search(r'<span class="f-chapter">\d+ · (.*?)</span>', s).group(1)
    srcs = [{'title': html.unescape(re.sub('<[^>]+>', '', t)), 'url': u} for u, t in re.findall(r'<li id="feature-source-\d+"><a href="([^"]+)"[^>]*>(.*?)</a>', s)]
    rel = re.search(r'<div class="related-links">(.*?)</div>', s, re.S)
    related = [{'title': html.unescape(t).rstrip(' →'), 'url': u} for u, t in re.findall(r'<a href="([^"]+)">(.*?)</a>', rel.group(1))] if rel else []
    dump(C/'articles'/f'{slug}.json', {
      'slug': slug, 'eyebrow': html.unescape(hero.group(1)), 'title': html.unescape(hero.group(2)),
      'subtitle': html.unescape(hero.group(3)), 'hero': imgm.group(1) if imgm else '', 'hero_alt': imgm.group(2) if imgm else '',
      'lede': html.unescape(lede), 'chapter_label': html.unescape(label), 'chapters': chapters, 'sources': srcs, 'related': related})
print('ok')
