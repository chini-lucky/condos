from pathlib import Path
from PIL import Image,ImageDraw
import pillow_heif
pillow_heif.register_heif_opener()
folder=Path(__file__).parent;folder.mkdir(exist_ok=True)
for name,size,orientation in [('rotated-gps.heic',(2400,1200),6),('mirrored.heic',(80,40),2),('basic.heic',(64,32),1)]:
 image=Image.new('RGB',size,'red');ImageDraw.Draw(image).rectangle((size[0]//2,0,size[0],size[1]),fill='blue')
 exif=Image.Exif();exif[274]=orientation
 exif[34853]={1:'N',2:(13.0,45.0,0.0),3:'E',4:(100.0,30.0,0.0)}
 image.save(folder/name,format='HEIF',quality=95,exif=exif.tobytes(),xmp=b'<x:xmpmeta xmlns:x="adobe:ns:meta/">SYNTHETIC-GPS-METADATA</x:xmpmeta>')
 with Image.open(folder/name) as reread: print(name,reread.size,reread.getpixel((2,2)),reread.getpixel((reread.width-3,reread.height-3)))
