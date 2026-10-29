/* Προεπισκόπηση «όπως θα φανεί στο site»: φορτώνει την πραγματική σελίδα και βάζει μέσα το πρόχειρο. */
(function () {
  'use strict';
  var esc = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var escq = function (t) { return esc(t).replace(/"/g, '&quot;'); };
  var BASE = new URL('../', location.href).href;
  var get = function (path) { return fetch(BASE + path, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(path); return r.text(); }); };

  function inlineMd(t) {
    return esc(t || '').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function linkAttrs(t) { return t; }
  // Μικρός μετατροπέας κειμένου: παράγραφοι, ### υπότιτλοι, [σύνδεσμοι](…), [[1]] και [[φωτο 1]].
  function figure(ph) {
    return '<figure class="f-photo"><img src="' + escq((ph.image || '').replace(/^\//, '')) + '" alt="' + escq(ph.alt) + '" loading="lazy">' +
      '<figcaption>' + esc(ph.caption) + '<span class="f-credit">' + inlineMd(ph.credit) + '</span></figcaption></figure>';
  }
  function chapterHtml(body, photos) {
    return String(body || '').split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean).map(function (b) {
      var m = b.match(/^\[\[\s*φωτο\s*(\d+)\s*\]\]$/);
      if (m) return photos[+m[1] - 1] ? figure(photos[+m[1] - 1]) : '';
      if (/^###\s+/.test(b)) return '<h3>' + esc(b.replace(/^###\s+/, '')) + '</h3>';
      var h = inlineMd(b).replace(/\[\[(\d+)\]\]/g, function (_, n) { return '<a class="f-ref" href="#feature-source-' + n + '" aria-label="Πηγή ' + n + '">[' + n + ']</a>'; });
      return '<p>' + h + '</p>';
    }).join('');
  }
  function articleHtml(page, a) {
    var chs = (a.chapters || []).map(function (c, i) {
      return '<section id="feature-chapter-' + (i + 1) + '"><span class="f-chapter">' + String(i + 1).padStart(2, '0') + ' · ' + esc(a.chapter_label) + '</span><h2>' + esc(c.title) + '</h2>' + chapterHtml(c.body, c.photos || []) + '</section>';
    }).join('');
    var src = (a.sources || []).map(function (x, i) { return '<li id="feature-source-' + (i + 1) + '"><a href="' + escq(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.title) + '</a></li>'; }).join('');
    var srcs = src ? '<section class="f-sources" id="feature-sources"><h2>Πηγές και περαιτέρω ανάγνωση</h2><ol>' + src + '</ol></section>' : '';
    var toc = (a.chapters || []).map(function (c, i) { return '<li><a href="#feature-chapter-' + (i + 1) + '">' + esc(c.title) + '</a></li>'; }).join('') + (src ? '<li><a href="#feature-sources">Πηγές</a></li>' : '');
    var rel = (a.related || []).map(function (r) { return '<a href="' + escq(r.url) + '">' + esc(r.title) + ' →</a>'; }).join('');
    var s = page;
    s = s.replace(/<span>[^<]*<\/span><h1>[\s\S]*?<\/h1><p>[\s\S]*?<\/p>/, function () { return '<span>' + esc(a.eyebrow) + '</span><h1>' + esc(a.title) + '</h1><p>' + esc(a.subtitle) + '</p>'; });
    if (a.hero) s = s.replace(/(<img class="article-hero-image" src=")[^"]*(" alt=")[^"]*"/, function (_, x, y) { return x + escq(a.hero.replace(/^\//, '')) + y + escq(a.hero_alt) + '"'; });
    s = s.replace(/<p class="f-lede">[\s\S]*?<\/p>/, function () { return '<p class="f-lede">' + esc(a.lede) + '</p>'; });
    var i = s.indexOf('<section id="feature-chapter-1">'), j = s.indexOf('</main>');
    s = s.slice(0, i) + chs + srcs + s.slice(j);
    s = s.replace(/(<nav aria-label="Περιεχόμενα αφιερώματος"><ol>)[\s\S]*?(<\/ol><\/nav>)/, function (_, x, y) { return x + toc + y; });
    if (rel) s = s.replace(/(<div class="related-links">)[\s\S]*?(<\/div>)/, function (_, x, y) { return x + rel + y; });
    s = s.replace(/(<nav class="crumb">[\s\S]*?\/ )[^<]*(<\/nav>)/, function (_, x, y) { return x + esc(a.title) + y; });
    return s;
  }
  function marker(s, name, inner) {
    var a = '<!--cms:' + name + '-->', b = '<!--/cms:' + name + '-->', i = s.indexOf(a), j = s.indexOf(b);
    return i < 0 || j < 0 ? s : s.slice(0, i + a.length) + inner + s.slice(j);
  }
  function presidentsHtml(presidents) {
    function arrow(direction, label, path) {
      return '<button class="presidents-arrow presidents-' + direction + '" type="button" aria-label="' + label + '" aria-controls="presidents-track" hidden><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="' + path + '"/></svg></button>';
    }
    var cards = presidents.map(function (x, i) {
      var name = escq(x.name), period = escq(x.period);
      var path = String(x.portrait || '').replace(/^\/+/, '');
      var valid = path.indexOf('assets/') === 0 && !/[:\\?#\x00-\x1f]/.test(path) && path.split('/').indexOf('..') < 0;
      var initials = escq(String(x.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join(''));
      var visual = valid ? '<div class="president-portrait"><img class="president-photo" src="' + escq(path) + '" alt="' + name + '" width="347" height="533" loading="lazy" decoding="async"></div>' :
        '<div class="president-no-portrait"><span class="president-initials" aria-hidden="true">' + initials + '</span><span>Χωρίς διαθέσιμο πορτρέτο</span></div>';
      var credit = valid && /^https?:\/\//.test(x.portrait_source || '') ? '<a class="president-credit" href="' + escq(x.portrait_source) + '" target="_blank" rel="noopener noreferrer" aria-label="Πηγή φωτογραφίας: ' + name + '">Φωτογραφία · ' + escq(x.portrait_credit || 'Αρχείο') + '</a>' : '';
      return '<li class="president-card" data-president-index="' + i + '">' + visual + '<span class="president-node" aria-hidden="true"></span><p class="president-period">' + period + '</p><h3 class="president-name">' + name + '</h3>' + credit + '</li>';
    }).join('');
    var first = presidents.length ? escq(String(presidents[0].period || '').split('–')[0]) : '';
    var last = presidents.length ? escq(String(presidents[presidents.length - 1].period || '').split('–').pop()) : '';
    return '<div class="presidents-carousel"><div class="presidents-stage">' + arrow('previous', 'Προηγούμενες θητείες', 'm14 5-7 7 7 7') +
      '<ol class="presidents-track" id="presidents-track" tabindex="0" aria-label="Πρόεδροι και θητείες, με χρονολογική σειρά">' + cards + '</ol>' + arrow('next', 'Επόμενες θητείες', 'm10 5 7 7-7 7') +
      '</div><p class="presidents-hint">Σύρετε τη χρονογραμμή για να ταξιδέψετε στις θητείες</p><div class="presidents-overview" hidden><span>' + first + '</span><input class="presidents-range" type="range" min="0" max="' + Math.max(0, presidents.length - 1) + '" value="0" step="1" aria-label="Μετάβαση σε θητεία"><span>' + last + '</span></div><p class="association-sr-only presidents-status" aria-live="polite" aria-atomic="true"></p></div>';
  }
  function boardHtml(page, b) {
    var dl = (b.members || []).map(function (m) { return '<div><dt>' + esc(m.role) + '</dt><dd>' + esc(m.name) + '</dd></div>'; }).join('');
    var sup = '<p><strong>Σύμβουλοι:</strong> ' + esc(b.councillors) + '.' + (b.substitutes ? ' <strong>Αναπληρωματική:</strong> ' + esc(b.substitutes) + '.' : '') + '</p>';
    var rep = b.representatives ? '<p><strong>Εκπρόσωποι στην Πανηπειρωτική Συνομοσπονδία:</strong> ' + esc(b.representatives) + '.</p>' : '';
    var s = marker(page, 'board', '<dl class="board-members">' + dl + '</dl><div class="association-board-support">' + sup + rep + '</div>');
    return marker(s, 'presidents', presidentsHtml(b.presidents || []));
  }
  function settingsHtml(page, n, old) {
    var tel = function (v) { return '+30' + String(v || '').replace(/\D/g, ''); };
    var s = page;
    [[old.phone, n.phone], [tel(old.phone), tel(n.phone)], [old.email, n.email], [old.street, n.street], [old.postcode, n.postcode]].forEach(function (p) {
      if (p[0] && p[1] && p[0] !== p[1]) s = s.split(p[0]).join(p[1]);
    });
    var hours = (n.hours || '').trim();
    if (hours) s = marker(s, 'hours', '<p><strong>Ώρες λειτουργίας</strong><br>' + esc(hours).replace(/\n/g, '<br>') + '</p>');
    return s;
  }
  function eventRecord(e, id) {
    var o = Object.assign({}, e); o.id = o.id || id;
    var d = o.date;
    if (d && typeof d !== 'string') d = new Date(d).toISOString().slice(0, 10);
    o.date = d || null;
    o.dateLabel = o.dateLabel || (d && d.length === 10 ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : (d || 'Χωρίς ημερομηνία'));
    o.media = (o.media || []).filter(function (m) { return m && (m.src || m.videoId); });
    if (!o.source) o.source = 'https://ipirotikos.gr/';
    if (o.press && o.press.src) { o.press.format = o.press.format || (/\.pdf$/i.test(o.press.src) ? 'pdf' : 'image'); o.press.label = o.press.label || 'Ανακοίνωση'; o.press.pages = o.press.pages || [o.press.src]; } else delete o.press;
    return o;
  }
  function eventCard(e) {
    var d = e.date, thumbs = window.__epirusKnownThumbs || {};
    var acts = '';
    if (e.media && e.media.length) {
      var ph = e.media.filter(function (m) { return m.type !== 'video'; }).length, vd = e.media.length - ph, parts = [];
      if (ph) parts.push(ph + ' ' + (ph === 1 ? 'φωτογραφία' : 'φωτογραφίες'));
      if (vd) parts.push(vd + ' βίντεο');
      acts += '<a class="event-open" href="' + escq(e.source) + '" data-event-gallery="' + escq(e.id) + '" aria-haspopup="dialog" aria-controls="event-gallery" target="_blank" rel="noopener noreferrer">' + parts.join(' · ') + ' →</a>';
    }
    if (e.press) acts += '<a class="event-press-link" href="' + escq(e.press.src) + '" data-event-press="' + escq(e.id) + '" aria-haspopup="dialog" aria-controls="event-press-dialog" target="_blank" rel="noopener noreferrer">' + esc(e.press.label) + ' →</a>';
    var thumb = thumbs[e.id] ? '<img class="event-card-photo" src="assets/events-design/' + escq(e.id) + '.webp" alt="" width="96" height="104">' : '';
    return '<article class="past-event" id="' + escq(e.id) + '" data-event-year="' + d.slice(0, 4) + '">' + thumb + '<div class="event-card-text"><time datetime="' + d + '">' + esc(e.dateLabel) + '</time><h3>' + esc(e.title) + '</h3></div><div class="event-card-actions">' + acts + '</div></article>';
  }
  function eventsHtml(page, dataJs, draft, id, today) {
    var w = {}; new Function('window', dataJs)(w);
    var cat = w.epirusEvents, rec = eventRecord(draft, id);
    today = today || new Date().toISOString().slice(0, 10);
    var thumbs = {}; cat.events.forEach(function (e) { thumbs[e.id] = /assets\/events-design\//.test(page) && page.indexOf('events-design/' + e.id + '.webp') >= 0; }); window.__epirusKnownThumbs = thumbs;
    cat.events = cat.events.filter(function (e) { return e.id !== rec.id; }).concat([rec]);
    var dated = cat.events.filter(function (e) { return e.date; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    cat.events = dated.concat(cat.events.filter(function (e) { return !e.date; }));
    var past = dated.filter(function (e) { return e.date <= today; }), fut = dated.filter(function (e) { return e.date > today; }).reverse();
    var s = marker(page, 'events-list', '<div class="past-events" id="events-list">' + past.map(eventCard).join('') + '</div>');
    var years = []; past.forEach(function (e) { if (years.indexOf(e.date.slice(0, 4)) < 0) years.push(e.date.slice(0, 4)); });
    s = marker(s, 'events-years', '<option value="all">Όλες οι χρονιές</option>' + years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join(''));
    s = marker(s, 'upcoming', fut.length ? '<ul class="events-upcoming-list">' + fut.map(function (e) { return '<li><time datetime="' + e.date + '">' + esc(e.dateLabel) + '</time> <strong>' + esc(e.title) + '</strong>' + (e.note ? ' <span>' + esc(e.note) + '</span>' : '') + (e.press ? ' <a href="' + escq(e.press.src) + '" target="_blank" rel="noopener noreferrer">' + esc(e.press.label) + ' →</a>' : '') + '</li>'; }).join('') + '</ul>' : '<p>Οι νέες ημερομηνίες θα ανακοινώνονται εδώ.</p>');
    return s.replace(/<script[^>]*src="assets\/events-data\.js[^"]*"[^>]*><\/script>/, function () { return '<script>window.epirusEvents=' + JSON.stringify(cat).replace(/</g, '\\u003c') + ';</script>'; });
  }
  function frame(html, extra) {
    html = html.replace(/<head>/, '<head><base href="' + BASE + '">').replace(/<\/body>/, '<style>.site-top,.site-nav{pointer-events:none}</style></body>');
    // Η προεπισκόπηση δεν πρέπει να φεύγει από τη σελίδα: οι σύνδεσμοι ανοίγουν στο ίδιο παράθυρο μόνο μέσα στο πλαίσιο.
    return html;
  }
  var h = function () { return window.CMS.React.createElement.apply(null, arguments); };
  function toData(entry) {
    var e = entry && entry.toJS ? entry.toJS() : entry;
    return (e && e.data) ? e.data : e || {};
  }
  function viewer(build) {
    return function (props) {
      var R = window.CMS.React, st = R.useState(null), doc = st[0], setDoc = st[1], er = R.useState('');
      var data = toData(props.entry), key = JSON.stringify(data);
      R.useEffect(function () {
        var alive = true;
        Promise.resolve(build(data, props.entry)).then(function (html) { if (alive) setDoc(frame(html)); }).catch(function (e) { if (alive) setDoc('<p style="font:16px sans-serif;padding:20px">Δεν ήταν δυνατή η προεπισκόπηση: ' + esc(e.message) + '</p>'); });
        return function () { alive = false; };
      }, [key]);
      return h('div', { style: { height: '100%', minHeight: '80vh' } },
        h('p', { style: { margin: 0, padding: '6px 12px', font: '14px sans-serif', background: '#f3ead8', color: '#5a3a2a' } }, 'Προεπισκόπηση — έτσι θα φανεί η σελίδα όταν πατήσετε «Δημοσίευση».'),
        doc == null ? h('p', { style: { padding: 20, font: '16px sans-serif' } }, 'Φόρτωση…') : h('iframe', { title: 'Προεπισκόπηση', srcDoc: doc, style: { width: '100%', height: 'calc(100% - 34px)', minHeight: '80vh', border: 0 } }));
    };
  }
  window.__epirusPreview = { articleHtml: articleHtml, boardHtml: boardHtml, settingsHtml: settingsHtml, eventsHtml: eventsHtml, chapterHtml: chapterHtml };
  function register() {
    var CMS = window.CMS; if (!CMS || !CMS.registerPreviewTemplate) return;
    CMS.registerPreviewTemplate('articles', viewer(function (a) {
      var slug = /^[a-z0-9-]+$/.test(a.slug || '') ? a.slug : '';
      return get(slug + '.html').catch(function () { return get('kazania.html'); }).then(function (p) { return articleHtml(p, a); });
    }));
    CMS.registerPreviewTemplate('board', viewer(function (b) { return get('syndesmos.html').then(function (p) { return boardHtml(p, b); }); }));
    CMS.registerPreviewTemplate('settings', viewer(function (n) {
      return Promise.all([get('epikoinonia.html'), get('content/.applied.json').then(JSON.parse)]).then(function (r) { return settingsHtml(r[0], n, r[1]); });
    }));
    CMS.registerPreviewTemplate('events', viewer(function (e, entry) {
      var id = (entry && entry.get && entry.get('slug')) || e.id || 'nea-ekdilosi';
      return Promise.all([get('ekdiloseis.html'), get('assets/events-data.js')]).then(function (r) { return eventsHtml(r[0], r[1], e, id); });
    }));
    ['articles', 'board', 'settings', 'events'].forEach(function () {});
  }
  if (window.CMS) register(); else window.addEventListener('load', register);
})();

