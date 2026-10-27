import json,pathlib,urllib.request,urllib.parse,hashlib,io,time
from PIL import Image,ImageOps,ImageDraw
names=json.loads('''[["plakidas","Plakidas Kalogeriko stone bridge Kipi Zagori.jpg","Aneza Palaiou","CC BY-SA 4.0","https://creativecommons.org/licenses/by-sa/4.0/"],["plaka","Plaka-bridge-from-above.jpg","Mboesch","CC BY-SA 4.0","https://creativecommons.org/licenses/by-sa/4.0/"],["kazani","Καζάνι τσίπουρου.jpg","Nikoskpa","CC BY-SA 4.0","https://creativecommons.org/licenses/by-sa/4.0/"],["festival","Pol festival 2007.JPG","Εξάδελφος του χρήστη Alexikoua","Public Domain","https://creativecommons.org/publicdomain/mark/1.0/"]]''')
root=pathlib.Path('assets/epirus-features');root.mkdir(exist_ok=True)
audit=[];contact=Image.new('RGB',(800,640),'white')
for i,(key,name,author,license,licenseURL) in enumerate(names):
    name=name.replace(' ','_');digest=hashlib.md5(name.encode()).hexdigest()
    url='https://upload.wikimedia.org/wikipedia/commons/'+digest[0]+'/'+digest[:2]+'/'+urllib.parse.quote(name)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'EpirusAssociationWebsite/1.0 (https://github.com/mike000123/Hpeirwtikos_Syndesmos)'}),timeout=60) as r:payload=r.read()
            break
        except Exception:
            if attempt==2:raise
            time.sleep(3)
    im=ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert('RGB');im.thumbnail((1440,1440))
    target=root/(key+'.webp');im.save(target,quality=88,method=6)
    audit.append({'file':str(target),'source':'https://commons.wikimedia.org/wiki/File:'+urllib.parse.quote(name),'original':url,'author':author,'license':license,'licenseURL':licenseURL,'width':im.width,'height':im.height,'changes':'Resized and converted to WebP; no cropping or retouching.'})
    thumb=im.copy();thumb.thumbnail((390,280));x,y=(i%2)*400,(i//2)*320;contact.paste(thumb,(x,y+25));ImageDraw.Draw(contact).text((x+8,y+6),key,fill='black')
(root/'image-credits.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
contact.save(root/'review.jpg',quality=80)
