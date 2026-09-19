# Pine Forest Mobile Home Park

Premium home catalog and community website for 7061 W Vienna Rd, Clio, MI 48420.

## Buyer experience

75 size-screened model records, 53 source-qualified price figures, and 576 matching gallery images (photos, floor plans and reference pages). Search and filter the catalog, compare up to three models, inspect galleries and source PDFs, explore the actual park aerial and original site plan, select a preferred site-plan lot, illustrate principal and interest, and send a consented inquiry. Reference imagery and all price exclusions remain explicit.

The illustrated community diagram has been removed. Only the supplied drone photograph and original site-plan image are presented. The lot preference list follows the original drawing; its 1–50 lot numbers require operational verification by the owner. All sites default to unconfirmed until the owner updates a status.

## Owner management

`/manage` uses platform ChatGPT authentication and a server-side allowlist for the verified Site owner. Anonymous visitors cannot read or edit inquiries. The owner can search leads, record stage and private notes, export the displayed page as CSV, and update lot availability. Every write checks the record revision to prevent silent concurrent edits. Email and SMS notifications are not configured; the inbox must be reviewed regularly. No automated outbound messages are sent.

The public lot selector reads current availability from `/api/lots`. Reserved and occupied lots cannot be requested. Selection is a preference, not a reservation. Both the selector and the inquiry handler use the same status source.

## Source and builds

The existing HTML architecture is retained. `content/template.html`, `content/site.css`, `content/site.js`, models, icons, lot data  are assembled with `node scripts/assemble.mjs`. The existing Sites build helper emits the Worker, assets and migrations. Preserve the pnpm lockfile.

`content/manage.html` implements the owner interface. `app/api/inquiries/route.ts` validates and stores inquiries with a payload fingerprint, strict request ID, bounded body, atomic rate limit, consent version, and structured preference fields. Only the persisted matching payload yields success. `app/api/manage/route.ts` authorizes every owner operation. D1 changes are generated in `drizzle`; applied migrations must remain immutable.

`content/asset-sources.json`, `content/excluded-source-images.json` and image audit files preserve the source provenance. Known misfiled model photos were excluded; a home with only a supplied floor plan is not given fabricated photographs. The September17 source review supplies documented room counts, floor areas and dimensions; models with unresolved dimension or minimum-area evidence are held.

`scripts/export-html.py` exports the companion portable HTML with embedded assets. Its forms send users to the live Site when opened offline. The live Site is the primary experience and does not load the entire portable image registry.

## Earlier verification records

`node scripts/verify-backend.cjs` runs 16 focused checks against actual transpiled handlers with an in-memory SQLite adapter. These cover matching and changed concurrent retries, structured persistence, validation, oversized bodies, cross-origin rejection, atomic rate limits, management authorization boundaries, availability changes, stale revisions, bound search queries, and invalid pagination. No production records are used. `node scripts/verify-inquiry-ui.cjs` runs six additional checks against the real inquiry callback in an isolated DOM boundary: success, connection failure, retries, field errors, validation, timeouts, and malformed responses. These are unit checks, not a browser/network end-to-end test.

The current redesign was inspected in desktop, 768px tablet and 390px/320px mobile preview viewports. The new full-width aerial and original plan loaded uncropped; the lender directory displayed all 12 contacts; the previously blank Boss floor plan rendered; model-to-financing context, mobile navigation and lot selection worked. The preview browser later stalled on an old native confirmation, so the final browser submission and final management edit interactions could not be completed. The native confirmation was replaced with an inline unsaved-changes prompt. Earlier-version browser tests had exercised inquiry saving, comparison and calculator flows; these do not establish a current end-to-end pass.

The live authenticated owner session has not been exercised. No outbound notification, measured conversion lift, millions of A/B tests, or zero-defect guarantee is claimed. Temporary QA routes and fixture data are excluded from publication.

## Preferred financing links

Financing entry points appear in navigation, hero, each catalog card, home details, pricing, calculator, FAQ, inquiry introduction and confirmation, and footer. Contextual home links close the gallery and retain the selected model for the buyer’s quote. The lender section includes all 12 companies from the supplied `3. Bank Lender List.pdf`: 12 equally visible contact cards with labeled company, phone, email and website fields. No lender details are hidden in an accordion. If no email was supplied, the card directs visitors to the verified phone or website. Website actions open a new tab with noopener/noreferrer; no inquiry data is appended or sent to lenders.

