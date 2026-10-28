"""Inject SEO / social-sharing tags into every page, write sitemap.xml and robots.txt.
Idempotent. Run: SITE_URL=https://example.gr python scripts/seo.py"""
import json, os, re, html
from pathlib import Path
root = Path(__file__).resolve().parents[1]
SITE = os.environ.get('SITE_URL', 'https://mike000123.github.io/Hpeirwtikos_Syndesmos').rstrip('/')
pages = json.loads((root / 'scripts' / 'seo-pages.json').read_text(encoding='utf-8'))
START, END = '<!-- seo:start -->', '<!-- seo:end -->'
e = lambda s: html.escape(s, quote=True)
ORG = {"@context":"https://schema.org","@type":"Organization","name":"Ηπειρωτικός Σύνδεσμος Πειραιώς","url":SITE+"/","logo":SITE+"/assets/favicon-192.png","foundingDate":"1886","email":"isp@ipirotikos.gr","telephone":"+30 210 4177378","address":{"@type":"PostalAddress","streetAddress":"Φίλωνος 11Α","addressLocality":"Πειραιάς","postalCode":"18531","addressCountry":"GR"},"sameAs":["https://www.facebook.com/groups/274979100353/","https://www.youtube.com/channel/UCBxJJNTRyrIDn_vw1ux9XTQ"]}
urls = []
for slug, p in pages.items():
    f = root / f'{slug}.html'
    if not f.exists(): print('missing', f); continue
    s = f.read_text(encoding='utf-8')
    s = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\s*', '', s, flags=re.S)
    s = re.sub(r'<meta\b[^>]*(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>\s*', '', s)
    s = re.sub(r'<title>.*?</title>', '<title>' + e(p['title']) + '</title>', s, count=1, flags=re.S)
    canon = SITE + ('/' if slug == 'index' else f"/{p.get('canonical', slug)}.html")
    L = [START]
    if p.get('noindex'):
        L += ['<meta name="robots" content="noindex,follow">', f'<link rel="canonical" href="{canon}">']
    else:
        img = f'{SITE}/assets/og/{slug}.jpg?v=2'
        L += [f'<meta name="description" content="{e(p["desc"])}">', f'<link rel="canonical" href="{canon}">',
          f'<meta property="og:type" content="{p["type"]}">', '<meta property="og:site_name" content="Ηπειρωτικός Σύνδεσμος Πειραιώς">',
          '<meta property="og:locale" content="el_GR">', f'<meta property="og:title" content="{e(p["title"])}">',
          f'<meta property="og:description" content="{e(p["desc"])}">', f'<meta property="og:url" content="{canon}">',
          f'<meta property="og:image" content="{img}">', '<meta property="og:image:type" content="image/jpeg">',
          '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
          f'<meta property="og:image:alt" content="{e(p["card"])} · Ηπειρωτικός Σύνδεσμος Πειραιώς">',
          '<meta name="twitter:card" content="summary_large_image">', f'<meta name="twitter:title" content="{e(p["title"])}">',
          f'<meta name="twitter:description" content="{e(p["desc"])}">', f'<meta name="twitter:image" content="{img}">']
        urls.append(canon)
    L += ['<link rel="stylesheet" href="assets/a11y.css?v=3">', '<meta name="theme-color" content="#721f2d">', '<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">',
          '<link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-192.png">', '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">']
    if slug == 'index':
        L.append('<script type="application/ld+json">' + json.dumps(ORG, ensure_ascii=False) + '</script>')
    L.append(END)
    block = '\n'.join(L) + '\n'
    s, n = re.subn(r'(<meta\b[^>]*name="viewport"[^>]*>\s*)', lambda m: m.group(1) + block, s, count=1)
    if not n: print('no viewport', slug)
    f.write_text(s, encoding='utf-8')
(root / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
(root / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
print(len(urls), 'pages;', SITE)
