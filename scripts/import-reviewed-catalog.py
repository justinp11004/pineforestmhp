"""Import reviewed source records. Run with the parent workspace audit directory present.

No size is inferred from a model code and no tour endpoint is synthesized.
Keep the reviewed snapshots in content/source-reviews for provenance.
"""
import json, re, hashlib, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT.parent / 'audit'
ASSETS = ROOT / 'public/assets'
OUT = ASSETS / 'reviewed'
OUT.mkdir(exist_ok=True)
SNAPSHOTS = ROOT / 'content/source-reviews'
SNAPSHOTS.mkdir(exist_ok=True)
OLD_PATH = SNAPSHOTS / 'previous-models.json'
if not OLD_PATH.exists():
    shutil.copyfile(ROOT/'content/models.json', OLD_PATH)
old = json.loads(OLD_PATH.read_text())
old_names = {m['name'].lower():m for m in old}
old_codes = {m['code']:m for m in old if m.get('code')}
sources = []
asset_map = []
excluded = []

def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')[:90]
def money(n): return f'${n:,.0f}'
def copy_file(path):
    p=Path(path); data=p.read_bytes(); digest=hashlib.sha256(data).hexdigest()[:12]
    dest=OUT/(slug(p.stem)+'-'+digest+p.suffix.lower())
    if not dest.exists(): dest.write_bytes(data)
    asset_map.append({'asset':'/assets/reviewed/'+dest.name,'source':str(p),'sha256':hashlib.sha256(data).hexdigest()})
    return '/assets/reviewed/'+dest.name

def picture(path, kind='plan', label='Manufacturer floor plan'):
    src=copy_file(path)
    p=ROOT/'public'/src.lstrip('/')
    im=Image.open(p); im.load()
    im.thumbnail((760,580),Image.Resampling.LANCZOS)
    bg=Image.new('RGB',im.size,'white')
    if im.mode=='RGBA': bg.paste(im,mask=im.getchannel('A'))
    else: bg.paste(im.convert('RGB'))
    thumb=OUT/(p.stem+'-thumb.jpg')
    bg.save(thumb,quality=88,optimize=True)
    return {'src':src,'thumb':'/assets/reviewed/'+thumb.name,'type':kind,'label':label}

def actual_label(m):
    a=m.get('actualWidthLabel') or m.get('actualWidth')
    if isinstance(a,(int,float)):
        feet=int(a); inches=round((a-feet)*12); a=f'{feet}′'+(f'{inches}″' if inches else '')
    if a:
        a=str(a).replace(' ft ','′').replace(' in','″').replace(' ft','′')
        return f'{a} × {m["length"]}′'
    raise ValueError('Unverified actual width '+m['name'])

def public_price(m):
    p=m.get('price'); pe=m.get('priceEvidence') or {}
    if p is None: return None,'Request current price','Your quote confirms the home configuration, delivery, installation, site work, taxes and other charges.'
    if isinstance(p,dict):
        if 'requiredMidwestPackage' in p:
            note=f'{money(p["base"])} factory base + {money(p["requiredMidwestPackage"])} required Midwest package. Price sheet effective {p["date"]}. Delivery, installation, site work, taxes, additional options and final retail charges require a complete quote.'
            return p['publicHomePrice'],'Base + required Midwest package',note
        note=f'Factory quote dated {p["date"]}: {money(p["base"])} home + {money(p["options"])} selected options. Separately quoted shipping: {money(p["shipping"])}; MHI dues: {money(p["dues"])}. Factory quote total: {money(p["total"])}. Final retail price, taxes, installation and site work require a complete quote.'
        return p['publicHomePrice'],'Home + selected quoted options',note
    if m.get('surcharge') is not None:
        note=f'{money(m["basePrice"])} factory base + {money(m["surcharge"])} listed surcharge. Price sheet effective {pe.get("effectiveDate")}. Delivery, installation, options, site work, taxes and final retail charges require a complete quote.'
        return p,'Factory base + listed surcharge',note
    if 'Nappanee' in m['brand']:
        note=f'Factory base price dated {pe.get("date")}. Michigan brake-axle upgrade is additional at $60 per axle; the required axle count must be quoted. Selected options, delivery, installation, site work, taxes and final retail charges are additional.'
        return p,'Factory base price',note
    return p,'Supplied home price','Price supplied with the model folder; the price date and included charges were not specified. Confirm the current home price, options, delivery, installation, site work, taxes and fees in your complete quote.'

