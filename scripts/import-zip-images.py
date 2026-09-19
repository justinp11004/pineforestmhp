"""Import every matching ZIP image; retain an explicit record of exclusions.

Usage: python scripts/import-zip-images.py /path/to/asset-manifest.json
The manifest is generated from the supplied ZIP, with model IDs matching models.json.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageChops
import hashlib, io, json, sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets'
manifest = json.loads(Path(sys.argv[1]).read_text())
models = json.loads((ROOT / 'content/models.json').read_text())
old_sources = json.loads((ROOT / 'content/asset-sources.json').read_text())
old_source = {x['asset']: x['source'] for x in old_sources}
plan_index = {1:19,21:0,22:0,23:7,24:0,25:5,26:0,27:0,28:0,29:0,30:0,31:15,32:1,34:1}
excluded = {
    1: {j:'Photography identifies BZ28523E, a different model from BZ14682C.' for j in range(19)},
    32: {13:'Cavco BZ14682C plan filed under Clayton Dogwood.',14:'One-bath Elm layout; Dogwood has two baths.'},
    33: {8:'Cavco BZ14682C plan filed under Clayton Elm.'},
    34: {17:'Cavco BZ14682C plan filed under Clayton Hickory.',18:'Two-bedroom Elm layout; Hickory has three bedrooms.'},
}
info_index = {i:{1,2} for i in [21,22,24,26,27,28,29,30]}
info_index.update({23:{8,9},25:{6,7},31:{16,17}})
tour_index = {14:{0},15:{0},20:{0,91,92},32:{16},33:{9},34:{7}}
audit, omissions, retained = [], [], set()

def relative_source(path):
    return 'Mobile home PROMOTIONS/' + str(path).split('Mobile home PROMOTIONS/',1)[1]

def encode(im, size, name, plan=False, trim=False):
    im = ImageOps.exif_transpose(im).convert('RGB')
    if trim:
        # Remove white PDF margins only; preserve every line and annotation.
        mask = ImageChops.difference(im, Image.new('RGB',im.size,'white')).convert('L').point(lambda p:255 if p>35 else 0)
        box = mask.getbbox()
        if box:
            pad=24
            im=im.crop((max(0,box[0]-pad),max(0,box[1]-pad),min(im.width,box[2]+pad),min(im.height,box[3]+pad)))
    im.thumbnail(size,Image.Resampling.LANCZOS)
    data=io.BytesIO()
    im.save(data,'PNG' if plan else 'JPEG',**({'optimize':True} if plan else {'quality':88,'optimize':True,'progressive':True}))
    payload=data.getvalue()
    assert payload
    suffix='.png' if plan else '.jpg'
    filename=f'{name}-{hashlib.sha256(payload).hexdigest()[:12]}{suffix}'
    (ASSETS/filename).write_bytes(payload)
    # Force full decoding. File existence / header verification alone is insufficient.
    with Image.open(io.BytesIO(payload)) as check: check.load()
    url='/assets/'+filename
    retained.add(url)
    return url

def media(im, name, kind, label, trim=False):
    is_plan=kind in ('plan','info')
    full=encode(im.copy(),(2000,1800) if is_plan else (1600,1200),name,is_plan,trim)
    thumb=encode(im.copy(),(240,180),'thumb-'+name,False,trim)
    return {'src':full,'thumb':thumb,'type':kind,'label':label}

for raw,h in zip(manifest,models):
    i=raw['id']; assert str(i)==h['id']
    gallery=[]; seen=set(); photo_no=0
    # Keep the previously selected lead photograph first, then include all remaining images.
    cover_source=old_source.get(h['cover'],'')
    order=sorted(range(len(raw['images'])),key=lambda j:(relative_source(raw['images'][j])!=cover_source,j))
    for j in order:
        path=Path(raw['images'][j]);source=relative_source(path)
        if j in excluded.get(i,{}):
            omissions.append({'modelId':h['id'],'source':source,'reason':excluded[i][j]});continue
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in seen:
            audit.append({'modelId':h['id'],'source':source,'duplicate':True});continue
        seen.add(digest)
        if j==plan_index.get(i): kind,label='plan','Manufacturer floor plan'
        elif j in info_index.get(i,set()): kind,label='info','Manufacturer model / specification reference'
        elif j in tour_index.get(i,set()): kind,label='tour','Furnished layout / virtual-tour reference'
        else:
            kind='photo';photo_no+=1;label=f'Model reference photo {photo_no}'
        item=media(Image.open(path),f'home-{i}-{j}',kind,label,trim=kind=='plan')
        gallery.append(item)
        audit.append({'modelId':h['id'],'source':source,'asset':item['src'],'thumbnail':item['thumb'],'type':kind})
    if h['plan'] and i not in plan_index:
        item=media(Image.open(ROOT/'public'/h['plan'].lstrip('/')),f'home-{i}-floor-plan','plan','Manufacturer floor plan',trim=True)
        gallery.append(item)
        audit.append({'modelId':h['id'],'asset':item['src'],'type':'plan','source':relative_source(raw['pdfs'][0]['path']) if raw['pdfs'] and i!=9 else 'Mobile home PROMOTIONS/Cavco/GSX BlazerSelect brochure, matching GTO page'})
    # Photographs lead; layouts and reference sheets stay one tap away.
    gallery.sort(key=lambda m:{'photo':0,'tour':1,'plan':2,'info':3}[m['type']])
    assert gallery,h['name']
    h['media']=gallery
    h['photos']=[x['src'] for x in gallery if x['type']=='photo']
    h['plan']=next((x['src'] for x in gallery if x['type']=='plan'),None)
    h['cover']=gallery[0]['src']
    h['thumb']=encode(Image.open(ROOT/'public'/h['cover'].lstrip('/')),(760,580),f'card-{i}')
    if h['document']:retained.add(h['document'])

# Authentic supplied interiors for the existing hero and story.
template=(ROOT/'content/template.html').read_text()
for name,idx in [('hero-kitchen',6),('hero-living',0)]:
    url=encode(Image.open(manifest[32]['images'][idx]),(1600,1200),name)
    template=template.replace('/assets/'+name+'.webp',url)
(ROOT/'content/template.html').write_text(template)
(ROOT/'content/models.json').write_text(json.dumps(models,ensure_ascii=False,separators=(',',':')))
(ROOT/'content/asset-sources.json').write_text(json.dumps(audit,indent=2))
(ROOT/'content/excluded-source-images.json').write_text(json.dumps(omissions,indent=2))
for path in ASSETS.iterdir():
    if '/assets/'+path.name not in retained:path.unlink()
report={'homes':len(models),'sourceImages':sum(len(x['images']) for x in manifest),'includedSourceImages':len([x for x in audit if 'thumbnail' in x or x.get('duplicate')]),'excludedMismatches':len(omissions),'galleryImages':sum(len(h['media']) for h in models),'photos':sum(len(h['photos']) for h in models),'assets':len(retained),'assetBytes':sum(p.stat().st_size for p in ASSETS.iterdir())}
assert report['includedSourceImages']+report['excludedMismatches']==report['sourceImages']
(ROOT/'content/image-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
