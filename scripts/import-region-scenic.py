"""Import the three selected licensed destination photographs."""
import io,json,urllib.request
from pathlib import Path
from PIL import Image,ImageOps
items=json.loads("[{\"id\":\"ioannina-mosque-lake\",\"key\":\"ioannina\",\"file\":\"GR-ioannina-alipascha-see.jpg\",\"author\":\"Bgabel / Wikivoyage shared\",\"source\":\"https://commons.wikimedia.org/wiki/File:GR-ioannina-alipascha-see.jpg\",\"original_url\":\"https://upload.wikimedia.org/wikipedia/commons/8/86/GR-ioannina-alipascha-see.jpg\",\"license\":\"CC BY-SA 3.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/3.0/\"},{\"id\":\"preveza-sunrise\",\"key\":\"preveza\",\"file\":\"Sunrise in Preveza Port, Greece.jpg\",\"author\":\"Χαράλαμπος Γκούβας / Harrygouvas (English Wikipedia)\",\"source\":\"https://commons.wikimedia.org/wiki/File:Sunrise_in_Preveza_Port,_Greece.jpg\",\"original_url\":\"https://upload.wikimedia.org/wikipedia/commons/9/9b/Sunrise_in_Preveza_Port%2C_Greece.jpg\",\"license\":\"CC BY-SA 3.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/3.0/\"},{\"id\":\"thesprotia-agia-paraskevi\",\"key\":\"thesprotia\",\"file\":\"Η παραλία της Αγίας Παρασκευής (2710173462).jpg\",\"author\":\"Αλέξανδρος\",\"source\":\"https://commons.wikimedia.org/wiki/File:%CE%97_%CF%80%CE%B1%CF%81%CE%B1%CE%BB%CE%AF%CE%B1_%CF%84%CE%B7%CF%82_%CE%91%CE%B3%CE%AF%CE%B1%CF%82_%CE%A0%CE%B1%CF%81%CE%B1%CF%83%CE%BA%CE%B5%CF%85%CE%AE%CF%82_(2710173462).jpg\",\"original_url\":\"https://upload.wikimedia.org/wikipedia/commons/a/af/%CE%97_%CF%80%CE%B1%CF%81%CE%B1%CE%BB%CE%AF%CE%B1_%CF%84%CE%B7%CF%82_%CE%91%CE%B3%CE%AF%CE%B1%CF%82_%CE%A0%CE%B1%CF%81%CE%B1%CF%83%CE%BA%CE%B5%CF%85%CE%AE%CF%82_%282710173462%29.jpg\",\"license\":\"CC BY-SA 2.0\",\"license_url\":\"https://creativecommons.org/licenses/by-sa/2.0/\"}]")
out=Path("assets/region-scenic")
out.mkdir(exist_ok=True,parents=True)
for i,item in enumerate(items):
    req=urllib.request.Request(item["original_url"],headers={"User-Agent":"EpirusAssociationWebsite/1.0 (https://github.com/mike000123/Hpeirwtikos_Syndesmos)"})
    with urllib.request.urlopen(req,timeout=60) as r: data=r.read()
    im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    im.thumbnail((1440,1440))
    im.save(out/(item["id"]+".webp"),quality=90,method=6)
    item.update(width=im.width,height=im.height,changes="Resize and WebP conversion. Responsive centered crop to 16:9.")
(out/"credits.json").write_text(json.dumps(items,ensure_ascii=False,indent=2)+"\n")
