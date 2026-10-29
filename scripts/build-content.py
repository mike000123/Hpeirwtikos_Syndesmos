"""Rebuild the generated parts of the site from content/ (edited through /admin).
Idempotent: running it twice changes nothing.  Run: python scripts/build-content.py"""
import json, re, html, sys, datetime
from pathlib import Path
import markdown
try:
    from PIL import Image
except ImportError:
    Image = None

root = Path(__file__).resolve().parents[1]
C = root / 'content'
rd = lambda p: p.read_text(encoding='utf-8')
def wr(p, s):
    if not p.exists() or rd(p) != s:
        p.write_text(s, encoding='utf-8'); print('updated', p.relative_to(root))
J = lambda p: json.loads(rd(p))
esc = lambda t: html.escape(t or '', quote=False)
escq = lambda t: html.escape(t or '', quote=True)
SITE_PAGES = sorted(root.glob('*.html'))

def wrap_marker(s, name, start_re, end_re):
    """Bootstrap: wrap the region matched by start_re..end_re with cms markers (once)."""
    if f'<!--cms:{name}-->' in s: return s
    m = re.search(f'({start_re})(.*?)({end_re})', s, re.S)
    if not m: raise SystemExit(f'cannot place marker {name}')
    return s[:m.start()] + f'<!--cms:{name}-->' + m.group(0) + f'<!--/cms:{name}-->' + s[m.end():]
def between(s, name, new):
    a, b = f'<!--cms:{name}-->', f'<!--/cms:{name}-->'
    i, j = s.index(a) + len(a), s.index(b)
    return s[:i] + new + s[j:]

# ---------------------------------------------------------------- events
def build_events():
    meta = J(C / 'events-meta.json')
    evs = []
    for f in sorted((C / 'events').glob('*.json')):
        e = J(f); e.setdefault('id', f.stem); evs.append(e)
    dated = sorted([e for e in evs if e.get('date')], key=lambda e: (e['date'], e['id']), reverse=True)
    undated = sorted([e for e in evs if not e.get('date')], key=lambda e: e['id'])
    out = []
    for e in dated + undated:
        o = {}
        if 'date' not in e: e = {**{'id': e['id'], 'date': None}, **{k: v for k, v in e.items() if k != 'id'}}
        for k, v in e.items():
            if v in (None, '', []) and k not in ('media', 'date'): continue
            if k == 'dateLabel': continue
            o[k] = v
            if k == 'date':
                o['dateLabel'] = e.get('dateLabel') or (
                    f"{e['date'][8:10]}.{e['date'][5:7]}.{e['date'][:4]}" if e['date'] and len(e['date']) == 10 else e['date'])
        o.setdefault('media', [])
        o.setdefault('source', 'https://ipirotikos.gr/')
        if e.get('press'):
            pr = dict(e['press']); src = pr.get('src')
            if src:
                pr.setdefault('format', 'pdf' if src.lower().endswith('.pdf') else 'image')
                pr.setdefault('label', 'Ανακοίνωση')
                pr.setdefault('pages', [src])
                if not pr.get('originalSrc'): pr.pop('originalSrc', None)
                o['press'] = pr
            else: o.pop('press', None)
        # press placement keeps original key order (press before note)
        if 'press' in o and 'note' in o:
            note = o.pop('note'); o['note'] = note
        out.append(o)
    data = {'updated': meta['updated'], 'photoSource': meta['photoSource'], 'videoSource': meta['videoSource'], 'events': out}
    TODAY = datetime.date.today().isoformat()
    build_events_page(out, TODAY)
    wr(root / 'assets/events-data.js',
       '// Association media and locally archived original press documents.\nwindow.epirusEvents = ' +
       json.dumps(data, ensure_ascii=False, indent=2) + ';\n')


def plural_media(media):
    ph = sum(1 for m in media if m.get('type') != 'video'); vd = len(media) - ph; parts = []
    if ph: parts.append(f"{ph} {'φωτογραφία' if ph == 1 else 'φωτογραφίες'}")
    if vd: parts.append(f"{vd} {'βίντεο'}")
    return ' · '.join(parts)

