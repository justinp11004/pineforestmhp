"""Export a portable HTML with each image embedded once and decoded on demand."""
from pathlib import Path
import base64, html, json, mimetypes, re, sys

root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]);live_url=sys.argv[2]
page=(root/'content/index.html').read_text()
urls=sorted(set(re.findall(r'/assets/[A-Za-z0-9._-]+',page)))
registry={}
for url in urls:
    file=root/'public'/url.lstrip('/')
    assert file.is_file(),url
    registry[url]=[mimetypes.guess_type(file.name)[0],base64.b64encode(file.read_bytes()).decode('ascii')]

# Static images display even with JavaScript disabled. Dynamic galleries share a
# registry instead of repeating the full-size image bytes for every reference.
page=re.sub(r'src="(/assets/[A-Za-z0-9._-]+)"',lambda m:'src="data:'+registry[m[1]][0]+';base64,'+registry[m[1]][1]+'"',page)
source=(root/'content/site.js').read_text()
portable=source
for expr in ['m.src','m.thumb','h.thumb','h.document']:
    portable=re.sub(r'\b'+re.escape(expr)+r'\b',lambda m:'embeddedAsset('+m[0]+')',portable)
resolver='''
const embeddedRegistry=JSON.parse(document.getElementById('embeddedAssets').textContent);
const embeddedCache=new Map();
function embeddedAsset(path){
 if(!path||!embeddedRegistry[path])return path;
 if(!embeddedCache.has(path)){
  const [type,data]=embeddedRegistry[path],raw=atob(data),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  embeddedCache.set(path,URL.createObjectURL(new Blob([bytes],{type})));
 }
 return embeddedCache.get(path);
}
'''
portable=portable.replace("aerial?'/assets/pine-forest-drone.jpg':'/assets/park-site-plan.png'", "embeddedAsset(aerial?'/assets/pine-forest-drone.jpg':'/assets/park-site-plan.png')")
portable=portable.replace("'use strict';","'use strict';"+resolver,1)
portable=portable.replace('const homes=',"document.querySelectorAll('a[href^=\"/assets/\"]').forEach(a=>a.href=embeddedAsset(a.getAttribute('href')));\nconst homes=",1)
portable=portable.replace("if(location.protocol==='file:')", "if(location.origin!==new URL(document.querySelector('meta[name=\"pine-live-url\"]').content).origin)")
page=page.replace(source,portable)
page=page.replace('href="/manage"','href="'+live_url+'/manage"')
page=page.replace('<meta charset="UTF-8">','<meta charset="UTF-8"><meta name="pine-live-url" content="'+html.escape(live_url,quote=True)+'">')
page=page.replace('<script id="homeData"', '<script type="application/json" id="embeddedAssets">'+json.dumps(registry,separators=(',',':'))+'</script><script id="homeData"')
assert 'id="embeddedAssets"' in page
assert 'Anywhere Homes' not in page
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(page)
print(json.dumps({'path':str(output),'bytes':output.stat().st_size,'embeddedAssets':len(registry)}))
