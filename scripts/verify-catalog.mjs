import fs from 'node:fs';
import assert from 'node:assert/strict';
const homes=JSON.parse(fs.readFileSync('content/models.json','utf8'));
const policy=JSON.parse(fs.readFileSync('content/catalog-policy.json','utf8'));
const ids=new Set();
const asset=url=>{assert.equal(typeof url,'string');const path=url.split('#')[0];assert.ok(path.startsWith('/assets/'),path);assert.ok(!path.includes('..'),path);assert.ok(fs.existsSync('public'+path),path)};
for(const h of homes){
  assert.ok(!ids.has(h.id),'Duplicate model '+h.id);ids.add(h.id);
  assert.ok(h.screening?.verified===true,'Unverified model '+h.name);
  assert.ok(h.screening.evidence?.length,'Missing size evidence '+h.name);
  assert.equal(h.sections,1,'Multi-section model '+h.name);
  assert.ok(Number.isFinite(h.sqft)&&h.sqft>=policy.minimumSquareFeet,'Insufficient floor area '+h.name);
  const width=policy.nominalWidthClasses[String(h.width)];assert.ok(width,'Unknown width class '+h.name);
  assert.ok(h.length>=width.minimumLengthFeet&&h.length<=policy.maximumBodyLengthFeet,'Length outside catalog rule '+h.name);
  assert.ok(h.plan&&h.media?.length,'No verified floor plan '+h.name);
  assert.ok(h.media.some(m=>m.type==='plan'&&m.src===h.plan),'Unlinked floor plan '+h.name);
  assert.ok(h.price===null||(Number.isFinite(h.price)&&h.price>0&&h.priceNote),'Unsubstantiated price '+h.name);
  asset(h.plan);asset(h.thumb);
  for(const m of h.media){asset(m.src);asset(m.thumb||m.src)}
  for(const d of h.resources||[]){if(d.externalVerified){assert.equal(new URL(d.url).protocol,'https:');assert.equal(new URL(d.url).hostname,'adventurehomes.net')}else asset(d.url);assert.ok(d.label&&d.scope,'Unlabeled document '+h.name)}
  for(const t of h.tours||[]){assert.equal(new URL(t.url).protocol,'https:');assert.ok(t.verified,'Unverified tour '+h.name);if(t.embed)assert.ok(['my.matterport.com','momento360.com','www.momento360.com'].includes(new URL(t.embed).hostname),'Unapproved embed host')}
}
assert.ok(homes.length>0);
console.log(`Catalog gate passed: ${homes.length} evidence-backed single-section models; every floor area, length, document, image and tour checked.`);
