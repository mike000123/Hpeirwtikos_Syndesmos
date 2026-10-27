import pathlib,urllib.request,urllib.parse,re,json,io
from PIL import Image,ImageOps,ImageDraw
page='https://katogiaveroff.gr/media-library'
ua={'User-Agent':'EpirusAssociationWebsite/1.0 (editorial illustration)'}
with urllib.request.urlopen(urllib.request.Request(page,headers=ua),timeout=40) as r:html=r.read().decode()
root=pathlib.Path('assets/epirus-features/vineyard');root.mkdir(exist_ok=True)
items=[];sheet=Image.new('RGB',(900,900),'white')
for i,name in enumerate(['yiniets-vineyard.jpg','yiniets-late-spring.jpg','vineyards-in-autumn.jpg']):
    matches=re.findall(r'[^\s\x22\x27<>]*'+re.escape(name),html)
    matches=[m for m in matches if '/' in m]
    assert matches,(name,'No media-library file URL')
    url=urllib.parse.urljoin(page,matches[0].replace('&amp;','&'))
    with urllib.request.urlopen(urllib.request.Request(url,headers=ua),timeout=60) as r:payload=r.read()
    im=ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert('RGB');im.thumbnail((1440,1440))
    target=root/(name[:-4]+'.webp');im.save(target,quality=88,method=6)
    items.append({'file':str(target),'source':page,'original':url,'credit':'Κατώγι Αβέρωφ','rights':'Official downloadable media-library asset; copyright retained by owner. No Creative Commons licence asserted.','width':im.width,'height':im.height,'changes':'Size and format conversion only; no crop or retouching.'})
    thumb=im.copy();thumb.thumbnail((890,265));sheet.paste(thumb,(0,i*300+25));ImageDraw.Draw(sheet).text((5,i*300+5),name,fill='black')
(root/'credits.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
sheet.save(root/'review.jpg',quality=78)