def resources(m):
    rows=[]; seen=set()
    for d in m.get('documents',[]):
        p=d.get('path'); label=d['label']; scope=d.get('scope') or m['series']; page=d.get('page')
        if 'tour index' in label.lower(): continue
        if m.get('nominalWidth')==14 and 'elevation packages' in label.lower(): continue
        if not p:
            # These exact official documents were read, unlike unresolved publication links.
            if 'adventurehomes.net' not in d.get('url','') or 'verified/read' not in d.get('downloadStatus','').lower() and 'verified by web reader' not in d.get('downloadStatus','').lower(): continue
            url=d['url']; fmt='PDF'; external=True
        else:
            if not Path(p).is_file(): raise FileNotFoundError(p)
            url=copy_file(p); fmt=Path(p).suffix[1:].upper(); external=False
        if fmt=='PDF' and isinstance(page,int): url+=f'#page={page}'
        key=(url,label)
        if key in seen: continue
        seen.add(key)
        pages=('Page '+str(page)) if isinstance(page,int) else ('Pages '+', '.join(map(str,page))) if isinstance(page,list) else ('Pages '+page) if isinstance(page,str) and re.fullmatch(r'\d+-\d+',page) else ''
        # Keep product-facing labels short; detailed applicability remains in the review.
        scope_label=m['series']
        if any(w in label.lower() for w in ['bank pack','pier','sales sheet','factory quote','model floor','manufacturer floor']): scope_label=m['name']+' · Model document'
        if 'clarion' in label.lower(): scope_label='Clarion factory · Options vary by series'
        if 'adventure homes 2026' in label.lower(): scope_label='Adventure Homes · Options vary by series'
        rows.append({'url':url,'label':label,'scope':scope_label,'pages':pages,'format':fmt,'externalVerified':external})
    return rows

def tours(m):
    rows=[]
    for i,t in enumerate(m.get('tours',[])):
        if not t.get('modelVerified'): continue
        embed=t.get('embedUrl')
        if t.get('embedCode'):
            found=re.search(r'src=[\'\"]([^\'\"]+)',t['embedCode'])
            if found: embed=found.group(1)
        url=t.get('resolvedUrl') or t['url']
        row={'url':url,'verified':True,'label':m['name']+(' · Tour '+str(i+1) if len(m['tours'])>1 else ' · 3D tour')}
        if embed: row['embed']=embed
        if m['name']=='Vista': row['note']='Display-home tour SN16818 shows an optional configuration. Confirm the quoted 52-foot, one-bath layout and finishes.'
        rows.append(row)
    return rows

for key, filename in [('adventure','audit.json'),('clayton','audit.json'),('champion','champion_audit.json'),('cavco','cavco_audit.json')]:
    source=AUDIT/key/filename
    shutil.copyfile(source,SNAPSHOTS/(key+'.json'))
    review=json.loads(source.read_text())
    excluded.extend({'audit':key,**e} for e in review.get('exclusions',[]))
    for m in review['models']:
        if m['decision']!='include': continue
        if m.get('code')=='1666H32219':
            excluded.append({'audit':key,'name':m['name'],'decision':'hold','reason':'No dimensioned manufacturer plan found; body length is supported only by supplied folder label.'}); continue
        sources.append(m)

