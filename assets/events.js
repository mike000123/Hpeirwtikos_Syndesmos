/* Progressive enhancement: each card keeps a usable source link without JavaScript. */
(() => {
  'use strict';
  const dialog = document.querySelector('#event-gallery');
  const catalogue = window.epirusEvents;
  if (!dialog || typeof dialog.showModal !== 'function' || !Array.isArray(catalogue?.events)) return;
  const events = new Map(catalogue.events.map(event => [event.id, event]));
  const title = document.querySelector('#event-gallery-title');
  const date = document.querySelector('#event-gallery-date');
  const note = document.querySelector('#event-gallery-note');
  const stage = document.querySelector('#event-gallery-stage');
  const caption = document.querySelector('#event-gallery-caption');
  const counter = document.querySelector('#event-gallery-counter');
  const original = document.querySelector('#event-gallery-original');
  const source = document.querySelector('#event-gallery-source');
  const thumbs = document.querySelector('#event-gallery-thumbs');
  const previous = document.querySelector('#event-gallery-previous');
  const next = document.querySelector('#event-gallery-next');
  const close = document.querySelector('#event-gallery-close');
  let active = null;
  let index = 0;
  let opener = null;
  let savedOverflow = '';

  function photoURL(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'ipirotikos.gr' &&
        url.pathname.startsWith('/wp-content/uploads/') ? url.href : null;
    } catch { return null; }
  }

  function videoID(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null;
  }

  function usable(item) {
    return item.type === 'photo' ? Boolean(photoURL(item.src)) : item.type === 'video' && Boolean(videoID(item.videoId));
  }

  function display(position) {
    if (!active) return;
    index = (position + active.media.length) % active.media.length;
    const item = active.media[index];
    // Removing the previous player also stops its audio and releases its resources.
    stage.replaceChildren();
    caption.textContent = item.caption;
    counter.textContent = `${index + 1} / ${active.media.length} · ${item.type === 'video' ? 'Βίντεο' : 'Φωτογραφία'}`;
    if (item.type === 'photo') {
      const image = document.createElement('img');
      image.className = 'event-gallery-image';
      image.alt = item.caption;
      image.decoding = 'async';
      image.addEventListener('error', () => {
        // A late error from an image that has already been replaced must not reset the new item.
        if (stage.firstElementChild !== image) return;
        const message = document.createElement('p');
        message.className = 'event-media-error';
        message.setAttribute('role', 'status');
        message.textContent = 'Η φωτογραφία δεν φορτώθηκε. Μπορείτε να ανοίξετε το πρωτότυπο από τον σύνδεσμο παρακάτω.';
        stage.replaceChildren(message);
      }, { once: true });
      image.src = photoURL(item.src);
      stage.append(image);
      original.href = photoURL(item.src);
      original.textContent = 'Άνοιγμα πρωτότυπης φωτογραφίας ↗';
    } else {
      const player = document.createElement('iframe');
      player.className = 'event-gallery-video';
      player.title = item.caption;
      player.allow = 'encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      player.src = `https://www.youtube-nocookie.com/embed/${videoID(item.videoId)}?rel=0`;
      stage.append(player);
      original.href = `https://www.youtube.com/watch?v=${videoID(item.videoId)}`;
      original.textContent = 'Δείτε το βίντεο στο YouTube ↗';
    }
    [...thumbs.children].forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      if (i === index) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function buildThumbnails() {
    thumbs.replaceChildren();
    active.media.forEach((item, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'event-gallery-thumb';
      button.setAttribute('aria-label', `${item.type === 'video' ? 'Βίντεο' : 'Φωτογραφία'} ${i + 1}: ${item.caption}`);
      button.setAttribute('aria-pressed', 'false');
      if (item.type === 'photo') {
        const image = document.createElement('img');
        image.alt = '';
        image.width = 96;
        image.height = 72;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('error', () => {
          image.hidden = true;
          const label = document.createElement('span');
          label.textContent = `Φωτογραφία ${i + 1}`;
          button.append(label);
        }, { once: true });
        image.src = photoURL(item.src);
        button.append(image);
      } else {
        const label = document.createElement('span');
        label.className = 'event-video-thumb-label';
        label.textContent = '▶ Βίντεο';
        button.append(label);
      }
      button.addEventListener('click', () => display(i));
      thumbs.append(button);
    });
  }

  function open(event, trigger) {
    const media = event.media.filter(usable);
    if (!media.length || dialog.open) return false;
    active = { ...event, media };
    opener = trigger;
    title.textContent = event.title;
    date.textContent = event.dateLabel;
    note.textContent = event.note || '';
    note.hidden = !event.note;
    source.href = event.source;
    previous.hidden = next.hidden = media.length < 2;
    buildThumbnails();
    savedOverflow = document.body.style.overflow;
    try { dialog.showModal(); } catch {
      thumbs.replaceChildren();
      active = null;
      opener = null;
      return false;
    }
    document.body.style.overflow = 'hidden';
    display(0);
    close.focus();
    return true;
  }

  document.querySelectorAll('[data-event-gallery]').forEach(trigger => {
    const event = events.get(trigger.dataset.eventGallery);
    if (!event || !Array.isArray(event.media)) return;
    trigger.addEventListener('click', click => {
      // Preserve normal browser behaviour for open-in-new-tab and modified clicks.
      if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return;
      if (open(event, trigger)) click.preventDefault();
    });
  });
  previous.addEventListener('click', () => display(index - 1));
  next.addEventListener('click', () => display(index + 1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      display(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  // Escape uses the native dialog cancellation and focus containment behaviour.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    stage.replaceChildren();
    thumbs.replaceChildren();
    active = null;
    document.body.style.overflow = savedOverflow;
    const trigger = opener;
    opener = null;
    trigger?.focus({ preventScroll: true });
  });
})();
