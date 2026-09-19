// Runs the real form callback in an isolated DOM boundary. No browser, network,
// production records, or external messages are used by these checks.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(new URL('../content/site.js', 'file://' + __filename), 'utf8');
const start = source.indexOf("$('inquiryForm').addEventListener('submit',async");
const end = source.indexOf("$('newInquiry').addEventListener", start);
assert.ok(start >= 0 && end > start);

class Element {
  constructor(id) { this.id = id; this.hidden = false; this.disabled = false; this.attrs = {}; this.value = ''; }
  setAttribute(k, v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  focus() { this.focused = true; }
  scrollIntoView() {}
  closest() { return this.details || null; }
  after(node) { this.error = node; }
}
function fixture() {
  const nodes = new Map();
  const $ = id => { if (!nodes.has(id)) nodes.set(id, new Element(id)); return nodes.get(id); };
  const form = $('inquiryForm');
  const values = { name: 'Example Buyer', email: 'buyer@example.test', phone: '', home: '32', lot: '45', intent: 'Request a complete quote', message: '', consent: 'on', website: '', timeline: '', contactMethod: 'email' };
  const inputs = Object.keys(values).map(name => { const e = $(name); e.name = name; return e; });
  form.elements = { namedItem: name => inputs.find(e => e.name === name) };
  form.querySelectorAll = () => inputs;
  form.reportValidity = () => true;
  form.addEventListener = (_, fn) => { form.run = fn; };
  $('formSuccess').hidden = true;
  $('summaryHome').textContent = 'Champion · Dogwood';
  let fetchImpl, calls = [], serial = 0;
  const ctx = vm.createContext({ $, FormData: class { constructor() { return Object.entries(values); } }, Object, JSON, HTMLElement: Element, TypeError, Error, URLSearchParams, AbortController, setTimeout, clearTimeout, Date,
    document: { createElement: () => new Element('error') }, location: { protocol: 'https:', search: '' },
    makeId: () => 'request-' + (++serial), clearFieldErrors: () => {}, esc: s => s,
    rentalIntents: new Set(['2-bedroom rental','3-bedroom rental','2-bedroom rental - Section 8','3-bedroom rental - Section 8']), motion: () => 'auto', icon: () => '', inquiryCopy: () => ['', 'Send my quote request'],
    fetch: async (url, options) => { calls.push({ url, data: JSON.parse(options.body) }); return fetchImpl(url, options); }
  });
  vm.runInContext('let requestId=makeId(),lastSubmitted=null,savedSummary=null;', ctx);
  vm.runInContext(source.slice(source.indexOf('function showSavedRequest('), source.indexOf("['leadHome','leadLot','leadIntent']")), ctx);
  vm.runInContext(source.slice(start, end), ctx);
  return { $, values, inputs, calls, form, respond: fn => fetchImpl = fn, run: () => form.run({ preventDefault() {}, currentTarget: form }) };
}
const response = (data, ok = true) => ({ ok, json: async () => data });
const check = async (label, fn) => { await fn(); console.log('PASS ' + label); };
(async () => {
  await check('connection failure keeps details, shows a useful error and restores controls', async () => {
    const f = fixture(); f.respond(() => { throw new TypeError('Failed to fetch'); }); await f.run();
    assert.equal(f.$('formSuccess').hidden, true);
    assert.equal(f.$('formFields').hidden, false);
    assert.match(f.$('formStatus').textContent, /couldn’t connect/);
    assert.ok(f.inputs.every(e => !e.disabled)); assert.equal(f.$('submitInquiry').disabled, false);
    assert.equal(f.values.email, 'buyer@example.test');
  });
  await check('successful response displays the saved reference and success state', async () => {
    const f = fixture(); f.respond(() => response({ ok: true, reference: 'PF-EXAMPLE-ONLY' })); await f.run();
    assert.equal(f.$('formSuccess').hidden, false); assert.equal(f.$('formFields').hidden, true);
    assert.equal(f.$('inquiryReference').textContent, 'Your reference: PF-EXAMPLE-ONLY');
    assert.equal(f.$('formSuccess').focused, true);
    assert.equal(f.calls[0].data.home, '32'); assert.equal(f.calls[0].data.lot, '45'); assert.equal(f.calls[0].data.consent, true);
  });
  await check('retry preserves the request ID; changed details create a new ID', async () => {
    const f = fixture(); f.respond(() => { throw new TypeError('offline'); }); await f.run(); await f.run();
    assert.equal(f.calls[0].data.requestId, f.calls[1].data.requestId);
    f.values.message = 'A new question'; await f.run();
    assert.notEqual(f.calls[1].data.requestId, f.calls[2].data.requestId);
  });
  await check('server field errors stay visible and never imply success', async () => {
    const f = fixture(); f.$('lot').details = { open: false };
    f.respond(() => response({ ok: false, error: 'Choose another lot.', fields: { lot: 'That lot is occupied.' } }, false)); await f.run();
    assert.equal(f.$('formSuccess').hidden, true); assert.equal(f.$('lot').attrs['aria-invalid'], 'true');
    assert.equal(f.$('lot').details.open, true); assert.equal(f.$('lot').error.textContent, 'That lot is occupied.');
  });
  await check('invalid browser fields prevent a request', async () => {
    const f = fixture(); f.form.reportValidity = () => false; await f.run(); assert.equal(f.calls.length, 0);
  });
  await check('timeouts and malformed responses preserve the form for retry', async () => {
    for (const fail of [() => { const e = new Error('timeout'); e.name = 'AbortError'; throw e; }, () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } })]) {
      const f = fixture(); f.respond(fail); await f.run(); assert.equal(f.$('formSuccess').hidden, true);
      assert.equal(f.$('formFields').hidden, false); assert.equal(f.$('formStatus').hidden, false); assert.equal(f.$('submitInquiry').disabled, false);
    }
  });
  await check('rental and moving confirmations exclude purchase financing', async () => {
    for(const intent of ['2-bedroom rental','3-bedroom rental - Section 8','Move my own home']) { const f=fixture(); f.values.intent=intent; f.values.home=''; f.values.lot=''; f.respond(()=>response({ok:true,reference:'PF-EXAMPLE'})); await f.run(); assert.ok(!f.$('successAction').innerHTML.includes('lenders')); assert.match(f.$('successTitle').textContent, /rental|home-move/); }
  });
  await check('saved confirmation uses the submitted snapshot during an in-flight change', async () => { const f=fixture(); f.respond(()=>{f.$('summaryHome').textContent='Unrelated preference';return response({ok:true,reference:'PF-SNAPSHOT'})}); await f.run(); assert.match(f.$('savedRequest').textContent,/Champion · Dogwood/); assert.ok(!f.$('savedRequest').textContent.includes('Unrelated')); });
  console.log('8 inquiry interface checks passed. This is not a browser/network end-to-end test.');
})().catch(e => { console.error(e); process.exitCode = 1; });
