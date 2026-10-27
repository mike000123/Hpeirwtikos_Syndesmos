import json,pathlib,urllib.request,io,time
from PIL import Image,ImageOps,ImageDraw
photos=json.loads('''[{"type":"photo","src":"https://ipirotikos.gr/wp-content/uploads/photo-gallery/main_photos01/7-4-2019_%CE%97%CE%A0%CE%95%CE%99%CE%A1%CE%9F_%CE%A4%CE%97%CE%A3_%CE%91%CE%93%CE%91%CE%A0%CE%97%CE%A3_2885_%281%29.jpg?bwg=1604513930","caption":"Ήπειρος της αγάπης — φωτογραφία 2885","originalFile":"7-4-2019_ΗΠΕΙΡΟ_ΤΗΣ_ΑΓΑΠΗΣ_2885_(1).jpg","sourcePage":"https://ipirotikos.gr/polymesa/fotografies/","retrieval":"opened"},{"type":"photo","src":"https://ipirotikos.gr/wp-content/uploads/photo-gallery/main_photos01/7-4-2019_%CE%97%CE%A0%CE%95%CE%99%CE%A1%CE%9F_%CE%A4%CE%97%CE%A3_%CE%91%CE%93%CE%91%CE%A0%CE%97%CE%A3_2862_%281%29.jpg?bwg=1604513930","caption":"Ήπειρος της αγάπης — φωτογραφία 2862","originalFile":"7-4-2019_ΗΠΕΙΡΟ_ΤΗΣ_ΑΓΑΠΗΣ_2862_(1).jpg","sourcePage":"https://ipirotikos.gr/polymesa/fotografies/","retrieval":"opened"},{"type":"photo","src":"https://ipirotikos.gr/wp-content/uploads/photo-gallery/main_photos01/7-4-2019_%CE%97%CE%A0%CE%95%CE%99%CE%A1%CE%9F_%CE%A4%CE%97%CE%A3_%CE%91%CE%93%CE%91%CE%A0%CE%97%CE%A3_2887_%281%29.jpg?bwg=1604513930","caption":"Ήπειρος της αγάπης — φωτογραφία 2887","originalFile":"7-4-2019_ΗΠΕΙΡΟ_ΤΗΣ_ΑΓΑΠΗΣ_2887_(1).jpg","sourcePage":"https://ipirotikos.gr/polymesa/fotografies/","retrieval":"opened"},{"type":"photo","src":"https://ipirotikos.gr/wp-content/uploads/photo-gallery/main_photos01/7-4-2019_%CE%97%CE%A0%CE%95%CE%99%CE%A1%CE%9F_%CE%A4%CE%97%CE%A3_%CE%91%CE%93%CE%91%CE%A0%CE%97%CE%A3_2854_%281%29.jpg?bwg=1604513930","caption":"Ήπειρος της αγάπης — φωτογραφία 2854","originalFile":"7-4-2019_ΗΠΕΙΡΟ_ΤΗΣ_ΑΓΑΠΗΣ_2854_(1).jpg","sourcePage":"https://ipirotikos.gr/polymesa/fotografies/","retrieval":"opened"},{"type":"photo","src":"https://ipirotikos.gr/wp-content/uploads/photo-gallery/main_photos01/7-4-2019_%CE%97%CE%A0%CE%95%CE%99%CE%A1%CE%9F_%CE%A4%CE%97%CE%A3_%CE%91%CE%93%CE%91%CE%A0%CE%97%CE%A3_2860_%281%29.jpg?bwg=1604513930","caption":"Ήπειρος της αγάπης — φωτογραφία 2860","originalFile":"7-4-2019_ΗΠΕΙΡΟ_ΤΗΣ_ΑΓΑΠΗΣ_2860_(1).jpg","sourcePage":"https://ipirotikos.gr/polymesa/fotografies/","retrieval":"opened"}]''')
root=pathlib.Path('assets/music-cover');root.mkdir(exist_ok=True)
sheet=Image.new('RGB',(900,960),'white');audit=[]
for i,item in enumerate(photos):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(item['src'],headers={'User-Agent':'EpirusAssociationWebsite/1.0'}),timeout=45) as r:payload=r.read()
            break
        except Exception:
            if attempt==2:raise
            time.sleep(2)
    im=ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert('RGB');im.thumbnail((1600,1600))
    target=root/('association-2019-'+str(i+1)+'.webp');im.save(target,quality=90,method=6)
    audit.append({'file':str(target),'width':im.width,'height':im.height,'original':item['src'],'originalFilename':item['originalFile'],'sourcePage':item['sourcePage'],'event':'Ήπειρος της αγάπης','eventDate':'2019-04-07','credit':'Φωτογραφικό αρχείο Ηπειρωτικού Συνδέσμου Πειραιώς','changes':'Resize and format conversion only; no cropping, generative edits or retouching.'})
    thumb=ImageOps.fit(im,(440,265));x,y=(i%2)*450,(i//2)*320;sheet.paste(thumb,(x,y+25));ImageDraw.Draw(sheet).text((x+8,y+6),str(i+1),fill='black')
(root/'candidates.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
sheet.save(root/'review.jpg',quality=85)
