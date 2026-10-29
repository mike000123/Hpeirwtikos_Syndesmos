"""Verify curved interior paper, rigid covers, printed sides and interruption."""
import argparse,shutil,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

parser=argparse.ArgumentParser()
parser.add_argument('--site-root',type=Path,default=Path(__file__).resolve().parents[1])
parser.add_argument('--screenshots',type=Path)
args=parser.parse_args()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(args.site_root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/arxeio.html'
def ready(page):
 expect(page.locator('.album-turn-leaf')).to_have_count(0,timeout=4000)
 expect(page.locator('.album-viewport')).to_have_attribute('aria-busy','false')
 expect(page.locator('.album-page')).not_to_have_count(0)
def opened(page):
 page.goto(url);page.locator('[data-album-open]').click();ready(page)
def freeze(page,fraction):
 page.locator('.album-book').evaluate('''(book,fraction)=>{
  book.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=a.effect.getTiming().duration*fraction});
 }''',fraction)
def finish(page):
 page.locator('.album-book').evaluate('e=>e.getAnimations({subtree:true}).forEach(a=>a.finish())');ready(page)
def shot(page,name):
 if args.screenshots:
  args.screenshots.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(args.screenshots/(name+'.png')))
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
  page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));opened(page)
  page.locator('[data-album-next]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  assert page.locator('.album-turn-front img').first.get_attribute('src').endswith('page-01.svg')
  assert page.locator('.album-turn-back img').first.get_attribute('src').endswith('page-02.svg')
  expect(page.locator('.album-turn-leaf')).to_have_attribute('data-paper','hard')
  expect(page.locator('.album-turn-strip')).to_have_count(0)
  finish(page);expect(page.locator('[data-album-indicator]')).to_have_text('Σελίδες 2–3 / 6')
  print('PASS: cover physically opens to the first spread',flush=True)

  page.locator('[data-album-next]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  assert page.locator('.album-turn-front img').first.get_attribute('src').endswith('page-03.svg')
  assert page.locator('.album-turn-back img').first.get_attribute('src').endswith('page-04.svg')
  assert page.locator('.album-turn-slot').first.locator('img').get_attribute('src').endswith('page-02.svg')
  assert page.locator('.album-turn-slot').last.locator('img').get_attribute('src').endswith('page-05.svg')
  frames=page.locator('.album-turn-leaf').evaluate('e=>e.getAnimations()[0].effect.getKeyframes().map(k=>k.transform)')
  assert frames==['rotateY(0deg)','rotateY(-180deg)'],frames
  expect(page.locator('.album-turn-leaf')).to_have_attribute('data-paper','flexible')
  expect(page.locator('.album-turn-strip')).to_have_count(48)
  freeze(page,.30)
  matrices=page.locator('.album-turn-strip').evaluate_all('nodes=>nodes.map(n=>getComputedStyle(n).transform)')
  assert len(set(matrices))==48
  # Different strip normals and nonzero depths prove actual bending, rather than a rigid sheet.
  values=page.locator('.album-turn-strip').evaluate_all('nodes=>nodes.map(n=>{const m=new DOMMatrix(getComputedStyle(n).transform);return {normal:m.m13,depth:m.m43}})')
  assert max(v['normal'] for v in values)-min(v['normal'] for v in values)>.5,values
  assert max(abs(v['depth']) for v in values)>30,values
  # Crops meet in physical order; the reverse is mirrored as a printed sheet would be.
  crops=page.locator('.album-turn-front .album-strip-paper').evaluate_all('nodes=>nodes.map(n=>parseFloat(n.style.left))')
  reverse=page.locator('.album-turn-back .album-strip-paper').evaluate_all('nodes=>nodes.map(n=>parseFloat(n.style.left))')
  assert crops[0]==0 and crops[-1]<-400 and reverse[0]<-400 and reverse[-1]==0
  assert page.locator('.album-turn-leaf').evaluate('e=>getComputedStyle(e).transform').startswith('matrix3d(')
  assert page.locator('.album-turn-front').first.evaluate('e=>getComputedStyle(e).backfaceVisibility')=='hidden'
  shot(page,'desktop-turn-front');freeze(page,.72);shot(page,'desktop-turn-back');finish(page)
  expect(page.locator('[data-album-indicator]')).to_have_text('Σελίδες 4–5 / 6')
  print('PASS: interior paper visibly curves with continuous front/reverse crops and stationary pages beneath',flush=True)

  page.locator('[data-album-prev]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  assert page.locator('.album-turn-front img').first.get_attribute('src').endswith('page-04.svg')
  assert page.locator('.album-turn-back img').first.get_attribute('src').endswith('page-03.svg')
  assert page.locator('.album-turn-leaf').evaluate('e=>e.getAnimations()[0].effect.getKeyframes().at(-1).transform')=='rotateY(180deg)'
  expect(page.locator('.album-turn-leaf')).to_have_attribute('data-paper','flexible')
  freeze(page,.4);shot(page,'desktop-backward-curl');finish(page)
  page.locator('[data-album-prev]').click();expect(page.locator('.album-turn-leaf')).to_be_visible();finish(page)
  expect(page.locator('.album-page')).to_have_count(1);expect(page.locator('[data-album-range]')).to_have_value('1')
  print('PASS: backward turning shows the reverse and closes the cover',flush=True)

  page.locator('[data-album-next]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  page.locator('[data-album-next]').click();ready(page)
  expect(page.locator('[data-album-indicator]')).to_have_text('Σελίδες 4–5 / 6')
  page.locator('[data-album-next]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  expect(page.locator('.album-turn-leaf')).to_have_attribute('data-paper','flexible');finish(page)
  expect(page.locator('[data-album-next]')).to_be_disabled()
  page.locator('[data-album-prev]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  page.locator('[data-album-close]').click();expect(page.locator('.album-turn-leaf')).to_have_count(0)
  page.locator('[data-album-open]').click();ready(page)
  assert page.locator('.album-book').evaluate('e=>e.getAnimations({subtree:true}).length')==0
  print('PASS: rapid turns, back cover and close during a turn leave no stale animation',flush=True)

  page.locator('[data-album-prev]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  page.locator('[data-album-toggle="zoom"]').click()
  page.locator('[data-album-zoom-in]').click();expect(page.locator('.album-turn-leaf')).to_have_count(0)
  expect(page.locator('[data-album-zoom-value]')).to_have_text('125%');page.locator('[data-album-fit]').click()
  page.locator('[data-album-next]').click();expect(page.locator('.album-turn-leaf')).to_be_visible()
  page.set_viewport_size({'width':1000,'height':760});ready(page)
  print('PASS: zoom and resize safely settle an active turn',flush=True)

  mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='no-preference')
  mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)));opened(mp)
  touch=mobile.new_cdp_session(mp)
  rect=mp.locator('.album-viewport').bounding_box();x=rect['x']+rect['width']*.8;y=rect['y']+rect['height']*.5
  touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for offset in (25,55,85,120):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-offset,'y':y}]})
  touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  expect(mp.locator('.album-turn-leaf')).to_be_visible()
  freeze(mp,.35);shot(mp,'mobile-turn');finish(mp);expect(mp.locator('.album-page')).to_have_count(1)
  mp.locator('[data-album-next]').click();expect(mp.locator('.album-turn-leaf')).to_be_visible()
  expect(mp.locator('.album-turn-leaf')).to_have_attribute('data-paper','flexible')
  expect(mp.locator('.album-turn-strip')).to_have_count(32)
  freeze(mp,.4);shot(mp,'mobile-paper-curl');finish(mp)
  mp.locator('[data-album-prev]').click();expect(mp.locator('.album-turn-leaf')).to_be_visible()
  expect(mp.locator('.album-turn-leaf')).to_have_attribute('data-paper','flexible');finish(mp)
  mp.locator('[data-album-prev]').click();expect(mp.locator('.album-turn-leaf')).to_be_visible();finish(mp)
  expect(mp.locator('[data-album-range]')).to_have_value('1')
  mp.locator('[data-album-next]').click();expect(mp.locator('.album-turn-leaf')).to_be_visible()
  mp.emulate_media(reduced_motion='reduce');ready(mp)
  print('PASS: real mobile touch turns, backward turns and reduced-motion changes during a turn',flush=True)
  assert not errors,errors
  print('All page-turn checks passed.',flush=True)
  browser.close()
finally:
 server.shutdown();server.server_close()
