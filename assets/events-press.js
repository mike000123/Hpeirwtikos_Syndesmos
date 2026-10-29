/* Read locally archived document pages without a browser PDF plug-in. */
(() => {
  'use strict';
  const dialog = document.querySelector('#event-press-dialog');
  const catalogue = window.epirusEvents;
  if (!dialog || typeof dialog.showModal !== 'function' || !Array.isArray(catalogue?.events)) return;
  const events = new Map(catalogue.events.map(event => [event.id, event]));
  const title = document.querySelector('#event-press-title');
  const date = document.querySelector('#event-press-date');
  const kind = document.querySelector('#event-press-kind');
  const content = document.querySelector('#event-press-content');
  const body = document.querySelector('.event-press-body');
  const status = document.querySelector('#event-press-status');
  const file = document.querySelector('#event-press-file');
  const close = document.querySelector('#event-press-close');
  let opener = null;
  let savedOverflow = '';

  let loadTimer;
  let session = 0;
  function localFile(value, preview = false) {
    return typeof value === 'string' && /^assets\/event-press\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:pdf|jpe?g|png|webp)$/.test(value) &&
      (!preview || !value.endsWith('.pdf')) ? value : null;
  }
  function documentURL(press) {
    return localFile(press?.src) && Array.isArray(press.pages) && press.pages.length &&
      press.pages.every(page => localFile(page, true)) ? press.src : null;
  }

  function open(event, trigger) {
    const src = documentURL(event.press);
    if (!src || dialog.open) return false;
    const gallery = document.querySelector('#event-gallery');
    let returnFocus = trigger;
    if (gallery?.open) {
      returnFocus = document.querySelector(`[data-event-gallery="${event.id}"]`) || trigger;
      gallery.close();
    }
    savedOverflow = document.body.style.overflow;
    opener = returnFocus;
    title.textContent = event.title;
    date.textContent = event.dateLabel;
    kind.textContent = event.press.label;
    file.href = src;
    content.replaceChildren();
    status.hidden = false;
    status.textContent = 'Φόρτωση αρχείου…';
    const current = ++session;
    let errors = 0;
    loadTimer = setTimeout(() => {
      if (current === session && dialog.open) {
        status.hidden = false;
        status.textContent = 'Η φόρτωση καθυστερεί. Μπορείτε να ανοίξετε το αρχείο από τον σύνδεσμο παρακάτω.';
      }
    }, 12000);
    event.press.pages.forEach((page, index) => {
      const image = document.createElement('img');
      image.className = event.press.format === 'pdf' ? 'event-press-image event-press-page' : 'event-press-image';
      image.alt = `${event.press.label}: ${event.title}, ${event.dateLabel} — Σελίδα ${index + 1} από ${event.press.pages.length}`;
      image.decoding = 'async';
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.addEventListener('load', () => {
        if (current !== session) return;
        if (index === 0) {
          clearTimeout(loadTimer);
          if (!errors) status.hidden = true;
        }
      }, { once: true });
      image.addEventListener('error', () => {
        if (current !== session) return;
        errors++;
        clearTimeout(loadTimer);
        status.hidden = false;
        status.textContent = 'Μια σελίδα δεν φορτώθηκε. Μπορείτε να ανοίξετε το αρχείο από τον σύνδεσμο παρακάτω.';
      }, { once: true });
      image.src = page;
      content.append(image);
    });
    try { dialog.showModal(); } catch {
      clearTimeout(loadTimer);
      session++;
      content.replaceChildren();
      opener = null;
      return false;
    }
    document.body.style.overflow = 'hidden';
    body.scrollTop = 0;
    close.focus();
    return true;
  }

  document.addEventListener('click', click => {
    const trigger = click.target.closest?.('[data-event-press]');
    if (!trigger || click.button !== 0 || click.ctrlKey || click.metaKey || click.shiftKey || click.altKey) return;
    const event = events.get(trigger.dataset.eventPress);
    if (event && open(event, trigger)) click.preventDefault();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    clearTimeout(loadTimer);
    session++;
    content.replaceChildren();
    status.textContent = '';
    status.hidden = true;
    document.body.style.overflow = savedOverflow;
    const trigger = opener;
    opener = null;
    trigger?.focus({ preventScroll: true });
  });
})();