def event_card(e):
    d = e['date']; label = e['dateLabel']; title = e['title']; eid = e['id']
    thumb = f'<img class="event-card-photo" src="assets/events-design/{eid}.webp" alt="" width="96" height="104" loading="lazy" decoding="async">' if (root / 'assets/events-design' / f'{eid}.webp').exists() else ''
    acts = ''
    if e.get('media'):
        txt = plural_media(e['media'])
        al = f'{txt}: {title}' + (f' — {label}' if len(d) != 10 else '')
        acts += (f'<a class="event-open" href="{escq(e["source"])}" data-event-gallery="{escq(eid)}" aria-haspopup="dialog" aria-controls="event-gallery" '
                 f'aria-label="{escq(al)}" target="_blank" rel="noopener noreferrer">{txt} →</a>')
    pr = e.get('press')
    if pr:
        acts += (f'<a class="event-press-link" href="{escq(pr["src"])}" data-event-press="{escq(eid)}" aria-haspopup="dialog" aria-controls="event-press-dialog" '
                 f'aria-label="{escq(pr["label"] + ": " + title)}" target="_blank" rel="noopener noreferrer">{esc(pr["label"])} →</a>')
    if not acts and e.get('source') and e['source'] != 'https://ipirotikos.gr/':
        acts = f'<a class="event-open" href="{escq(e["source"])}" target="_blank" rel="noopener noreferrer" aria-label="{escq("Περισσότερα: " + title)}">Περισσότερα →</a>'
    note = ''
    return (f'<article class="past-event" id="{escq(eid)}" data-event-year="{d[:4]}">{thumb}<div class="event-card-text"><time datetime="{d}">{esc(label)}</time>'
            f'<h3>{esc(title)}</h3></div><div class="event-card-actions">{acts}</div></article>')

def build_events_page(events, today):
    p = root / 'ekdiloseis.html'; s = rd(p)
    s = wrap_marker(s, 'events-list', r'<div class="past-events" id="events-list">', r'</div>(?=<button class="events-show-all")')
    s = wrap_marker(s, 'events-years', r'<option value="all">Όλες οι χρονιές</option>', r'(?=</select>)')
    s = wrap_marker(s, 'upcoming', r'<p>Οι νέες ημερομηνίες θα ανακοινώνονται εδώ\.</p>', r'(?<=</p>)')
    past = [e for e in events if e.get('date') and e['date'] <= today]
    future = sorted([e for e in events if e.get('date') and e['date'] > today], key=lambda e: e['date'])
    s = between(s, 'events-list', '<div class="past-events" id="events-list">' + ''.join(event_card(e) for e in past) + '</div>')
    years = []
    for e in past:
        if e['date'][:4] not in years: years.append(e['date'][:4])
    s = between(s, 'events-years', '<option value="all">Όλες οι χρονιές</option>' + ''.join(f'<option value="{y}">{y}</option>' for y in years))
    if future:
        items = ''.join(f'<li><time datetime="{e["date"]}">{esc(e["dateLabel"])}</time> <strong>{esc(e["title"])}</strong>' +
                        (f' <span>{esc(e["note"])}</span>' if e.get('note') else '') +
                        (f' <a href="{escq(e["press"]["src"])}" target="_blank" rel="noopener noreferrer">{esc(e["press"]["label"])} →</a>' if e.get('press') else '') + '</li>' for e in future)
        up = f'<ul class="events-upcoming-list">{items}</ul>'
    else:
        up = '<p>Οι νέες ημερομηνίες θα ανακοινώνονται εδώ.</p>'
    s = between(s, 'upcoming', up)
    wr(p, s)

# ---------------------------------------------------------------- board
def build_board():
    b = J(C / 'board.json'); p = root / 'syndesmos.html'; s = rd(p)
    s = wrap_marker(s, 'board', r'<dl class="board-members">', r'Συνομοσπονδία:</strong>.*?</p></div>')
    s = wrap_marker(s, 'presidents', r'<table>', r'</table>')
    dl = ''.join(f'<div><dt>{esc(m["role"])}</dt><dd>{esc(m["name"])}</dd></div>' for m in b['members'])
    sup = (f'<p><strong>Σύμβουλοι:</strong> {esc(b["councillors"])}.' +
           (f' <strong>Αναπληρωματική:</strong> {esc(b["substitutes"])}.' if b.get('substitutes') else '') + '</p>')
    rep = f'<p><strong>Εκπρόσωποι στην Πανηπειρωτική Συνομοσπονδία:</strong> {esc(b["representatives"])}.</p>' if b.get('representatives') else ''
    s = between(s, 'board', f'<dl class="board-members">{dl}</dl><div class="association-board-support">{sup}{rep}</div>')
    rows = ''.join(f'<tr><td>{i}</td><th scope="row">{esc(x["name"])}</th><td>{esc(x["period"])}</td></tr>' for i, x in enumerate(b['presidents'], 1))
    s = between(s, 'presidents', '<table><caption class="association-sr-only">Οι πρόεδροι του Συνδέσμου και οι περίοδοι της θητείας τους</caption>'
                '<thead><tr><th scope="col">Α/Α</th><th scope="col">Ονοματεπώνυμο</th><th scope="col">Περίοδος</th></tr></thead>'
                f'<tbody>{rows}</tbody></table>')
    wr(p, s)

