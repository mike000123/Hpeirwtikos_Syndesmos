/* Open original press documents inside the new site's own reader. */
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

  function documentURL(press) {
    try {
      const url = new URL(press?.src);
      if (url.origin !== 'https://ipirotikos.gr' || !url.pathname.startsWith('/wp-content/uploads/')) return null;
      const extension = url.pathname.toLowerCase();
      return (press.format === 'pdf' && extension.endsWith('.pdf')) ||
        (press.format === 'image' && /\.(jpe?g|png|webp)$/.test(extension)) ? url.href : null;
    } catch { return null; }
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
    const documentNode = document.createElement(event.press.format === 'pdf' ? 'iframe' : 'img');
    if (event.press.format === 'pdf') {
      documentNode.className = 'event-press-pdf';
      documentNode.title = `Δελτίο τύπου: ${event.title}, ${event.dateLabel}`;
      documentNode.referrerPolicy = 'strict-origin-when-cross-origin';
      documentNode.src = `${src}#view=FitH&toolbar=1&navpanes=0`;
    } else {
      documentNode.className = 'event-press-image';
      documentNode.alt = `${event.press.label}: ${event.title}, ${event.dateLabel}`;
      documentNode.decoding = 'async';
      documentNode.src = src;
    }
    documentNode.addEventListener('load', () => {
      if (content.firstElementChild === documentNode) status.hidden = true;
    }, { once: true });
    documentNode.addEventListener('error', () => {
      if (content.firstElementChild !== documentNode) return;
      content.replaceChildren();
      status.hidden = false;
      status.textContent = 'Το αρχείο δεν φορτώθηκε. Μπορείτε να το ανοίξετε από τον σύνδεσμο παρακάτω.';
    }, { once: true });
    content.append(documentNode);
    try { dialog.showModal(); } catch {
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
    content.replaceChildren();
    status.textContent = '';
    status.hidden = true;
    document.body.style.overflow = savedOverflow;
    const trigger = opener;
    opener = null;
    trigger?.focus({ preventScroll: true });
  });
})();
