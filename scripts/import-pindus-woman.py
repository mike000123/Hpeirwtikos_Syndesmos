import pathlib,urllib.request,json,io
from PIL import Image,ImageOps
url='https://www.pipeaway.com/wp-content/uploads/2023/12/woman-of-zagori-aspraggeli-photo-by-phil-venditti.jpg'
req=urllib.request.Request(url,headers={'User-Agent':'EpirusAssociationWebsite/1.0'})
with urllib.request.urlopen(req,timeout=60) as r:payload=r.read()
im=ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert('RGB');im.thumbnail((1440,1440))
root=pathlib.Path('assets/epirus-features');im.save(root/'woman-of-pindus.webp',quality=88,method=6)
im.thumbnail((700,700));im.save(root/'woman-of-pindus-review.jpg',quality=80)
audit={'file':'assets/epirus-features/woman-of-pindus.webp','photographer':'Phil Venditti / LittleRoamingChief','creatorProfile':'https://www.flickr.com/photos/91873856@N00','reproductionSource':'https://www.pipeaway.com/zagorochoria-zagori-villages/','original':url,'license':'CC BY 2.0','licenseURL':'https://creativecommons.org/licenses/by/2.0/','licenseEvidence':'Source page credits: Woman of Zagori, Aspraggeli - LittleRoamingChief, licensed under CC BY 2.0.','changes':'Resized and converted to WebP, without cropping or retouching.'}
with Image.open(root/'woman-of-pindus.webp') as a:audit.update(width=a.width,height=a.height)
(root/'woman-of-pindus-credits.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
