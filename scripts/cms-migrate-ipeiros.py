"""One-time: extract the editable parts of ipeiros.html into content/ipeiros.json."""
import re, json, html
from pathlib import Path
root = Path(__file__).resolve().parents[1]
s = (root/'ipeiros.html').read_text(encoding='utf-8')
U = html.unescape
def img_split(tag):
    """Return (src, alt, template with {src}/{alt} placeholders)."""
    src = re.search(r' src="([^"]*)"', tag).group(1); alt = re.search(r' alt="([^"]*)"', tag).group(1)
    tpl = tag.replace(f' src="{src}"', ' src="{src}"', 1).replace(f' alt="{alt}"', ' alt="{alt}"', 1)
    return U(src), U(alt), tpl
def sec(id_):
    a = s.index(f'id="{id_}"'); return s[a:s.index('</section>', a)]
out = {}
h = sec('discover') if False else s[s.index('<section class="hero">'):s.index('</section>')]
m = re.search(r'<div class="eyebrow">(.*?)</div><h1>(.*?)<br/>(.*?) <em>(.*?)</em><br/>(.*?)</h1><p>(.*?)</p><div class="heroactions"><a class="solid" href="([^"]*)">(.*?)</a><a class="outline" href="([^"]*)">(.*?)</a>', h, re.S)
out['hero'] = dict(zip(['eyebrow','line1','line2_pre','line2_em','line3','intro','button1_link','button1_text','button2_link','button2_text'], [U(x) for x in m.groups()]))
d = sec('discover')
hd = re.search(r'<span class="eyebrow">(.*?)</span><h2>(.*?)</h2></div><p>(.*?)</p>', d)
tiles = []
for a in re.findall(r'<article class="tile".*?</article>', d, re.S):
    link = re.search(r"location.href='([^']*)'", a).group(1)
    fig = '<figure class="tile-local-photo">' in a
    tag = re.search(r'<img[^>]*>', a).group(0); src, alt, tpl = img_split(tag)
    k, t, p, ar = re.search(r'<span class="kicker">(.*?)</span><h3>(.*?)</h3><p>(.*?)</p><span class="arrow">(.*?)</span>', a).groups()
    tiles.append({'link': link, 'kicker': U(k), 'title': U(t), 'text': U(p), 'arrow': U(ar), 'image': src, 'alt': alt, 'wrap_figure': fig, 'img_tpl': tpl})
out['discover'] = {'eyebrow': U(hd.group(1)), 'title': U(hd.group(2)), 'intro': U(hd.group(3)), 'tiles': tiles}
c = sec('living-culture')
hd = re.search(r'<span class="eyebrow">(.*?)</span><h2>(.*?)</h2></div><p>(.*?)</p>', c)
lead = re.search(r'<p class="culture-lead">(.*?)</p>', c).group(1)
cards = []
for a in re.findall(r'<article class="culture-card".*?</article>', c, re.S):
    link = re.search(r"location.href='([^']*)'", a).group(1)
    im = re.search(r'src="([^"]*)" alt="([^"]*)"', a)
    ch = re.search(r'<span class="chapter">(.*?)</span>', a).group(1)
    k, t, p = re.search(r'<span class="kicker">(.*?)</span><h3>(.*?)</h3><p>(.*?)</p>', a).groups()
    ex = re.search(r'<a href="([^"]*)" rel="noopener" target="_blank">(.*?) ↗</a>', a)
    cards.append({'link': link, 'image': U(im.group(1)), 'alt': U(im.group(2)), 'chapter': U(ch), 'kicker': U(k), 'title': U(t), 'text': U(p),
                  'ext_link': U(ex.group(1)) if ex else '', 'ext_label': U(ex.group(2)) if ex else ''})
ft, fp = re.search(r'<div class="culture-feature"><div><strong>(.*?)</strong><p>(.*?)</p>', c).groups()
out['culture'] = {'eyebrow': U(hd.group(1)), 'title': U(hd.group(2)), 'intro': U(hd.group(3)), 'lead': U(lead), 'cards': cards, 'feature_title': U(ft), 'feature_text': U(fp)}
hh = sec('heritage')
hd = re.search(r'<span class="eyebrow">(.*?)</span><h2>(.*?)</h2></div><p>(.*?)</p>', hh)
items = []
for a in re.findall(r'<article data-category.*?</article>', hh, re.S):
    cat, kw, link = re.search(r'data-category="([^"]*)" data-title="([^"]*)" onclick="window.location.href=\'([^\']*)\'"', a).groups()
    tag = re.search(r'<img[^>]*>', a).group(0); src, alt, tpl = img_split(tag)
    k, t, p = re.search(r'<span class="kicker">(.*?)</span><h3>(.*?)</h3><p>(.*?)</p>', a).groups()
    items.append({'category': U(cat), 'keywords': U(kw), 'link': link, 'kicker': U(k), 'title': U(t), 'text': U(p), 'image': src, 'alt': alt,
                  'wrap_cover': 'archive-cover-photo' in a, 'img_tpl': tpl})
note = re.search(r'<div class="note">(.*?)</div></div></section>', hh + '</section>').group(1)
out['heritage'] = {'eyebrow': U(hd.group(1)), 'title': U(hd.group(2)), 'intro': U(hd.group(3)), 'items': items, 'note': U(note)}
st = sec('stories')
hd = re.search(r'<span class="eyebrow">(.*?)</span><h2>(.*?)</h2></div><p>(.*?)</p>', st)
cards = []
for a in re.findall(r'<a class="pe-story-card".*?</a>', st, re.S):
    link = re.search(r'href="([^"]*)"', a).group(1)
    im = re.search(r'<img src="([^"]*)" alt="([^"]*)" width="(\d+)" height="(\d+)"', a)
    k, t, cr = re.search(r'pe-story-card-kicker">(.*?)</span><strong>(.*?) <span aria-hidden="true">→</span></strong><span class="pe-story-card-credit">(.*?)</span>', a).groups()
    cards.append({'link': link, 'image': U(im.group(1)), 'alt': U(im.group(2)), 'width': int(im.group(3)), 'height': int(im.group(4)), 'kicker': U(k), 'title': U(t), 'credit': U(cr)})
out['stories'] = {'eyebrow': U(hd.group(1)), 'title': U(hd.group(2)), 'intro': U(hd.group(3)), 'cards': cards}
(root/'content/ipeiros.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print({k: (len(v.get('tiles', v.get('cards', v.get('items', [])))) if isinstance(v, dict) else 0) for k, v in out.items()})