Triad’s https://www.triadfs.com/apply-now and Cascade’s https://www.cascadeloans.com/home-loan-onboarding/ were verified through the lenders’ own site navigation on 2026-09-15. The Cascade page redirects to its official Ask Cade purchase flow. 21st Mortgage and Beacon use the homepage URLs supplied in the PDF; a direct 21st application URL could not be verified, so its button accurately says “Visit lender website.” Directory phones and email contacts are reproduced from the supplied PDF and may change. The ambiguous MMS `mymortgage-online.com` entry is replaced with its verified corporate website, https://www.membermortgage.com/, with its supplied phone contact retained. No lender ranking, rate, approval promise, or universal leased-lot eligibility is claimed.

## Visual system and current layout

The actual park aerial leads the page at its full aspect ratio, followed immediately by the complete original site-plan drawing and the interactive lot selector, before the home catalog. On mobile, the aerial follows the headline ahead of the longer offer copy. Images have full-resolution actions and never crop away the site drawing. The source aerial is 800×600; enlarging the presentation does not add photographic detail.

Evergreen #075B3B, deep green #092E22, ink #10291F, white and pale green #EDF6EF define the palette. DM Sans and DM Serif Display form the type system. Reduced-motion preferences are respected, interactive controls have visible focus, and subtle entrance/hover treatments support the hierarchy.

The owner interface preserves unsaved lot drafts across refresh, queues rapid requests, prevents stale load results from replacing pending changes, retains original edit revisions, and warns before discarding notes. Lot search and status filters make availability updates easier to manage.

### Logo provenance

`public/assets/pine-forest-emblem.png` is the generated transparent brand emblem used in the website and management header. It is brand artwork, not a representation of a real property photograph. The source drone photograph, plan and home images remain unchanged.

Generation prompt:

> Use case: logo-brand. Asset type: premium website header logo symbol for Pine Forest Mobile Home Park, Clio, Michigan. Primary request: a standalone contemporary heritage property/community emblem: a stylized pine tree canopy subtly integrated with a home's roofline. A sophisticated, distinctive silhouette made of strong, simple shapes. Scene/backdrop: genuinely transparent background with alpha; no colored backdrop. Style/medium: crisp flat logo artwork, vector-friendly edges. Composition/framing: compact square, centered symbol occupying approximately 85% of the canvas. It must read cleanly at 44–56px in a website header. Color palette: a single flat deep evergreen, #0B5136. Text: none. Constraints: no words, no letters, no small details, no scenery, no gradients, no shadows, no mockup, no texture. One symbol only.

## September 17 catalog update

See `content/catalog-policy.json`, `content/source-reviews/`, and `content/catalog-review.json`. The reviewed catalog contains75 models; all body lengths are at most66ft and all documented areas at least720sqft. Numeric IDs from earlier qualified listings are retained. Retired IDs are rejected for new inquiries, while stored earlier inquiries retain their home name. Prices identify required packages, listed surcharges and selected quote options.

New-home listings include six months free lot rent and regular rent of $550/month. The owned-home delivery/setup offer is main-page-only, with a distinct persisted inquiry intent. Exact manufacturer tours load on demand with a WebGL support fallback. Shared documents remain grouped by their applicable model/series; PDF, image and workbook actions use accurate labels.

September 17 QA: catalog gate75/75;1,152 image files verified;68 unique local resources/PDF page targets checked;16 backend and6 inquiry-interface checks. Desktop/390px gallery and document interactions,320px navigation and no-overflow checks passed. A synthetic local mobile moving inquiry saved successfully. Third-party panorama playback remains unverified in this WebGL-disabled browser; the supported fallback was exercised. The live authenticated owner session was not exercised.

 
## Interaction repair verification — September 17, 2026
Supported tours mount when home details open, without moving initial scroll position.
Matterport embeds request immediate playback; unsupported 3D browsers retain an explicit fallback.
Floor-plan actions scroll and focus the gallery. Comparison feedback lives inside the home dialog,
with an explicit view action and a useful one-home state. Only one modal is open at a time.

Browser checks covered desktop and 390px mobile: automatic tour fallback, floor-plan decoding
and visibility, gallery arrows, one/two-home comparison, removal, quote and financing handoffs,
visit intent, lot selection, filters/reset/sort/load-more, menu, privacy and drone image viewer.
No broken in-page anchor targets were found. Backend and inquiry regression suites passed.
The cloud browser lacks WebGL, so embedded-player construction/autoplay and fallback were also
tested through scripts/verify-tours.cjs; a live 3D walkthrough was not claimed.
Third-party lender applications, phone/email apps and authenticated owner UI were not submitted
or exercised as customers. Backend owner authorization and update behavior are covered by tests.


## September 18 release — applying the master brief

### Current experience

The first screen now presents buying, long-term renting and moving an owned home as three distinct choices. The actual drone photograph and original drawing remain full width and uncropped near the start. A restrained evergreen/white system, compact navigation, clearer rental pricing, a horizontal desktop lot preference panel and larger interaction targets replace repetitive presentation. The established pine/home emblem is retained. At phone widths the form and cards stack deliberately, and comparison and contact bars no longer compete.

