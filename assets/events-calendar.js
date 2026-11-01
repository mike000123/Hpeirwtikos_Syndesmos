(() => {
  'use strict';
  const core = window.EpirusCalendarCore, dialog = document.getElementById('meetings-calendar');
  if (!core || !dialog || typeof dialog.showModal !== 'function' || !Array.isArray(window.epirusEvents?.events)) return;
  const events = window.epirusEvents.events.flatMap(event => {
    try { const dates = core.normalize(event); return dates ? [{ ...event, dates }] : []; }
    catch (error) { console.warn('Παραλείφθηκε μη έγκυρη ημερομηνία συνάντησης:', event.id, error.message); return []; }
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title, 'el'));
  const launch = document.querySelector('[data-calendar-launch]');
  const grid = dialog.querySelector('[data-calendar-grid]'), label = dialog.querySelector('#meetings-month');
  const agenda = dialog.querySelector('[data-calendar-agenda]'), agendaTitle = dialog.querySelector('#meetings-agenda-title');
  const reset = dialog.querySelector('[data-calendar-reset]'), status = dialog.querySelector('[data-calendar-status]');
  const dateFormat = new Intl.DateTimeFormat('el-GR', { dateStyle: 'full', timeZone: 'UTC' });
  const shortDate = new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const monthFormat = new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  let month = core.today().slice(0, 7), selected = null, opener = null, savedOverflow = '';
  function element(tag, text, className) {
    const el = document.createElement(tag); if (text != null) el.textContent = text;
    if (className) el.className = className; return el;
  }
  function format(date, formatter = dateFormat) { return formatter.format(new Date(date + 'T12:00:00Z')); }
  function onDay(day) { return events.filter(e => e.dates.firstDay <= day && e.dates.lastDay >= day); }
  function select(day, focus = false) {
    selected = day; month = day.slice(0, 7); render();
    if (focus) grid.querySelector(`[data-calendar-day="${day}"]`)?.focus();
  }
  function link(text, href) {
    const a = element('a', text); a.href = href; return a;
  }
  function card(event) {
    const article = element('article', null, 'meeting-card');
    article.append(element('h4', event.title));
    const dates = event.endDate && event.endDate !== event.date ? `${format(event.date, shortDate)} – ${format(event.endDate, shortDate)}` : format(event.date, shortDate);
    article.append(element('p', dates + (event.time ? ` · ${event.time}${event.endTime ? '–' + event.endTime : ''}` : ' · Ολοήμερη'), 'meeting-date'));
    if (event.time) article.append(element('p', 'Ώρα Ελλάδας', 'meeting-timezone'));
    if (event.location) article.append(element('p', event.location, 'meeting-location'));
    for (const text of new Set([event.description, event.note].filter(Boolean))) article.append(element('p', text, 'meeting-description'));
    const actions = element('div', null, 'meeting-actions');
    const google = link('Προσθήκη στο Google Calendar', core.googleURL(event, location.href));
    google.target = '_blank'; google.rel = 'noopener noreferrer'; google.className = 'meeting-google'; actions.append(google);
    const download = element('button', 'Apple / Outlook (.ics)', 'meeting-download'); download.type = 'button';
    download.setAttribute('aria-label', 'Λήψη αρχείου ημερολογίου: ' + event.title);
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([core.ics(event, location.href)], { type: 'text/calendar;charset=utf-8' }));
      const a = link('', url); a.download = String(event.id).replace(/[^a-zA-Z0-9_-]/g, '_') + '.ics';
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    });
    actions.append(download);
    if (event.press?.src) {
      const url = new URL(event.press.src, location.href);
      if (['http:', 'https:'].includes(url.protocol)) {
        const press = link(event.press.label || 'Ανακοίνωση', url.href);
        press.dataset.eventPress = event.id; press.setAttribute('aria-haspopup', 'dialog'); press.setAttribute('aria-controls', 'event-press-dialog');
        press.target = '_blank'; press.rel = 'noopener noreferrer'; actions.append(press);
      }
    } else if (event.source && event.source !== 'https://ipirotikos.gr/') {
      try {
        const url = new URL(event.source, location.href);
        if (['http:', 'https:'].includes(url.protocol)) {
          const more = link('Περισσότερες πληροφορίες ↗', url.href); more.target = '_blank'; more.rel = 'noopener noreferrer'; actions.append(more);
        }
      } catch { /* A malformed optional source must not hide the meeting. */ }
    }
    article.append(actions); return article;
  }
  function render() {
    const first = month + '-01', date = new Date(first + 'T12:00:00Z');
    label.textContent = monthFormat.format(date);
    const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    const offset = (date.getUTCDay() + 6) % 7;
    const tabDay = selected?.startsWith(month) ? selected : core.today().startsWith(month) ? core.today() : first;
    grid.replaceChildren();
    for (let start = 0; start < Math.ceil((days + offset) / 7) * 7; start += 7) {
      const row = element('div', null, 'meeting-week'); row.setAttribute('role', 'row');
      for (let col = 0; col < 7; col++) {
        const n = start + col - offset + 1, cell = element('div'); cell.setAttribute('role', 'gridcell');
        if (n > 0 && n <= days) {
          const day = `${month}-${String(n).padStart(2, '0')}`, list = onDay(day), button = element('button', String(n));
          button.type = 'button'; button.dataset.calendarDay = day; button.tabIndex = day === tabDay ? 0 : -1;
          button.setAttribute('aria-label', format(day) + (list.length ? ` · ${list.length} ${list.length === 1 ? 'συνάντηση' : 'συναντήσεις'}` : ' · Χωρίς συναντήσεις'));
          button.setAttribute('aria-pressed', String(day === selected)); cell.setAttribute('aria-selected', String(day === selected));
          if (day === core.today()) button.setAttribute('aria-current', 'date');
          if (list.length) { button.classList.add('has-meetings'); const dot = element('span', '', 'meeting-day-dot'); dot.setAttribute('aria-hidden', 'true'); button.append(dot); }
          button.addEventListener('click', () => select(day, true)); cell.append(button);
        }
        row.append(cell);
      }
      grid.append(row);
    }
    const last = `${month}-${String(days).padStart(2, '0')}`;
    const list = selected ? onDay(selected) : events.filter(e => e.dates.firstDay <= last && e.dates.lastDay >= first);
    agendaTitle.textContent = selected ? format(selected) : 'Συναντήσεις του μήνα';
    reset.hidden = !selected;
    agenda.replaceChildren(...list.map(card));
    if (!list.length) {
      agenda.append(element('p', selected ? 'Δεν έχει ανακοινωθεί συνάντηση για αυτή την ημέρα.' : 'Δεν έχουν ανακοινωθεί συναντήσεις για αυτόν τον μήνα.', 'meeting-empty'));
      const p = element('p', 'Για περισσότερες πληροφορίες, '); p.append(link('επικοινωνήστε μαζί μας.', 'epikoinonia.html')); agenda.append(p);
    }
    status.textContent = `${label.textContent}. ${list.length} ${list.length === 1 ? 'συνάντηση' : 'συναντήσεις'}.`;
  }
  function moveMonth(delta, keyboard = false) {
    const date = new Date(month + '-01T12:00:00Z'); date.setUTCMonth(date.getUTCMonth() + delta);
    const year = date.getUTCFullYear(); if (year < 1900 || year > 2199) return;
    month = date.toISOString().slice(0, 7); selected = null; render();
    if (keyboard) grid.querySelector('[tabindex="0"]')?.focus();
  }
  function open(trigger, id) {
    const event = id && events.find(e => e.id === id), today = core.today();
    const next = event || events.find(e => e.dates.lastDay >= today);
    selected = next ? next.date < today && next.dates.lastDay >= today ? today : next.date : null;
    month = (selected || today).slice(0, 7);
    if (!dialog.open) { opener = trigger; savedOverflow = document.body.style.overflow; }
    const art = document.querySelector('.events-hero-art');
    if (art) dialog.querySelector('.meetings-calendar-art').src = art.getAttribute('src');
    render(); if (!dialog.open) dialog.showModal(); document.body.style.overflow = 'hidden';
    dialog.querySelector('[data-calendar-close]').focus({ preventScroll: true });
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-calendar-open]'); if (!trigger) return;
    event.preventDefault(); open(trigger, trigger.dataset.calendarEvent);
  });
  dialog.querySelector('[data-calendar-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.style.overflow = savedOverflow; opener?.focus({ preventScroll: true }); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex]')].filter(el => el.tabIndex >= 0 && el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.querySelector('[data-calendar-prev]').addEventListener('click', () => moveMonth(-1));
  dialog.querySelector('[data-calendar-next]').addEventListener('click', () => moveMonth(1));
  dialog.querySelector('[data-calendar-today]').addEventListener('click', () => select(core.today(), true));
  reset.addEventListener('click', () => { selected = null; render(); reset.hidden = true; grid.querySelector('[tabindex="0"]')?.focus(); });
  grid.addEventListener('keydown', event => {
    const button = event.target.closest('[data-calendar-day]'); if (!button) return;
    const day = button.dataset.calendarDay;
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in deltas) { event.preventDefault(); select(core.addDays(day, deltas[event.key]), true); }
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); const weekday = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7;
      select(core.addDays(day, event.key === 'Home' ? -weekday : 6 - weekday), true);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); moveMonth(event.key === 'PageUp' ? -1 : 1, true); }
  });
  document.querySelectorAll('[data-calendar-open]').forEach(button => { button.hidden = false; });
  document.querySelector('[data-calendar-fallback]')?.setAttribute('hidden', '');
  function deepLink() {
    if (!location.hash.startsWith('#meeting=')) return;
    let id; try { id = decodeURIComponent(location.hash.slice(9)); } catch { return; }
    if (events.some(e => e.id === id)) open(launch, id);
  }
  window.addEventListener('hashchange', deepLink); deepLink();
})();
