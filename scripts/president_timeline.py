"""Render the association's dated portrait gallery from the CMS board records."""
import html
import re


def portrait_path(value):
    path = str(value or '').lstrip('/')
    return path if (path.startswith('assets/') and not re.search(r'[:\\?#]', path)
                    and '..' not in path.split('/') and not any(ord(c) < 32 for c in path)) else ''


def presidents_html(presidents):
    esc = lambda s: html.escape(str(s or ''), quote=True)
    cards = []
    for index, person in enumerate(presidents):
        name, period = esc(person.get('name')), esc(person.get('period'))
        initials = esc(''.join(w[0] for w in str(person.get('name') or '').split()[:2]))
        photo = portrait_path(person.get('portrait'))
        if photo:
            visual = (f'<div class="president-portrait"><img class="president-photo" src="{esc(photo)}" '
                      f'alt="{name}" width="347" height="533" loading="lazy" decoding="async"></div>')
        else:
            visual = (f'<div class="president-no-portrait"><span class="president-initials" aria-hidden="true">{initials}</span>'
                      '<span>Χωρίς διαθέσιμο πορτρέτο</span></div>')
        source = str(person.get('portrait_source') or '')
        credit = (f'<a class="president-credit" href="{esc(source)}" target="_blank" rel="noopener noreferrer" '
                  f'aria-label="Πηγή φωτογραφίας: {name}">Φωτογραφία · {esc(person.get("portrait_credit") or "Αρχείο")}</a>') if photo and re.match(r'^https?://', source) else ''
        cards.append(f'<li class="president-card" data-president-index="{index}">{visual}<span class="president-node" aria-hidden="true"></span>'
                     f'<p class="president-period">{period}</p><h3 class="president-name">{name}</h3>{credit}</li>')
    def arrow(direction, label, path):
        return (f'<button class="presidents-arrow presidents-{direction}" type="button" aria-label="{label}" aria-controls="presidents-track" hidden>'
                f'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="{path}"/></svg></button>')
    first = esc(presidents[0].get('period', '').split('–')[0]) if presidents else ''
    last = esc(presidents[-1].get('period', '').split('–')[-1]) if presidents else ''
    return ('<div class="presidents-carousel"><div class="presidents-stage">'
            + arrow('previous', 'Προηγούμενες θητείες', 'm14 5-7 7 7 7')
            + '<ol class="presidents-track" id="presidents-track" tabindex="0" aria-label="Πρόεδροι και θητείες, με χρονολογική σειρά">'
            + ''.join(cards) + '</ol>' + arrow('next', 'Επόμενες θητείες', 'm10 5 7 7-7 7')
            + '</div><p class="presidents-hint">Σύρετε τη χρονογραμμή για να ταξιδέψετε στις θητείες</p>'
            + '<div class="presidents-overview" hidden>' + f'<span>{first}</span>'
            + f'<input class="presidents-range" type="range" min="0" max="{max(0, len(presidents)-1)}" value="0" step="1" aria-label="Μετάβαση σε θητεία">'
            + f'<span>{last}</span></div><p class="association-sr-only presidents-status" aria-live="polite" aria-atomic="true"></p></div>')
