/* A finite chronological strip: native touch scrolling, arrows, keyboard and overview. */
(() => {
  document.querySelectorAll('.presidents-carousel').forEach(carousel => {
    const track = carousel.querySelector('.presidents-track');
    const cards = Array.from(track.querySelectorAll('.president-card'));
    const previous = carousel.querySelector('.presidents-previous');
    const next = carousel.querySelector('.presidents-next');
    const range = carousel.querySelector('.presidents-range');
    const status = carousel.querySelector('.presidents-status');
    if (!cards.length) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let scheduled = false;
    const position = card => card.offsetLeft - cards[0].offsetLeft;
    const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const nearest = () => cards.reduce((best, card, i) =>
      Math.abs(Math.min(position(card), max()) - track.scrollLeft) <
      Math.abs(Math.min(position(cards[best]), max()) - track.scrollLeft) ? i : best, 0);
    const label = i => `${cards[i].querySelector('.president-period').textContent}: ${cards[i].querySelector('.president-name').textContent}`;
    const update = () => {
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max() - 2;
      const index = track.scrollLeft >= max() - 2 ? cards.length - 1 : nearest();
      if (document.activeElement !== range) range.value = index;
      range.setAttribute('aria-valuetext', label(Number(range.value)));
      scheduled = false;
    };
    const go = (index, smooth = true) => {
      index = Math.max(0, Math.min(cards.length - 1, index));
      track.scrollTo({left:Math.min(position(cards[index]), max()), behavior:smooth && !reduced.matches ? 'smooth' : 'instant'});
      range.value = index;
      range.setAttribute('aria-valuetext', label(index));
      status.textContent = label(index);
    };
    previous.addEventListener('click', () => {
      // At the end several cards may share the same clamped position.
      let i = cards.findLastIndex(card => position(card) < track.scrollLeft - 3);
      go(Math.max(0, i));
    });
    next.addEventListener('click', () => {
      const i = cards.findIndex(card => position(card) > track.scrollLeft + 3);
      go(i < 0 ? cards.length - 1 : i);
    });
    range.addEventListener('input', () => go(Number(range.value), false));
    track.addEventListener('keydown', event => {
      if (event.target !== track) return;
      if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Home') go(0);
        else if (event.key === 'End') go(cards.length - 1);
        else (event.key === 'ArrowLeft' ? previous : next).click();
      }
    });
    track.addEventListener('scroll', () => {if (!scheduled) {scheduled = true; requestAnimationFrame(update);}}, {passive:true});
    // Touch uses the browser's native swipe. Mouse users can also drag the strip.
    let drag;
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a,button')) return;
      drag = {x:event.clientX, left:track.scrollLeft, moved:false, id:event.pointerId};
      track.setPointerCapture(event.pointerId);
    });
    track.addEventListener('pointermove', event => {
      if (!drag) return;
      if (Math.abs(event.clientX-drag.x) > 5) {
        drag.moved = true; carousel.setAttribute('data-dragging','');
        track.setPointerCapture(event.pointerId);
        track.scrollLeft = drag.left - (event.clientX-drag.x);
      }
    });
    const release = () => {drag = null; carousel.removeAttribute('data-dragging');};
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('lostpointercapture', release);
    track.addEventListener('dragstart', event => event.preventDefault());
    carousel.setAttribute('data-ready','');
    previous.hidden = next.hidden = false;
    carousel.querySelector('.presidents-overview').hidden = false;
    // Open near the first available authentic portrait; all earlier terms remain accessible.
    const firstPhoto = cards.findIndex(card => card.querySelector('.president-photo'));
    go(firstPhoto < 0 ? 0 : firstPhoto, false);
    update();
    new ResizeObserver(update).observe(track);
  });
})();