# ---------------------------------------------------------------- settings
def build_settings():
    new = J(C / 'settings.json'); ap = C / '.applied.json'; old = J(ap)
    tel = lambda v: '+30' + re.sub(r'\D', '', v)
    pairs = [(old['phone'], new['phone']), (tel(old['phone']), tel(new['phone'])), (old['email'], new['email']),
             (old['street'], new['street']), (old['postcode'], new['postcode'])]
    for p in SITE_PAGES:
        s = rd(p); t = s
        for a, b in pairs:
            if a != b: t = t.replace(a, b)
        if p.name == 'epikoinonia.html':
            t = wrap_marker(t, 'hours', r'<p>Πριν από την επίσκεψή σας', r'</p>')
            hours = (new.get('hours') or '').strip()
            default = '<p>Πριν από την επίσκεψή σας, επικοινωνήστε μαζί μας για τις ώρες λειτουργίας και το πρόγραμμα των τμημάτων.</p>'
            body = (f'<p><strong>Ώρες λειτουργίας</strong><br>{esc(hours).replace(chr(10), "<br>")}</p>' if hours else default)
            t = between(t, 'hours', body)
        if t != s: wr(p, t)
    wr(ap, json.dumps({k: new[k] for k in ('phone', 'email', 'street', 'postcode')}, ensure_ascii=False, indent=2) + '\n')

# ---------------------------------------------------------------- articles
md = markdown.Markdown(extensions=[])
def inline(t):
    h = markdown.markdown(t or '', extensions=[])
    return re.sub(r'^<p>(.*)</p>$', r'\1', h, flags=re.S)
def link_attrs(h):  # external links open in new tab like the hand-written ones
    return re.sub(r'<a href="(https?://[^"]+)">', r'<a href="\1" target="_blank" rel="noopener noreferrer">', h)
def figure(ph):
    src = ph['image'].lstrip('/')
    w = h = None
    if Image and (root / src).exists():
        with Image.open(root / src) as im: w, h = im.size
    dims = f' width="{w}" height="{h}"' if w else ''
    cap = esc(ph.get('caption', ''))
    cr = link_attrs(inline(ph['credit'])) if ph.get('credit') else ''
    return (f'<figure class="f-photo"><img src="{escq(src)}" alt="{escq(ph.get("alt", ""))}"{dims} loading="lazy" decoding="async">'
            f'<figcaption>{cap}<span class="f-credit">{cr}</span></figcaption></figure>')
def chapter_html(body, photos):
    def fig(m):
        n = int(m.group(1)); return '\n\n@@FIG%d@@\n\n' % n
    text = re.sub(r'\[\[\s*φωτο\s*(\d+)\s*\]\]', fig, body)
    text = re.sub(r'\[\[(\d+)\]\]', lambda m: f'@@REF{m.group(1)}@@', text)
    h = markdown.markdown(text, extensions=[])
    h = link_attrs(h)
    h = re.sub(r'@@REF(\d+)@@', lambda m: f'<a class="f-ref" href="#feature-source-{m.group(1)}" aria-label="Πηγή {m.group(1)}">[{m.group(1)}]</a>', h)
    h = re.sub(r'<p>@@FIG(\d+)@@</p>', lambda m: figure(photos[int(m.group(1)) - 1]), h)
    return h.replace('\n', '')
def article_core(a):
    chs = ''.join(f'<section id="feature-chapter-{i}"><span class="f-chapter">{i:02d} · {esc(a["chapter_label"])}</span><h2>{esc(c["title"])}</h2>{chapter_html(c["body"], c.get("photos") or [])}</section>'
                  for i, c in enumerate(a['chapters'], 1))
    src = ''.join(f'<li id="feature-source-{i}"><a href="{escq(x["url"])}" target="_blank" rel="noopener noreferrer">{esc(x["title"])}</a></li>' for i, x in enumerate(a.get('sources') or [], 1))
    srcs = f'<section class="f-sources" id="feature-sources"><h2>Πηγές και περαιτέρω ανάγνωση</h2><ol>{src}</ol></section>' if src else ''
    toc = ''.join(f'<li><a href="#feature-chapter-{i}">{esc(c["title"])}</a></li>' for i, c in enumerate(a['chapters'], 1)) + ('<li><a href="#feature-sources">Πηγές</a></li>' if src else '')
    rel = ''.join(f'<a href="{escq(r["url"])}">{esc(r["title"])} →</a>' for r in a.get('related') or [])
    return chs + srcs, toc, rel
