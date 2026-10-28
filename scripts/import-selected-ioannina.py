"""Retrieve the exact Ioannina photograph chosen through the user's Google share link."""
import io,json,urllib.request
from pathlib import Path
from PIL import Image,ImageOps
out=Path("assets/region-scenic")
urls=["http://arttravel_images.sfw.gr/fotos/637353701381710447.jpg","https://arttravel_images.sfw.gr/fotos/637353701381710447.jpg"]
for url in urls:
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Referer":"http://www.arttravel.gr/"})
        with urllib.request.urlopen(req,timeout=30) as response: data=response.read()
        im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        im.save(out/"ioannina-lake-sunset-selected.webp",quality=92,method=6)
        meta=dict(file="assets/region-scenic/ioannina-lake-sunset-selected.webp",width=im.width,height=im.height,source="http://www.arttravel.gr/arttravel-best_best-stories/article/17491/ioannina-city-break",original=url,userSelectedVia="https://share.google/BV3cgae9Z3a9drpIA",changes="Format conversion; responsive crop in card. User-selected image; no Creative Commons licence asserted.")
        (out/"ioannina-selected.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n")
        print("Imported",im.size,flush=True)
        break
    except Exception as e: print(url,str(e),flush=True)
else: raise RuntimeError("Original image unavailable")