models=[]
for n,m in enumerate(sources):
    prev=old_codes.get(m.get('code')) or old_names.get(m['name'].lower())
    if m['series']=='Kalahari': prev=None
    mid=prev['id'] if prev else str(100+n)
    price,priceLabel,priceNote=public_price(m)
    plan_path=m.get('plan') or m.get('planPath') or m.get('floorplan',{}).get('path')
    if not plan_path and m['brand']=='Adventure Homes': plan_path=m['documents'][0]['path']
    plan=picture(plan_path) if plan_path else next((x.copy() for x in prev['media'] if x['type']=='plan'),None) if prev else None
    if not plan: raise ValueError('Missing plan '+m['name'])
    media=[]
    if 'verifiedPhotos' in m:
        for photo in sorted(m['verifiedPhotos'],key=lambda x:x['kind']!='ext'):
            if photo['kind']=='flp': continue
            media.append(picture(photo['path'],'photo','Manufacturer '+('exterior' if photo['kind']=='ext' else 'interior')+' reference photo'))
        er=m.get('floorplan',{}).get('exteriorRendering')
        if er: media.append(picture(er['path'],'rendering','Manufacturer exterior rendering · optional appearance'))
    elif prev:
        media=[x.copy() for x in prev.get('media',[]) if x['type']!='plan']
        if m['name']=='Vista':
            for x in media:
                if x['type'] in ['photo','tour']: x['label']='Vista display-home reference · optional configuration'
    if m.get('code')=='1666H32085':
        for x in media: x['label']='2025 Novi display-home reference · confirm current selections'
    media.append(plan)
    photos=[x['src'] for x in media if x['type']=='photo']
    first=next((x for x in media if x['type']=='photo'),plan)
    media.remove(first); media.insert(0,first)
    note=''
    if m['name']=='Mustang': note='The 2025 porch-layout brochure lists 765 sq. ft.; a newer individual flyer lists 800 sq. ft. Both exceed 720 sq. ft. Confirm the porch configuration and final floor area before ordering.'
    if m['name']=='Vista': note='The tour shows display-home SN16818 with optional configuration differences. This listing follows the documented 52-foot, one-bath base layout.'
    if m.get('code')=='1666H22091': note='This listing follows the exact-code two-bedroom floor plan; the manufacturer website also contains a conflicting three-bedroom label. Confirm the final order against the attached plan.'
    brand={'Cavco - Nappanee':'Cavco Nappanee','Cavco - Clarion':'Cavco Clarion'}.get(m['brand'],m['brand'])
    h={'id':mid,'name':m['name'],'brand':brand,'series':m['series'],'code':m.get('code') or '',
       'width':m['nominalWidth'],'length':m['length'],'beds':m['beds'],'baths':m['baths'],'sqft':m['sqft'],'sections':1,
       'dimensionsLabel':actual_label(m),'dimensionBasis':'Documented home-body dimensions; transport length and lot placement confirmed separately.',
       'price':price,'priceLabel':priceLabel,'priceNote':priceNote,
       'photos':photos,'plan':plan['src'],'cover':first['src'],'thumb':first.get('thumb',first['src']),'media':media,
       'document':None,'note':note,'resources':resources(m),'tours':tours(m),
       'description':f'{m["beds"]} bedrooms, {m["baths"]} '+('bathroom' if m['baths']==1 else 'bathrooms')+f' and {m["sqft"]:,} documented square feet. Explore the {m["series"]} layout, review its selections, and request a complete price for your home at Pine Forest.',
       'screening':{'verified':True,'reviewedOn':'2026-09-17','evidence':[{'source':e.get('zipRelativePath') or e.get('zipPath') or e.get('url') or e.get('path'),'page':e.get('page'),'quote':e.get('quote')} for e in m['evidence']]}}
    if m.get('transportOverallLength'): h['transportLength']=m['transportOverallLength'];h['dimensionBasis']=f'Home-body dimensions. Manufacturer transport length with detachable hitch: {m["transportOverallLength"]} ft.'
    models.append(h)

# Lead with photographic homes from different series, then a price-led plan and newer ranges.
featured=['33','32','34','23','25','6']
models.sort(key=lambda h:(featured.index(h['id']) if h['id'] in featured else len(featured),h['brand'],h['series'],h['name']))
assert len({h['id'] for h in models})==len(models)
(ROOT/'content/models.json').write_text(json.dumps(models,ensure_ascii=False,indent=2)+'\n')
(ROOT/'content/catalog-review.json').write_text(json.dumps({'date':'2026-09-17','modelCount':len(models),'excludedRecords':excluded,'assetSources':asset_map},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'models':len(models),'galleryMedia':sum(len(h['media']) for h in models),'resourceLinks':sum(len(h['resources']) for h in models),'tours':sum(len(h['tours']) for h in models),'priced':sum(h['price'] is not None for h in models)},indent=2))