def build_article_page(a, path, template):
    s = rd(path) if path.exists() else template
    chs, toc, rel = article_core(a)
    s = re.sub(r'<span>[^<]*</span><h1>.*?</h1><p>.*?</p>', lambda m: f'<span>{esc(a["eyebrow"])}</span><h1>{esc(a["title"])}</h1><p>{esc(a["subtitle"])}</p>', s, count=1, flags=re.S)
    if a.get('hero'):
        s = re.sub(r'(<img class="article-hero-image" src=")[^"]*(" alt=")[^"]*"', lambda m: f'{m.group(1)}{escq(a["hero"])}{m.group(2)}{escq(a.get("hero_alt", ""))}"', s, count=1)
    s = re.sub(r'<p class="f-lede">.*?</p>', lambda m: f'<p class="f-lede">{esc(a["lede"])}</p>', s, count=1, flags=re.S)
    i = s.index('<section id="feature-chapter-1">'); j = s.index('</main>')
    s = s[:i] + chs + s[j:]
    s = re.sub(r'(<nav aria-label="Περιεχόμενα αφιερώματος"><ol>).*?(</ol></nav>)', lambda m: m.group(1) + toc + m.group(2), s, count=1, flags=re.S)
    if rel:
        s = re.sub(r'(<div class="related-links">).*?(</div>)', lambda m: m.group(1) + rel + m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'(<nav class="crumb">.*?/ )[^<]*(</nav>)', lambda m: m.group(1) + esc(a['title']) + m.group(2), s, count=1, flags=re.S)
    return s
def build_articles():
    tmpl = rd(root / 'kazania.html')
    seo_p = root / 'scripts/seo-pages.json'; seo = J(seo_p); new_cards = []; changed_seo = False; need_og = []
    for f in sorted((C / 'articles').glob('*.json')):
        a = J(f); slug = a['slug']; page = root / f'{slug}.html'
        is_new = not page.exists()
        s = build_article_page(a, page, tmpl)
        # a new page must not inherit the template's canonical/OG; seo.py rewrites the marker block
        if is_new:
            s = re.sub(r'<title>.*?</title>', f'<title>{esc(a["title"])}</title>', s, count=1)
        wr(page, s)
        if not a.get('builtin', slug in ('istoria', 'gefyria', 'kazania')) or is_new or slug not in seo:
            entry = {'title': f'{a["title"]} · Ηπειρωτικός Σύνδεσμος Πειραιώς', 'card': a['title'], 'eyebrow': a['eyebrow'],
                     'desc': (a.get('description') or a['lede'])[:300], 'type': 'article'}
            if seo.get(slug) != entry and slug not in ('istoria', 'gefyria', 'kazania'):
                seo[slug] = entry; changed_seo = True
                if not (root / 'assets/og' / f'{slug}.jpg').exists(): need_og.append(slug)
        if a.get('show_on_ipeiros') and a.get('card_image'):
            new_cards.append(a)
    if changed_seo: wr(seo_p, json.dumps(seo, ensure_ascii=False, indent=2) + '\n')
    # cards for new articles on the "Γνωρίστε την Ήπειρο" page
    p = root / 'ipeiros.html'; s = rd(p)
    if '<!--cms:new-articles-->' not in s:
        s = s.replace('</div><div class="culture-feature">', '<!--cms:new-articles--><!--/cms:new-articles--></div><div class="culture-feature">', 1)
    cards = ''
    for n, a in enumerate(new_cards, 5):
        slug = a['slug']
        cards += (f'<article class="culture-card" onclick="window.location.href=\'{slug}.html\'"><div class="culture-banner">'
                  f'<img class="culture-cover-image" src="{escq(a["card_image"])}" alt="{escq(a.get("card_image_alt", ""))}" width="1536" height="1024" loading="lazy" decoding="async">'
                  f'<span class="chapter">{n:02d} / {esc(a["eyebrow"])}</span></div><div class="culture-content">'
                  f'<span class="kicker">{esc(a.get("kicker", ""))}</span><h3>{esc(a["title"])}</h3><p>{esc(a.get("description") or a["lede"])}</p>'
                  f'<div class="culture-bottom"><button onclick="event.stopPropagation();window.location.href=\'{slug}.html\'">Εξερευνήστε το αφιέρωμα ↗</button></div></div></article>')
    wr(p, between(s, 'new-articles', cards))
    if need_og: (root / '.og-needed').write_text(' '.join(need_og))

if __name__ == '__main__':
    build_events(); build_board(); build_settings(); build_articles()
