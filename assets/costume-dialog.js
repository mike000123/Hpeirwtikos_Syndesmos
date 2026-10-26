(() => {
 let opener;
 document.querySelectorAll('[data-costume-open]').forEach(button => {
  const dialog = document.getElementById(button.dataset.costumeOpen);
  if (!dialog) return;
  button.addEventListener('click', () => { opener = button; dialog.showModal(); document.body.classList.add('costume-dialog-open'); dialog.querySelector('.costume-dialog-scroll').scrollTop = 0; });
  dialog.querySelector('.costume-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('costume-dialog-open'); opener?.focus(); });
 });
})();
