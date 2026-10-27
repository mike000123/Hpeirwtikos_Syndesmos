"""Import a licensed photograph of the Ioannina carnival bonfire custom."""
import hashlib, io, json, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageOps
name="Tzamala_Kastro_Ioanninon_2013.jpg"
h=hashlib.md5(name.encode()).hexdigest()
url="https://upload.wikimedia.org/wikipedia/commons/"+h[0]+"/"+h[:2]+"/"+urllib.parse.quote(name)
req=urllib.request.Request(url,headers={"User-Agent":"EpirusAssociationWebsite/1.0 (https://github.com/mike000123/Hpeirwtikos_Syndesmos)"})
with urllib.request.urlopen(req,timeout=60) as response: data=response.read()
im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
im.thumbnail((1440,1440))
out=Path("assets/customs-cover")
out.mkdir(parents=True,exist_ok=True)
im.save(out/"tzamala-ioannina.webp",quality=89,method=6)
meta=dict(file="assets/customs-cover/tzamala-ioannina.webp",width=im.width,height=im.height,source="https://commons.wikimedia.org/wiki/File:Tzamala_Kastro_Ioanninon_2013.jpg",original=url,author="Jkravv",licence="CC BY-SA 4.0",licenceURL="https://creativecommons.org/licenses/by-sa/4.0/",changes="Resize and format conversion; responsive cropping in card/header.",notes="The source title/description identify a tzamala at Ioannina Castle. The page date differs from the filename; no exact year is asserted in the visible caption.")
(out/"credits.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n")
