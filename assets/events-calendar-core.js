/* Shared by the public calendar and CMS preview. All meeting times are Greek local time. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EpirusCalendarCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const zone = 'Europe/Athens';
  const wallFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  function day(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value ? value : null;
  }
  function addDays(value, amount) {
    const date = new Date(value + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  }
  function today() {
    const p = Object.fromEntries(wallFormat.formatToParts(new Date()).map(p => [p.type, p.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function wallParts(ms) {
    return Object.fromEntries(wallFormat.formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  }
  function compact(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
  function localInstant(date, time) {
    if (!day(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Μη έγκυρη ημερομηνία ή ώρα.');
    const base = Date.parse(date + 'T' + time + ':00Z');
    const offsets = new Set([-86400000, 0, 86400000].map(delta => {
      const ms = base + delta, p = wallParts(ms);
      return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`) - ms;
    }));
    const candidates = [...offsets].map(offset => base - offset).filter(ms => {
      const p = wallParts(ms);
      return `${p.year}-${p.month}-${p.day}` === date && `${p.hour}:${p.minute}` === time;
    }).sort((a, b) => a - b);
    if (!candidates.length) throw new Error('Αυτή η ώρα δεν υπάρχει λόγω αλλαγής της θερινής ώρας.');
    // At the repeated autumn hour, choose its first occurrence, matching Python fold=0.
    return candidates[0];
  }
  function normalize(event) {
    if (!day(event.date) || !event.title || !event.id) return null;
    const last = event.endDate || event.date;
    if (!day(last) || last < event.date) throw new Error('Η λήξη πρέπει να ακολουθεί την έναρξη.');
    if (!event.time) {
      if (event.endTime) throw new Error('Συμπληρώστε πρώτα την ώρα έναρξης.');
      return { start: event.date.replace(/-/g, ''), end: addDays(last, 1).replace(/-/g, ''), allDay: true, firstDay: event.date, lastDay: last };
    }
    if (event.endDate && !event.endTime) throw new Error('Συμπληρώστε ώρα λήξης για πολυήμερη συνάντηση με ώρα.');
    const start = localInstant(event.date, event.time);
    const end = event.endTime ? localInstant(last, event.endTime) : start;
    if (end < start) throw new Error('Η λήξη πρέπει να ακολουθεί την έναρξη. Για μετά τα μεσάνυχτα επιλέξτε ημερομηνία λήξης.');
    // A midnight end belongs to the preceding day in the calendar grid.
    const lastDay = event.endTime === '00:00' && last > event.date ? addDays(last, -1) : last;
    return { start: compact(new Date(start)), end: compact(new Date(end)), allDay: false, firstDay: event.date, lastDay };
  }
  function eventURL(event, pageURL) {
    const url = new URL('ekdiloseis.html', pageURL);
    url.search = ''; url.hash = 'meeting=' + encodeURIComponent(event.id);
    return url.href;
  }
  function details(event, pageURL) {
    return [...new Set([event.description, event.note].filter(Boolean))].concat(eventURL(event, pageURL)).join('\n\n');
  }
  function googleURL(event, pageURL) {
    const n = normalize(event); if (!n) return null;
    const url = new URL('https://calendar.google.com/calendar/render');
    url.search = new URLSearchParams({ action: 'TEMPLATE', text: event.title,
      dates: `${n.start}/${n.end}`, ctz: zone, details: details(event, pageURL), location: event.location || '' }).toString();
    return url.href;
  }
  function escapeText(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }
  function fold(line) {
    const encoder = new TextEncoder(); let result = '', length = 0;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (length + size > 75) { result += '\r\n '; length = 1; }
      result += char; length += size;
    }
    return result;
  }
  function ics(event, pageURL, now = new Date()) {
    const n = normalize(event); if (!n) return null;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ipirotikos Syndesmos//Meetings//EL',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${encodeURIComponent(event.id)}@ipirotikos.gr`,
      'DTSTAMP:' + compact(now), `DTSTART${n.allDay ? ';VALUE=DATE' : ''}:${n.start}`];
    if (n.allDay || n.end !== n.start) lines.push(`DTEND${n.allDay ? ';VALUE=DATE' : ''}:${n.end}`);
    lines.push('SUMMARY:' + escapeText(event.title));
    if (event.location) lines.push('LOCATION:' + escapeText(event.location));
    lines.push('DESCRIPTION:' + escapeText(details(event, pageURL)), 'URL:' + eventURL(event, pageURL), 'END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  return { zone, day, addDays, today, normalize, googleURL, ics, eventURL };
});
