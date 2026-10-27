"""Import licensed scenic photographs for visual selection."""
import hashlib, io, json, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
items = json.loads("[{\"id\":\"ioannina-lake\",\"file\":\"Ioannina, Lake Pamvotis and Fethiye Mosque.JPG\",\"author\":\"Cosal\",\"license\":\"CC BY-SA 4.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/4.0/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Ioannina,_Lake_Pamvotis_and_Fethiye_Mosque.JPG\"},{\"id\":\"ioannina-aslan\",\"file\":\"Aslan Pasha Mosque.jpg\",\"author\":\"Inkey\",\"license\":\"CC BY-SA 3.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/3.0/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Aslan_Pasha_Mosque.jpg\"},{\"id\":\"ioannina-trees\",\"file\":\"Aslan Pasha Ottoman mosque in Ioannina, Greece.jpg\",\"author\":\"Χαράλαμπος Γκούβας\",\"license\":\"CC BY-SA 3.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/3.0/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Aslan_Pasha_Ottoman_mosque_in_Ioannina,_Greece.jpg\"},{\"id\":\"ioannina-aslan2\",\"file\":\"Aslan Pasha Moschee2.jpg\",\"author\":\"Fingalo\",\"license\":\"CC BY-SA 2.0 DE\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/2.0/de/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Aslan_Pasha_Moschee2.jpg\"},{\"id\":\"preveza-promenade\",\"file\":\"Promenade of Preveza, Greece.jpg\",\"author\":\"Joerg\",\"license\":\"CC BY 2.0\",\"license_url\":\"https://creativecommons.org/licenses/by/2.0/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Promenade_of_Preveza,_Greece.jpg\"},{\"id\":\"preveza-dusk\",\"file\":\"Wharf in Preveza, Greece.jpg\",\"author\":\"Annatsach\",\"license\":\"CC BY-SA 4.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/4.0/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Wharf_in_Preveza,_Greece.jpg\"},{\"id\":\"sivota-lagoon\",\"file\":\"Laguna Sivota.jpg\",\"author\":\"Vojtasekd\",\"license\":\"CC BY 4.0\",\"license_url\":\"https://creativecommons.org/licenses/by/4.0/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Laguna_Sivota.jpg\"},{\"id\":\"sivota-islands\",\"file\":\"Sybota.jpg\",\"author\":\"FlankerFF\",\"license\":\"CC BY-SA 3.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/3.0/\",\"source\":\"https://commons.wikimedia.org/wiki/File:Sybota.jpg\"}]")
out = Path("assets/region-scenic")
out.mkdir(parents=True, exist_ok=True)
sheet = Image.new("RGB", (1200, 4*380), "#f5efe3")
draw = ImageDraw.Draw(sheet)
for i, item in enumerate(items):
    name = item["file"].replace(" ", "_")
    digest = hashlib.md5(name.encode()).hexdigest()
    url = "https://upload.wikimedia.org/wikipedia/commons/"+digest[0]+"/"+digest[:2]+"/"+urllib.parse.quote(name)
    request = urllib.request.Request(url, headers={"User-Agent":"EpirusAssociationWebsite/1.0 (https://github.com/mike000123/Hpeirwtikos_Syndesmos)"})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read()
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert("RGB")
    im.thumbnail((1440,1440))
    im.save(out/(item["id"]+".webp"), quality=88, method=6)
    item.update(original_url=url, width=im.width, height=im.height, changes="Resize and WebP conversion; centered crop in card.")
    x,y=(i%2)*600,(i//2)*380
    sheet.paste(ImageOps.fit(im,(580,326)),(x+10,y))
    draw.text((x+10,y+336),item["id"], fill="#401d22")
sheet.save(out/"review.jpg",quality=85)
(out/"credits.json").write_text(json.dumps(items, ensure_ascii=False, indent=2)+"\n")
