// Reader behaviour tests: local page images, finite loading, and focus restoration.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function setup({ supported = true } = {}) {
  let focused;
  class Element {
    constructor(tag='div') { this.tagName=tag.toUpperCase(); this.children=[]; this.listeners={}; this.style={}; this.dataset={}; this.hidden=false; }
    addEventListener(type,fn,opts={}) { (this.listeners[type] ||= []).push({fn,once:opts.once}); }
    emit(type,detail={}) {
      const e={target:this,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...detail};
      for(const l of [...(this.listeners[type]||[])]) { l.fn(e); if(l.once)this.listeners[type]=this.listeners[type].filter(x=>x!==l); }
      return e;
    }
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=[...nodes];}
    get firstElementChild(){return this.children[0]||null;}
    focus(){focused=this;}
    closest(){return this.dataset.eventPress?this:null;}
    getBoundingClientRect(){return{left:10,top:10,right:800,bottom:700};}
  }
  const ids=['event-press-dialog','event-press-title','event-press-date','event-press-kind','event-press-content','event-press-status','event-press-file','event-press-close','event-gallery'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
  const body=new Element('body'); body.style.overflow='auto';
  const readerBody=new Element(); readerBody.scrollTop=120;
  const dialog=nodes['event-press-dialog']; dialog.open=false;
  if(supported)dialog.showModal=()=>{dialog.open=true;};
  dialog.close=()=>{dialog.open=false;dialog.emit('close');};
  const gallery=nodes['event-gallery'];gallery.open=false;
  gallery.close=()=>{gallery.open=false;body.style.overflow='auto';gallery.closed=true;};
  const document=new Element(); document.body=body;
  const galleryCard=new Element('a');
  document.querySelector=selector=>selector==='.event-press-body'?readerBody:selector.startsWith('[data-event-gallery=')?galleryCard:nodes[selector.slice(1)];
  document.createElement=tag=>new Element(tag);
  const timers = new Map(); let timerId=0;
  const context={window:{},document,URL,setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/events-data.js'),'utf8'),context);
  const data=context.window.epirusEvents;
  data.events.push({id:'invalid',title:'Bad document',dateLabel:'',press:{src:'https://example.org/not-a-report.html',format:'pdf'}});
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/events-press.js'),'utf8'),context);
  function click(id,extra={}) { const trigger=new Element('a');trigger.dataset.eventPress=id;return{trigger,event:document.emit('click',{target:trigger,...extra})}; }
  return{nodes,body,dialog,readerBody,gallery,galleryCard,click,focused:()=>focused,timers};
}

test('a press-only event renders local page images without a PDF iframe',()=>{
  const s=setup();const {event}=s.click('event-2019-12-08');
  assert.equal(event.defaultPrevented,true);
  assert.equal(s.dialog.open,true);
  assert.equal(s.nodes['event-press-date'].textContent,'08.12.2019');
  const frame=s.nodes['event-press-content'].firstElementChild;
  assert.equal(frame.tagName,'IMG');
  assert.equal(s.nodes['event-press-content'].children.length,2);
  assert.match(s.nodes['event-press-file'].href,/^assets\/event-press\/event-2019-12-08\.pdf$/);
  assert.equal(frame.src,'assets/event-press/event-2019-12-08-page-1.jpg');
  assert.ok(!frame.src.includes('/deltia-typoy/'));
  assert.ok(frame.alt.includes('Παραδοσιακό γλέντι'));
  assert.equal(s.readerBody.scrollTop,0);
  assert.equal(s.focused(),s.nodes['event-press-close']);
  frame.emit('load');assert.equal(s.nodes['event-press-status'].hidden,true);
});

test('image announcements retain the source image and correct date',()=>{
  const s=setup();s.click('event-2025-01-25');
  const img=s.nodes['event-press-content'].firstElementChild;
  assert.equal(img.tagName,'IMG');
  assert.equal(s.nodes['event-press-kind'].textContent,'Ανακοίνωση');
  assert.equal(s.nodes['event-press-date'].textContent,'25.01.2025');
  assert.ok(img.alt.includes('Κοπή πίτας'));
  assert.equal(img.src,'assets/event-press/event-2025-01-25.jpg');
  assert.equal(s.nodes['event-press-file'].href,img.src);
});

test('closing releases the document pages and restores scroll and trigger focus',()=>{
  const s=setup();const {trigger}=s.click('event-2019-11-09');
  assert.equal(s.body.style.overflow,'hidden');
  s.nodes['event-press-close'].emit('click');
  assert.equal(s.nodes['event-press-content'].children.length,0);
  assert.equal(s.body.style.overflow,'auto');
  assert.equal(s.focused(),trigger);
});

test('opening from the media gallery closes it and restores focus to its visible card',()=>{
  const s=setup();s.gallery.open=true;s.body.style.overflow='hidden';
  s.click('event-2010-02-21');
  assert.equal(s.gallery.closed,true);
  assert.equal(s.dialog.open,true);
  s.dialog.close();
  assert.equal(s.body.style.overflow,'auto');
  assert.equal(s.focused(),s.galleryCard);
});

test('load errors preserve a usable original-file link and stale errors do not reset a later document',()=>{
  const s=setup();s.click('event-2025-01-25');
  const first=s.nodes['event-press-content'].firstElementChild;
  first.emit('error');
  assert.equal(s.nodes['event-press-content'].children.length,1);
  assert.equal(s.nodes['event-press-status'].hidden,false);
  assert.match(s.nodes['event-press-file'].href,/^assets\/event-press\//);
  s.dialog.close();s.click('event-2019-12-08');
  const second=s.nodes['event-press-content'].firstElementChild;
  first.emit('load');
  assert.equal(s.nodes['event-press-content'].firstElementChild,second);
});

test('outside clicks dismiss, while modified clicks, bad URLs and unsupported dialogs retain file navigation',()=>{
  const s=setup();assert.equal(s.click('event-2019-12-08',{ctrlKey:true}).event.defaultPrevented,false);
  assert.equal(s.click('invalid').event.defaultPrevented,false);
  assert.equal(s.click('missing').event.defaultPrevented,false);
  s.click('event-2019-12-08');
  s.dialog.emit('click',{clientX:100,clientY:100});assert.equal(s.dialog.open,true);
  s.dialog.emit('click',{clientX:1,clientY:1});assert.equal(s.dialog.open,false);
  assert.equal(setup({supported:false}).click('event-2019-12-08').event.defaultPrevented,false);
});

test('slow loading shows a finite fallback and close cancels pending timers',()=>{
  const s=setup();s.click('event-2019-12-08');
  for(const fn of s.timers.values()) fn();
  assert.match(s.nodes['event-press-status'].textContent,/καθυστερεί/);
  s.dialog.close(); assert.equal(s.timers.size,0);
});
test('all press documents and page previews use local files',()=>{
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/events-data.js'),'utf8'),context);
  const events=context.window.epirusEvents.events.filter(e=>e.press);
  assert.equal(events.length,15);
  for(const e of events){
    assert.match(e.press.src,/^assets\/event-press\//);
    assert.ok(e.press.pages.length);
    for(const page of e.press.pages) assert.match(page,/^assets\/event-press\/.*\.jpg$/);
  }
});
