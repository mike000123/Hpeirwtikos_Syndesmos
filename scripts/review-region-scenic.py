"""Build contact sheets from Commons category previews for editorial selection."""
import io,json,time,urllib.parse,urllib.request
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
out=Path("assets/region-scenic")
headers={"User-Agent":"EpirusAssociationWebsite/1.0 (https://github.com/mike000123/Hpeirwtikos_Syndesmos)"}
def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=45) as r: return r.read()
        except Exception:
            if attempt==2: raise
            time.sleep(3)
groups=[("mosque","Aslan Pasha Mosque"),("preveza","Port of Preveza"),("syvota","Syvota islands")]
for group,category in groups:
    params=dict(action="query",format="json",generator="categorymembers",gcmtitle="Category:"+category,gcmtype="file",gcmlimit="100",prop="imageinfo",iiprop="url|extmetadata",iiurlwidth="600")
    data=json.loads(get("https://commons.wikimedia.org/w/api.php?"+urllib.parse.urlencode(params)))
    items=list(data["query"]["pages"].values())
    sheet=Image.new("RGB",(1200,((len(items)+2)//3)*246),"#f5efe3")
    draw=ImageDraw.Draw(sheet)
    for i,p in enumerate(items):
        info=p["imageinfo"][0]
        p["selection_id"]=group+"-"+str(i)
        x,y=(i%3)*400,(i//3)*246
        try:
            im=ImageOps.exif_transpose(Image.open(io.BytesIO(get(info.get("thumburl",info["url"]))))).convert("RGB")
            sheet.paste(ImageOps.fit(im,(390,219)),(x+5,y))
        except Exception as e: print(p["title"],str(e))
        draw.text((x+8,y+224),p["selection_id"]+" "+p["title"][5:37],fill="#401d22")
    sheet.save(out/(group+"-selection.jpg"),quality=83)
    (out/(group+"-selection.json")).write_text(json.dumps(items,ensure_ascii=False,indent=2)+"\n")
