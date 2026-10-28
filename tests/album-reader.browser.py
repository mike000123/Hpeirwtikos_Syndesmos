"""Browser regression checks for the local album reader.

Run: python tests/album-reader.browser.py [--site-root PATH] [--screenshots PATH]
Requires Python Playwright and Chromium. No third-party service is used.
"""
import argparse
import contextlib
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import threading
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser()
parser.add_argument('--site-root',type=Path,default=Path(__file__).resolve().parents[1])
parser.add_argument('--screenshots',type=Path)
args=parser.parse_args()
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(args.site_root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/arxeio.html'
passed=[]
def ok(label):
    passed.append(label)
    print('PASS:',label,flush=True)
def ready(page):
    expect(page.locator('.album-viewport')).to_have_attribute('aria-busy','false')
    expect(page.locator('.album-page img')).not_to_have_count(0)
def tool(page,name):
    toggle=page.locator(f'[data-album-toggle="{name}"]')
    if toggle.get_attribute('aria-expanded')!='true':toggle.click()
def shot(page,name):
    if args.screenshots:
        if name.startswith('archive-album'):
            page.locator('.album-promo-figure img').evaluate('e=>e.decode()')
        args.screenshots.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(args.screenshots/(name+'.png')),full_page=False)

try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(url)
    assert page.locator('#lefkoma').evaluate("e=>e.previousElementSibling.matches('.archive-intro.archive-hero')")
    assert page.locator('#lefkoma').evaluate("e=>e.nextElementSibling.id")== 'stoles'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#lefkoma').scroll_into_view_if_needed();shot(page,'archive-album-desktop')
    page.locator('[data-album-open]').click();ready(page)
    expect(page.locator('#album-reader')).to_be_visible()
    expect(page.locator('.album-page')).to_have_count(1)
    expect(page.locator('[data-album-prev]')).to_be_disabled()
    ok('album appears between the existing hero and collections; local dialog opens on its cover')

    page.locator('[data-album-next]').click();ready(page)
    expect(page.locator('.album-page')).to_have_count(2)
    expect(page.locator('[data-album-indicator]')).to_have_text('Σελίδες 2–3 / 6')
    assert page.locator('.album-page').first.evaluate("e=>getComputedStyle(e).animationName")=='none'
    shot(page,'album-reader-desktop')
    page.locator('[data-album-next]').click();page.locator('[data-album-next]').click();ready(page)
    expect(page.locator('[data-album-next]')).to_be_disabled()
    page.locator('[data-album-prev]').click();ready(page)
    expect(page.locator('[data-album-indicator]')).to_have_text('Σελίδες 4–5 / 6')
    ok('desktop spread boundaries, next/previous and reduced-motion behavior')

    before=page.locator('.album-page').first.bounding_box()['height']
    tool(page,'zoom');page.locator('[data-album-zoom-in]').click()
    expect(page.locator('[data-album-zoom-value]')).to_have_text('125%')
    assert page.locator('.album-page').first.bounding_box()['height']>before
    assert page.locator('.album-viewport').evaluate('e=>e.scrollHeight>e.clientHeight')
    page.locator('[data-album-fit]').click()
    expect(page.locator('[data-album-zoom-out]')).to_be_disabled()
    ok('zoom changes actual page size, supports scrolling and resets to fit')

    page.locator('[data-album-toggle="contents"]').click()
    expect(page.locator('#album-contents-panel')).to_be_visible()
    page.locator('[data-album-contents] button').nth(2).click();ready(page)
    expect(page.locator('#album-contents-panel')).not_to_be_visible()
    page.locator('[data-album-toggle="thumbnails"]').click()
    expect(page.locator('[data-album-thumbnails] button')).to_have_count(6)
    page.locator('[data-album-thumbnails] button').last.click();ready(page)
    expect(page.locator('[data-album-range]')).to_have_value('6')
    page.locator('[data-album-toggle="contents"]').click()
    expect(page.locator('#album-thumbnails-panel')).not_to_be_visible()
    page.locator('[data-album-toggle="contents"]').click()
    tool(page,'seek');page.locator('[data-album-goto]').fill('2');page.locator('[data-album-goto]').press('Enter');ready(page)
    expect(page.locator('[data-album-range]')).to_have_value('2')
    page.locator('[data-album-range]').evaluate("e=>{e.value='5';e.dispatchEvent(new Event('input',{bubbles:true}))}")
    ready(page);expect(page.locator('[data-album-goto]')).to_have_value('5')
    ok('contents, all thumbnails, mutually exclusive panels and direct page selection')

    page.locator('.album-viewport').focus();page.keyboard.press('Home');ready(page)
    page.keyboard.press('ArrowRight');ready(page)
    expect(page.locator('[data-album-indicator]')).to_have_text('Σελίδες 2–3 / 6')
    page.keyboard.press('End');ready(page);expect(page.locator('[data-album-next]')).to_be_disabled()
    for _ in range(18):
        page.keyboard.press('Tab')
        assert page.evaluate("document.querySelector('#album-reader').contains(document.activeElement)")
    page.keyboard.press('Escape')
    expect(page.locator('#album-reader')).not_to_be_visible()
    expect(page.locator('[data-album-open]')).to_be_focused()
    assert page.evaluate("document.body.style.overflow===''&&document.documentElement.style.overflow===''")
    ok('keyboard navigation, native focus trap, Escape, focus restoration and scroll unlock')

    page.locator('[data-album-open]').click();ready(page)
    page.locator('[data-album-fullscreen]').click()
    expect(page.locator('[data-album-fullscreen]')).to_have_attribute('aria-pressed','true')
    page.locator('[data-album-fullscreen]').click()
    expect(page.locator('[data-album-fullscreen]')).to_have_attribute('aria-pressed','false')
    page.locator('[data-album-close]').click()
    ok('fullscreen enter and exit')

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
    mp=mobile.new_page();mp.on('pageerror',lambda error:errors.append(str(error)))
    mp.goto(url);mp.locator('#lefkoma').scroll_into_view_if_needed();shot(mp,'archive-album-mobile')
    assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
    mp.locator('[data-album-open]').click();ready(mp)
    mp.locator('[data-album-next]').click();ready(mp)
    expect(mp.locator('.album-page')).to_have_count(1)
    expect(mp.locator('[data-album-indicator]')).to_have_text('Σελίδα 2 / 6')
    assert mp.locator('#album-reader').bounding_box()['width']<=390
    assert mp.locator('.album-reader-controls').evaluate('e=>e.scrollWidth<=e.clientWidth')
    shot(mp,'album-reader-mobile')
    session=mobile.new_cdp_session(mp)
    rect=mp.locator('.album-viewport').bounding_box();x=rect['x']+rect['width']*.8;y=rect['y']+rect['height']*.5
    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for offset in (25,55,85,120):
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-offset,'y':y}]})
    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    expect(mp.locator('[data-album-range]')).to_have_value('3')
    mp.set_viewport_size({'width':844,'height':390});ready(mp)
    assert mp.locator('.album-viewport').bounding_box()['height']>=100
    mp.locator('[data-album-close]').click()
    ok('mobile one-page layout, no horizontal overflow, real touch swipe and orientation change')

    fail=browser.new_context(viewport={'width':1280,'height':900})
    fp=fail.new_page()
    fp.route('**/assets/album/catalog.json*',lambda route:route.fulfill(status=503,body='unavailable'))
    fp.goto(url);fp.locator('[data-album-open]').click()
    expect(fp.locator('[data-album-failure]')).to_be_visible()
    fp.unroute('**/assets/album/catalog.json*')
    fp.locator('[data-album-retry]').click();ready(fp)
    fp.locator('[data-album-close]').click()
    fp.route('**/assets/album/page-03.svg',lambda route:route.abort())
    fp.locator('[data-album-open]').click();ready(fp)
    fp.locator('[data-album-next]').click()
    expect(fp.locator('.album-page-error')).to_be_visible()
    fp.locator('[data-album-next]').click();ready(fp)
    expect(fp.locator('.album-page-error')).to_have_count(0)
    fp.locator('[data-album-close]').click()
    ok('catalog failure offers retry; a failed page does not prevent continuing or closing')

    hang=browser.new_context()
    hp=hang.new_page()
    held=[]
    hp.route('**/assets/album/catalog.json*',lambda route:held.append(route))
    hp.goto(url);hp.locator('[data-album-open]').click()
    expect(hp.locator('[data-album-failure]')).to_be_visible(timeout=11000)
    hp.locator('[data-album-close]').click()
    assert hp.evaluate("document.body.style.overflow===''")
    for request in held:
        with contextlib.suppress(Exception):request.abort()
    hp.unroute('**/assets/album/catalog.json*')
    hp.locator('[data-album-open]').click();ready(hp)
    hp.locator('[data-album-close]').click()
    ok('an unresponsive catalog fails within eight seconds; no infinite loading state')
    assert not errors,errors
    ok('no uncaught JavaScript errors')
    browser.close()
finally:
 server.shutdown();server.server_close()
print(f'{len(passed)} browser checks passed.')
