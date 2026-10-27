import pathlib,urllib.request,urllib.parse,hashlib,io,json,time
from PIL import Image,ImageOps,ImageDraw
photos=json.loads('''[["ioannina","Τα Γιάννενα από το Μιτσικέλι-cropped.jpg","Ale30307 · περικοπή: SilentResident","4.0"],["arta","Bridge of arta.jpg","vlachos yorgos","4.0"],["preveza","Port of Preveza 2013.jpg","Γιάννης Χουβαρδάς / john houv","2.0"],["thesprotia","Igoumenitsa city.jpg","Evmeos","3.0"]]''')
root=pathlib.Path('assets/region-cards');root.mkdir(exist_ok=True)
audit=[];sheet=Image.new('RGB',(900,660),'white')
for i,(key,name,author,version) in enumerate(photos):
    name=name.replace(' ','_');digest=hashlib.md5(name.encode()).hexdigest()
    url='https://upload.wikimedia.org/wikipedia/commons/'+digest[0]+'/'+digest[:2]+'/'+urllib.parse.quote(name)
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'EpirusAssociationWebsite/1.0 (https://github.com/mike000123/Hpeirwtikos_Syndesmos)'})
            with urllib.request.urlopen(req,timeout=60) as r:payload=r.read()
            break
        except Exception:
            if attempt==2:raise
            time.sleep(3)
    im=ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert('RGB');im.thumbnail((1440,1440))
    path=root/(key+'.webp');im.save(path,quality=88,method=6)
    audit.append({'key':key,'file':str(path),'source':'https://commons.wikimedia.org/wiki/File:'+urllib.parse.quote(name),'original':url,'author':author,'licence':'CC BY-SA '+version,'licenceURL':'https://creativecommons.org/licenses/by-sa/'+version+'/','width':im.width,'height':im.height,'changes':'Size/format conversion. Responsive display crops image to card aspect ratio.'})
    thumb=ImageOps.fit(im,(440,270));x,y=(i%2)*450,(i//2)*330;sheet.paste(thumb,(x,y+28));ImageDraw.Draw(sheet).text((x+8,y+7),key,fill='black')
(root/'credits.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
sheet.save(root/'review.jpg',quality=82)
