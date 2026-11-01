const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const core = require('../assets/events-calendar-core.js');
const root = path.join(__dirname, '..');
const base = 'https://mike000123.github.io/Hpeirwtikos_Syndesmos/ekdiloseis.html?v=example';
const event = {id:'meeting-1',title:'Συνάντηση του Συνδέσμου',date:'2027-01-25',location:'Φίλωνος 11Α, Πειραιάς',description:'Σας περιμένουμε.'};

test('all-day and multi-day exports use exclusive end dates, without inventing a time', () => {
  assert.deepEqual(core.normalize(event),{start:'20270125',end:'20270126',allDay:true,firstDay:event.date,lastDay:event.date});
  const e={...event,endDate:'2027-01-27'};
  assert.equal(core.normalize(e).end,'20270128');
  assert.match(core.ics(e,base),/DTSTART;VALUE=DATE:20270125\r\nDTEND;VALUE=DATE:20270128/);
  const url=new URL(core.googleURL(e,base));
  assert.equal(url.origin,'https://calendar.google.com');
  assert.equal(url.searchParams.get('dates'),'20270125/20270128');
  assert.equal(url.searchParams.get('location'),event.location);
  assert.equal(url.searchParams.get('ctz'),'Europe/Athens');
  assert.match(url.searchParams.get('details'),/#meeting=meeting-1$/);
});
test('Greek winter and summer time convert correctly, independent of visitor timezone', () => {
  assert.equal(core.normalize({...event,time:'19:30',endTime:'21:00'}).start,'20270125T173000Z');
  assert.equal(core.normalize({...event,date:'2027-07-25',time:'19:30'}).start,'20270725T163000Z');
  assert.equal(core.normalize({...event,date:'2027-10-31',time:'03:30'}).start,'20271031T003000Z');
  assert.throws(()=>core.normalize({...event,date:'2027-03-28',time:'03:30'}),/δεν υπάρχει/);
});
test('unknown finish does not invent duration; overnight finish needs an explicit date', () => {
  const e={...event,time:'19:30'};
  assert.doesNotMatch(core.ics(e,base),/DTEND/);
  const url=new URL(core.googleURL(e,base));
  assert.equal(url.searchParams.get('dates'),'20270125T173000Z/20270125T173000Z');
  assert.throws(()=>core.normalize({...e,endTime:'01:00'}),/μεσάνυχτα/);
  assert.equal(core.normalize({...e,endDate:'2027-01-26',endTime:'00:00'}).lastDay,'2027-01-25');
  assert.equal(core.normalize({...e,endDate:'2027-01-26',endTime:'01:00'}).lastDay,'2027-01-26');
});
test('legacy month-only records stay out; invalid dates and time ranges are rejected', () => {
  assert.equal(core.normalize({...event,date:'2011-10'}),null);
  assert.equal(core.normalize({...event,date:'2027-02-30'}),null);
  for (const fields of [{endDate:'2027-01-24'},{endTime:'20:00'},{time:'25:00'},{time:'19:00',endDate:'2027-01-26'}]) {
    assert.throws(()=>core.normalize({...event,...fields}));
  }
});
test('ICS escapes untrusted text and folds Greek UTF-8 lines at 75 octets', () => {
  const e={...event,title:'Τίτλος, με; σημεία\\ και\nνέα γραμμή '.repeat(8),description:'Πληροφορίες\r\nBEGIN:VEVENT'};
  const text=core.ics(e,base,new Date('2026-11-01T12:00:00Z'));
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line,'utf8')<=75,line);
  const unfolded=text.replace(/\r\n /g,'');
  assert.match(unfolded,/SUMMARY:Τίτλος\\, με\\; σημεία\\\\ και\\n/);
  assert.equal((text.match(/^BEGIN:VEVENT/gm)||[]).length,1);
  assert.match(text,/DTSTAMP:20261101T120000Z/);
  assert.ok(text.endsWith('END:VCALENDAR\r\n'));
});
test('CMS preview shows today/ongoing meetings, details, and invalid-date feedback', () => {
  const context={window:{EpirusCalendarCore:core,addEventListener(){}},location:{href:base.replace('ekdiloseis.html','admin/')} ,URL,console};
  vm.runInNewContext(fs.readFileSync(path.join(root,'admin/preview.js'),'utf8'),context);
  const page=fs.readFileSync(path.join(root,'ekdiloseis.html'),'utf8'),data=fs.readFileSync(path.join(root,'assets/events-data.js'),'utf8');
  const fn=context.window.__epirusPreview.eventsHtml;
  const preview=fn(page,data,{...event,time:'19:30',endTime:'21:00'},event.id,'2027-01-25');
  const upcoming=preview.split('<!--cms:upcoming-->')[1].split('<!--/cms:upcoming-->')[0];
  assert.match(upcoming,/19:30–21:00/);assert.match(upcoming,/data-calendar-event="meeting-1"/);assert.match(upcoming,/Φίλωνος/);
  const ongoing=fn(page,data,{...event,endDate:'2027-01-27'},event.id,'2027-01-26');
  assert.match(ongoing.split('<!--cms:upcoming-->')[1].split('<!--/cms:upcoming-->')[0],/Συνάντηση του Συνδέσμου/);
  assert.match(fn(page,data,{...event,time:'19:30',endTime:'01:00'},event.id,'2027-01-25'),/role="alert"/);
});
