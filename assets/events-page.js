/* Show every record without JavaScript; enhance with a year filter and a compact first view. */
(() => {
  'use strict';
  const list = document.querySelector('#events-list');
  const year = document.querySelector('#events-year');
  const more = document.querySelector('.events-show-all');
  const filter = document.querySelector('.events-year-filter');
  const status = document.querySelector('#events-filter-status');
  if (!list || !year || !more || !filter || !status) return;
  const rows = [...list.querySelectorAll('[data-event-year]')];
  let expanded = Boolean(location.hash && rows.some(row => `#${row.id}` === location.hash));
  function render() {
    const matching = rows.filter(row => year.value === 'all' || row.dataset.eventYear === year.value);
    rows.forEach(row => { row.hidden = !matching.includes(row) || (!expanded && year.value === 'all' && matching.indexOf(row) >= 6); });
    more.hidden = expanded || year.value !== 'all' || matching.length <= 6;
    more.setAttribute('aria-expanded', String(expanded));
    status.textContent = `${rows.filter(row => !row.hidden).length} από ${matching.length} εκδηλώσεις${year.value === 'all' ? '' : ` για το ${year.value}`}.`;
  }
  year.addEventListener('change', () => { expanded = false; render(); });
  more.addEventListener('click', () => {
    const firstHidden = rows.find(row => row.hidden);
    expanded = true;
    render();
    // Keep keyboard focus in the archive when the reveal button disappears.
    firstHidden?.querySelector('a')?.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => {
    if (!rows.some(row => `#${row.id}` === location.hash)) return;
    year.value = 'all'; expanded = true; render();
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  });
  filter.hidden = false;
  render();
})();
