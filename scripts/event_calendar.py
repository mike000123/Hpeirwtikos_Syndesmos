"""Meeting date validation and the progressively enhanced upcoming list."""
import datetime as dt
import html
import re
from zoneinfo import ZoneInfo

ZONE = ZoneInfo('Europe/Athens')


def today():
    return dt.datetime.now(ZONE).date().isoformat()


def calendar_dates(event):
    value = event.get('date')
    fields = ('time', 'endDate', 'endTime')
    if not value or re.fullmatch(r'\d{4}-\d{2}', value):
        if any(event.get(k) for k in fields):
            raise ValueError('Η ώρα και η λήξη χρειάζονται πλήρη ημερομηνία έναρξης.')
        return None  # Undated / month-only historical records stay in the archive.
    try:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
            raise ValueError('Χρειάζεται πλήρης ημερομηνία.')
        first = dt.date.fromisoformat(value)
        last = dt.date.fromisoformat(event.get('endDate') or value)
    except (TypeError, ValueError) as error:
        raise ValueError('Χρησιμοποιήστε έγκυρη ημερομηνία YYYY-MM-DD.') from error
    if last < first:
        raise ValueError('Η ημερομηνία λήξης πρέπει να ακολουθεί την έναρξη.')
    start_time, end_time = event.get('time'), event.get('endTime')
    if not start_time:
        if end_time:
            raise ValueError('Συμπληρώστε πρώτα την ώρα έναρξης.')
        return first.isoformat(), last.isoformat()
    if event.get('endDate') and not end_time:
        raise ValueError('Συμπληρώστε ώρα λήξης για πολυήμερη συνάντηση με ώρα.')

    def instant(date, time):
        if not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', time):
            raise ValueError('Η ώρα πρέπει να έχει μορφή ΩΩ:ΛΛ (π.χ. 19:30).')
        local = dt.datetime.combine(date, dt.time.fromisoformat(time), ZONE)
        utc = local.astimezone(dt.timezone.utc)
        if utc.astimezone(ZONE).replace(tzinfo=None) != local.replace(tzinfo=None):
            raise ValueError('Η ώρα αυτή δεν υπάρχει λόγω αλλαγής της θερινής ώρας.')
        return utc

    start = instant(first, start_time)
    if end_time and instant(last, end_time) < start:
        raise ValueError('Η λήξη πρέπει να ακολουθεί την έναρξη. Για μετά τα μεσάνυχτα επιλέξτε ημερομηνία λήξης.')
    if end_time == '00:00' and last > first:
        last -= dt.timedelta(days=1)
    return first.isoformat(), last.isoformat()


def upcoming_html(events):
    if not events:
        return '<p>Οι νέες ημερομηνίες θα ανακοινώνονται εδώ.</p>'
    esc = lambda value: html.escape(str(value or ''), quote=True)
    items = []
    for e in events:
        timing = f' · {esc(e["time"])}' if e.get('time') else ''
        if e.get('endTime'):
            timing += f'–{esc(e["endTime"])}'
        place = f'<span>{esc(e["location"])}</span>' if e.get('location') else ''
        note = f'<span>{esc(e["note"])}</span>' if e.get('note') else ''
        press = e.get('press') or {}
        announcement = (f'<a href="{esc(press["src"])}" data-event-press="{esc(e["id"])}" '
                        f'aria-haspopup="dialog" aria-controls="event-press-dialog" target="_blank" '
                        f'rel="noopener noreferrer">{esc(press.get("label") or "Ανακοίνωση")} →</a>') if press.get('src') else ''
        items.append(f'<li><time datetime="{esc(e["date"])}">{esc(e["dateLabel"])}{timing}</time> '
                     f'<strong>{esc(e["title"])}</strong>{place}{note}'
                     f'<button type="button" class="meeting-upcoming-open" data-calendar-open '
                     f'data-calendar-event="{esc(e["id"])}" aria-haspopup="dialog" '
                     f'aria-controls="meetings-calendar" hidden>Πληροφορίες &amp; ημερολόγιο →</button>{announcement}</li>')
    return '<ul class="events-upcoming-list">' + ''.join(items) + '</ul>'
