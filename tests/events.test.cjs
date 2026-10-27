// Behaviour checks with a small DOM adapter; these do not replace browser layout/accessibility checks.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function setup({ supported = true } = {}) {
  let focused = null;
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.listeners = {}; this.attrs = {}; this.style = {}; this.dataset = {}; this.hidden = false; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k]; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(type, fn, options = {}) { (this.listeners[type] ||= []).push({ fn, once: options.once }); }
    emit(type, detail = {}) {
      const event = { target: this, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...detail };
      for (const handler of [...(this.listeners[type] || [])]) {
        handler.fn(event);
        if (handler.once) this.listeners[type] = this.listeners[type].filter(h => h !== handler);
      }
      return event;
    }
    append(...elements) { this.children.push(...elements); }
    replaceChildren(...elements) { this.children = [...elements]; }
    get firstElementChild() { return this.children[0] || null; }
    scrollIntoView() {}
    focus() { focused = this; }
    getBoundingClientRect() { return { left: 10, top: 10, right: 800, bottom: 700 }; }
  }
  const ids = ['event-gallery', 'event-gallery-title', 'event-gallery-date', 'event-gallery-note', 'event-gallery-stage', 'event-gallery-caption', 'event-gallery-counter', 'event-gallery-original', 'event-gallery-source', 'event-gallery-thumbs', 'event-gallery-previous', 'event-gallery-next', 'event-gallery-close'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element()]));
  const dialog = nodes['event-gallery'];
  dialog.open = false;
  if (supported) dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.emit('close'); };
  const body = new Element('body');
  body.style.overflow = 'auto';
  const context = { window: {}, URL };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/events-data.js'), 'utf8'), context);
  const data = context.window.epirusEvents;
  data.events.push({ id: 'invalid', title: 'Invalid media', dateLabel: '', source: 'https://ipirotikos.gr/', media: [{ type: 'photo', src: 'javascript:alert(1)' }] });
  const triggers = Object.fromEntries(data.events.filter(e => e.media.length).map(e => {
    const a = new Element('a'); a.dataset.eventGallery = e.id; a.href = e.source; return [e.id, a];
  }));
  const unknown = new Element('a'); unknown.dataset.eventGallery = 'missing'; triggers.missing = unknown;
  context.document = {
    body,
    querySelector: selector => nodes[selector.slice(1)],
    querySelectorAll: () => Object.values(triggers),
    createElement: tag => new Element(tag),
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/events.js'), 'utf8'), context);
  return { nodes, triggers, body, dialog, focused: () => focused, catalogue: data };
}

test('2019 opens its own five photos and two videos; 2018 is kept separate', () => {
  const s = setup();
  assert.equal(s.triggers['event-2019-04-07'].emit('click').defaultPrevented, true);
  assert.equal(s.dialog.open, true);
  assert.equal(s.nodes['event-gallery-date'].textContent, '07.04.2019');
  assert.equal(s.nodes['event-gallery-thumbs'].children.length, 7);
  assert.equal(s.nodes['event-gallery-stage'].firstElementChild.tagName, 'IMG');
  assert.equal(s.nodes['event-gallery-counter'].textContent, '1 / 7 · Φωτογραφία');
  assert.equal(s.catalogue.events.find(e => e.id === 'event-2018-11-18').media.length, 0);
  assert.equal(s.focused(), s.nodes['event-gallery-close']);
});

test('videos load on selection, use the right ID and are removed when the dialog closes', () => {
  const s = setup();
  const trigger = s.triggers['event-2019-04-07'];
  trigger.emit('click');
  assert.equal(s.body.style.overflow, 'hidden');
  s.nodes['event-gallery-thumbs'].children[5].emit('click');
  const player = s.nodes['event-gallery-stage'].firstElementChild;
  assert.equal(player.tagName, 'IFRAME');
  assert.match(player.src, /youtube-nocookie\.com\/embed\/zF_4beG09_U\?rel=0$/);
  assert.equal(s.nodes['event-gallery-original'].href, 'https://www.youtube.com/watch?v=zF_4beG09_U');
  assert.ok(!player.src.includes('autoplay=1'));
  s.nodes['event-gallery-close'].emit('click');
  assert.equal(s.nodes['event-gallery-stage'].children.length, 0);
  assert.equal(s.nodes['event-gallery-thumbs'].children.length, 0);
  assert.equal(s.body.style.overflow, 'auto');
  assert.equal(s.focused(), trigger);
});

test('arrow controls wrap, thumbnails stay selected, and a second event starts fresh', () => {
  const s = setup();
  s.triggers['event-2019-04-07'].emit('click');
  s.nodes['event-gallery-previous'].emit('click');
  assert.match(s.nodes['event-gallery-stage'].firstElementChild.src, /46Io-9-PttQ/);
  assert.equal(s.nodes['event-gallery-thumbs'].children[6].getAttribute('aria-pressed'), 'true');
  assert.equal(s.dialog.emit('keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  assert.equal(s.nodes['event-gallery-counter'].textContent, '1 / 7 · Φωτογραφία');
  s.dialog.close();
  s.triggers['event-2010-02-21'].emit('click');
  assert.equal(s.nodes['event-gallery-date'].textContent, '21.02.2010');
  assert.equal(s.nodes['event-gallery-thumbs'].children.length, 4);
  assert.equal(s.nodes['event-gallery-stage'].firstElementChild.tagName, 'IMG');
});

test('broken images show a source fallback; late errors cannot replace the next item', () => {
  const s = setup();
  s.triggers['event-2019-04-07'].emit('click');
  const previousImage = s.nodes['event-gallery-stage'].firstElementChild;
  s.nodes['event-gallery-next'].emit('click');
  const currentImage = s.nodes['event-gallery-stage'].firstElementChild;
  previousImage.emit('error');
  assert.equal(s.nodes['event-gallery-stage'].firstElementChild, currentImage);
  currentImage.emit('error');
  assert.equal(s.nodes['event-gallery-stage'].firstElementChild.getAttribute('role'), 'status');
  assert.match(s.nodes['event-gallery-original'].href, /^https:\/\/ipirotikos\.gr\/wp-content\/uploads\//);
});

test('only outside backdrop clicks dismiss the dialog', () => {
  const s = setup();
  s.triggers['event-2019-04-07'].emit('click');
  s.dialog.emit('click', { clientX: 200, clientY: 200 });
  assert.equal(s.dialog.open, true);
  s.dialog.emit('click', { clientX: 1, clientY: 1 });
  assert.equal(s.dialog.open, false);
});

test('modified clicks, unsupported dialogs, unknown IDs and invalid media preserve source navigation', () => {
  const s = setup();
  assert.equal(s.triggers['event-2019-04-07'].emit('click', { ctrlKey: true }).defaultPrevented, false);
  assert.equal(s.triggers.missing.emit('click').defaultPrevented, false);
  assert.equal(s.triggers.invalid.emit('click').defaultPrevented, false);
  assert.equal(s.dialog.open, false);
  const unsupported = setup({ supported: false });
  assert.equal(unsupported.triggers['event-2019-04-07'].emit('click').defaultPrevented, false);
  assert.equal(unsupported.body.style.overflow, 'auto');
});