Inquiry purpose is visible above the contact fields. A central preparation operation preserves contact details while reopening a fresh request after success, resets consent for the new submission, clears incompatible rental or moving selections, and keeps home-financing context coherent. Rental confirmations show the correct bedroom rate and rental next steps; owned-home confirmations describe the review of the move. Neither sends renters/movers toward a purchase loan. The phone requirement label changes with the reply preference. A server check rejects an owned-home move carrying an unrelated purchase model.

Every model has a copyable direct link using `?home=<model-id>#homes`; opening the link reveals the exact home. Existing automatically mounted supported tours, image retry/decode handling, floor-plan focus, one-to-three-home comparison and model-specific resources remain intact. Tours remain third-party content and are not bundled in exports.

The owner inbox now filters by Buying & visits, Rentals, Moving an owned home, and Other inquiries. Filtering is server-side, applies to counts and pagination, and retains existing authorization, bound queries and concurrency protections. Existing leads and database migrations are unchanged.

### Current verification evidence

- The catalog gate passes all 75 current records against the maintained evidence and local asset mappings. This release does not claim a new visual reread of every source brochure.
- 20 backend checks pass against real transpiled handlers with isolated SQLite: persistence, duplicate/revised retries, rate limits, home/lot/intents, moving and rental separation, owner authorization, stale edits, changed availability, filtering and pagination.
- 8 inquiry interface checks pass, including network/timeout failure recovery and context-specific confirmations.
- The tour harness passes automatic mounting, no initial auto-scroll, reuse, invalid selection, supported embed construction and unsupported-3D fallback.
- Browser preview checks: desktop, 768px, 390px and 320px frames; no page overflow in inspected widths; original plan decoded at 2868×1320; mobile floor plan decoded; one/two-home comparisons; model-to-financing handoff after rental selection; purchase-to-moving transition; rental-to-lot transition; two synthetic rental requests saved through the real local API; correct confirmations; new inquiry after success; copied model link reopened its exact home; mobile navigation; zero-interest and invalid-down-payment calculator cases.
- Static checks: unique HTML IDs, valid in-page anchor targets, referenced page assets, JavaScript syntax and catalog resources.
- No production customer records or third-party applications were used for tests. Temporary preview routes and local test data are excluded from the release.

The browser did not provide WebGL, so a live external 3D walkthrough remains unverified; provider fallback was tested. An authenticated owner browser session, external lender applications, real traffic conversion lift, comprehensive screen-reader conformance and field Core Web Vitals have not been measured by this release. No zero-bug or simulated-million-customer claim is made.

### Operations and source of truth

| Item | Authoritative location / action |
|---|---|
| Home specifications, media, prices and documents | `content/models.json`, supported by `content/source-reviews/`, `catalog-review.json` and asset provenance records |
| Eligibility screen | `content/catalog-policy.json` and `scripts/verify-catalog.mjs`; review changes against source documents |
| Availability | Owner `/manage` → Lot availability; verify physical lot IDs against original drawing before changing statuses |
| Inquiry review | Owner `/manage` → Inquiries; use inquiry-type and stage filters, then save follow-up notes |
| Preferred lenders | `content/lenders.json`; confirm current contacts before updates |
| Rates and offer copy | `content/template.html` and context-specific copy in `content/site.js`; update both purchase/rental summaries and run the test suite |
| Styles and layout | `content/site.css`; regenerate `content/index.html` using the assembler |
| Build and deployment | Existing Sites workflow, pnpm lock and D1 binding; never deploy a hand-edited generated HTML without corresponding source |

Approved rates are $550/month regular lot rent, $1,100/month for two-bedroom rentals and $1,300/month for three-bedroom rentals. Six free months apply to new-home purchases and approved owned-home moves; the latter also includes delivery and all setup costs. Rentals have no inferred free-rent promotion. Rental availability, deposit, utilities and included charges must be confirmed. Section 8 welcome copy is not a guarantee of unit approval or voucher coverage.

All lot statuses default to unconfirmed unless the owner supplies current availability. The 66-foot catalog length cap and documented 720-square-foot minimum do not guarantee placement on every lot. Displayed actual and nominal widths differ by manufacturer, including TRU's documented 13′2″ width; confirm the owner's nominal-width interpretation and actual placement before a final home quote. No 67–68-foot model was added.

There are no connected email/SMS/CRM alerts. Management must review the inbox regularly and use the supplied contact details to reply. The website does not promise a response deadline or a confirmed appointment. Analytics and statistically powered A/B tests require real traffic and an approved measurement plan; none is represented as completed.
