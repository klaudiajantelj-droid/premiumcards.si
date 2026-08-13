# premiumcards.si — setup & publication guide

## ⚠ Publication blockers — real data still missing

The site **must not go live** until every item below is filled in with real,
verified information. Nothing here is invented; these are all placeholders.

| Where | Placeholder | Status |
|---|---|---|
| `index.html` → `SELLER_CONFIG` | `SELLER_NAME` | ✅ Filled in: `KLAJANI s.p.` |
| same | `SELLER_TAX_ID` | ✅ Filled in: `57306443` |
| `privacy.html`, `terms.html`, `impresum.html` | multiple `[VSTAVITE …]` / `[INSERT …]` spans | ✅ Legal name, address and tax ID are filled in everywhere. ⚠ Registration ID (matična številka) is **not currently displayed** at the requester's instruction — but no confirmation exists that it is actually unnecessary for legal/AJPES purposes. Treat this as unresolved, not settled; verify with your accountant/lawyer before publishing. |
| all three legal pages | "OSNUTEK / DRAFT" banner | Remove only after a lawyer has reviewed all three pages |

**Complete list of every open legal item, in one place** (also referenced from
`impresum.html`/`terms.html` themselves):

- [ ] Whether matična številka (AJPES registration ID) should in fact appear
      on the legal notice / terms of sale — currently omitted, not confirmed
      unnecessary
- [ ] Official full AJPES-registered company name (see note below —
      `KLAJANI s.p.` may not be the complete legal form)
- [ ] Date of last legal review/update for `privacy.html` / `terms.html`
- [ ] Data retention period for accounting records (confirm exact figure
      with your accountant)
- [ ] Confirmation of the Supabase server/region location (for the privacy
      policy's data-transfer statement)
- [ ] Complaint period for printing defects (terms of sale §6)
- [ ] Right-of-withdrawal clause for custom-made goods (terms of sale §4)
      — **lawyer sign-off required**, wording currently only a draft
- [ ] Competent court / dispute-resolution clause (terms of sale §8,
      impresum.html)

**Note on `SELLER_NAME`:** set to `KLAJANI s.p.` per your instruction. Slovenian
sole-proprietor (s.p.) registrations with AJPES typically require the
owner's personal name as part of the official registered name (e.g. "Ime
Priimek s.p." with "KLAJANI" as a registered trade name/firma used
alongside it). If your AJPES registration differs from the simple
`KLAJANI s.p.` form used here, update `SELLER_CONFIG` and `impresum.html`
accordingly before publishing.

**Do not remove the draft banners or publish the legal pages until a
lawyer has signed off**, in particular the right-of-withdrawal clause in
`terms.html` — this is genuinely a legal judgment call that depends on
exact wording of current Slovenian consumer-protection law, not something
this document can respons­ibly finalize on its own.

---

## What's in this delivery

```
index.html                              — the site (SI/EN/DE/ES)
privacy.html                            — privacy policy (draft, SI/EN/DE/ES)
terms.html                              — terms of sale (draft, SI/EN/DE/ES)
impresum.html                           — legal notice / Impresum (draft, SI/EN/DE/ES)
supabase-setup.sql                      — database schema + storage + RLS
supabase/functions/submit-order/index.ts — Edge Function (server-side logic)
screenshot-desktop.jpg                  — full-page desktop preview (see note below)
screenshot-mobile.jpg                   — full-page mobile preview (see note below)
README.md                               — this file
```

**Screenshot caveat, stated plainly:** both screenshots were rendered with
`wkhtmltoimage` inside a sandboxed environment that cannot reach
`fonts.googleapis.com` or the Supabase JS CDN. That means: layout, section
order, spacing, and the configurator/form structure are real and accurate —
but the typefaces shown are a system fallback, not Fraunces/Archivo/IBM
Plex Mono, and the page renders in its "backend not configured" state
(matching reality, since no real Supabase credentials exist yet). Treat
these as structural/layout proofs, not final pixel-accurate marketing
screenshots. Take your own once real fonts and a configured backend are in
place.

---

## 1. Supabase project setup

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste the full contents of `supabase-setup.sql` → Run.
   This creates:
   - `orders`, `order_people`, `order_files` tables
   - a **private** Storage bucket `order-uploads`
   - Row Level Security with **no public read/write access** — the only way
     data gets in is through the Edge Function (see below).
3. **Project Settings → API** → note down:
   - `Project URL`
   - `anon` / `public` key (safe to put in the browser)
   - `service_role` key (⚠ **never** put this in the browser — Edge Function only)

## 2. Deploy the Edge Function

You'll need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed locally.

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy submit-order
```

Set the function's environment variables (**Project Settings → Edge Functions**, or via CLI):

```bash
supabase secrets set ALLOWED_ORIGIN=https://premiumcards.si
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to
every Edge Function by Supabase — you don't set those yourself.

## 3. Configure the frontend

Open `index.html`, find this block near the end of the file:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

Replace both with the real values from step 1. **Only ever use the anon key
here — never the service_role key.**

## 4. Fill in `SELLER_CONFIG`

Near the closing `</footer>` tag in `index.html`, replace every
`[INSERT ...]` placeholder in `SELLER_CONFIG` with real, verified company
data (see the blockers table above).

## 5. Test before publishing

Minimum checklist (see also §7 below for what's already been verified):

- [ ] Submit a real test order end-to-end and confirm it appears in
      **Table Editor → orders** (and `order_people`, and `order-uploads` in
      Storage if you attached a file)
- [ ] Submit the same form twice quickly with browser dev tools open —
      confirm the second attempt is rejected or deduplicated (idempotency)
- [ ] Try submitting fewer than ~3 seconds after page load — confirm it's rejected
- [ ] Try a disallowed file type / an oversized file — confirm both the
      browser and the Edge Function reject it
- [ ] Confirm the honeypot field is truly invisible and untouched by a real
      user filling the form normally
- [ ] Load the page with Supabase **not** configured (leave the placeholder
      keys in) and confirm the submit button is disabled with a visible
      dev-mode notice, not a fake success message

## 6. Cookie banner

The site currently uses **no analytics, advertising, or third-party tracking
cookies** — only `localStorage` for remembering the chosen language, which
does not legally require consent. **No cookie banner has been added**,
because adding one for a site that doesn't need it would itself be
misleading. If you later add analytics (e.g. Plausible with cookies, GA,
Meta Pixel, etc.), a consent banner becomes necessary before those scripts
load — build that when you actually add such a tool, not before.

---

## 7. What has and hasn't been independently verified

**Actually run and verified in this delivery:**
- **Hero business cards reworked for material realism.** This was done
  entirely in CSS, not as a photograph — no image generation or product
  photography tool is available in this environment, so rather than
  fabricate a fake "photo," the honest choice was to push the CSS as far
  as it credibly goes and say so plainly. Changes: an accurate 3mm-radius
  corner (12px at this card's 4px/mm scale), a visible material-thickness
  edge along the bottom of the front card, a subtle SVG-noise paper-grain
  texture for the matte cardstock look, and — the main change — the UV
  gloss no longer sweeps across the whole card (which read as shiny
  plastic). It's now confined to the wordmark and rule line only, using
  a `background-clip: text` gradient that catches light on a slow,
  staggered cycle per card, so the coated area stays glossy and
  everything else stays flat matte. **Caveat on the screenshots below:**
  they're rendered with `wkhtmltoimage`, an old WebKit engine that
  captures a single static frame of an animated gloss — so the shine may
  or may not be mid-sweep in the screenshot. All the CSS techniques used
  (`background-clip: text`, CSS custom properties, `perspective`) have
  solid support in real modern browsers (Chrome, Firefox, Safari) that
  your visitors will actually use; only this particular offline preview
  renderer is dated. Verify the live shine yourself in a real browser
  before relying on the screenshot alone.
- **The digital-vs-offset comparison section was fully rewritten** with
  the new headline, intro, two comparison lists (4 digital points, 5
  premium-card points), and closing line, in all four languages. One
  line in the German bullet list in the original request text
  ("Ne vermittelt Material, Haptik oder Verarbeitungsqualität") mixed
  German into what should have been the Slovenian list — that looked
  like a copy/paste slip, so it was corrected to proper Slovenian
  ("Ne prenese občutka za material ali kakovost izdelave") rather than
  reproduced as-is, consistent with fixing the same kind of
  language-mixing bug elsewhere in this project.
- Confirmed via count that both changes stayed content-only: `t-si`,
  `t-en`, `t-de`, `t-es` are still perfectly balanced (194 each, up from
  188 — the +6 accounts for the comparison section's 2 new digital
  bullets, 3 new premium bullets, and 1 new closing line). The pricing
  formula, configurator, and all four price test cases were re-run after
  these changes and are unaffected.
- **All four languages (SI/EN/DE/ES) are present throughout `index.html`.**
  Every one of the 188 SI/EN text pairs — header, hero, brand message,
  quality section, full configurator (all 4 service options with their
  "included" lists), comparison section, all 5 process steps, all 14 FAQ
  entries, the entire request form, footer, and mobile sticky CTA — has
  matching DE/ES translations, as do all JS-generated strings (design
  labels, validation errors, VAT-mode text, success/error messages).
  Verified by count: `t-si`, `t-en`, `t-de`, `t-es` each appear exactly
  188 times in the final file — no gaps.
- **`privacy.html`, `terms.html` and `impresum.html` now also cover all
  four languages** — each has four `lang-block` sections (SI/EN/DE/ES).
  The German and Spanish sections are full translations of the same
  content as the Slovenian/English ones, using the same real data
  (KLAJANI s.p., tax ID 57306443) and the same placeholder markers
  (translated into each language) for the genuinely open legal items —
  nothing was invented to fill a gap.
- **The dynamic card count in the CTA is fixed and verified.**
  `totalCards = people × 500` is computed live and shown correctly in
  all four languages, with the correct thousands separator per language:
  a dot for SI/DE/ES, a comma for EN. This was tested by actually
  driving the page in `jsdom` through 1, 3, and 20 people and reading
  the rendered CTA text back — confirmed exact matches for all the
  required examples: "111 € / 500 vizitk" / "€111 / 500 cards" /
  "111 € / 500 Karten" / "111 € / 500 tarjetas" for 1 person; "422 € /
  1.500 vizitk" / "€422 / 1,500 cards" / "422 € / 1.500 Karten" / "422 €
  / 1.500 tarjetas" for 3 people with premium redesign; "10.000 vizitk" /
  "10,000 cards" / "10.000 Karten" / "10.000 tarjetas" for 20 people.
  A previous version used `toLocaleString('sl-SI')`, which was found to
  be unreliable in testing (it rendered 1500 with no separator at all
  while rendering 10000 correctly) — replaced with a hand-written,
  environment-independent formatter.
- Language switching was exercised in `jsdom` by actually clicking
  through all four languages in sequence and reading back
  `document.documentElement`'s `data-lang`/`lang` attributes after each
  — all four switched correctly with zero console errors. The language
  dropdown was also confirmed to contain exactly `['si', 'en', 'de',
  'es']`, nothing more or less.
- **Fixed a real `ReferenceError`**: `updateConfig()` was called before
  `const peopleFieldsList` was declared, and `updateConfig()` → 
  `renderPeopleFields()` reads that variable. Reordered so
  `peopleFieldsList` and `renderPeopleFields()` are both defined before
  the first `updateConfig()` call. Verified with `jsdom` (a real,
  scripted DOM environment, not just re-reading the code): the page now
  loads with zero console errors, and stays error-free through 5×
  clicking the people-count "+" button, switching order type back and
  forth, and clicking through all four design-service options.
- **`VAT_MODE` is genuinely wired everywhere**, not just in the live
  calculator. Verified by actually flipping `VAT_MODE` to `'registered'`
  in a test run and reading the rendered DOM: hero shows €135.42 (gross)
  for a €111 net first order, the matching service-option card shows the
  same €135.42 with a net/VAT breakdown, and — the specific failure mode
  flagged in an earlier review — hero and service card **agree** with
  each other. A second run confirmed `'exempt'` mode (the real current
  status) still shows the plain €111/€99 figures unchanged.
- The FAQ accordion's `aria-expanded`/`hidden` behaviour was exercised
  via simulated clicks in `jsdom`, not just inspected as markup.
- The pricing formula was executed against the exact test cases requested
  (1 person/first order → €111, 1 person/repeat → €99, 3 people/premium
  redesign → €422, 3 people/repeat → €297, 20 people in both order types)
  — all passed.
- Submitting with no Supabase configured was tested directly: the submit
  button is disabled and a visible dev-mode notice appears — confirmed
  there is no path to a false success message.
- The client-side `validateForm()` logic was re-implemented and executed
  standalone against 12 scenarios, including every required negative case:
  missing required file, incomplete team data (5 people selected, only 1
  submitted), missing billing address, repeat order without a previous
  order number, missing consent, "new-logo" missing its brief fields, and
  the corresponding positive cases. All 12 passed after one test-case
  authoring mistake on my part was caught and fixed (a repeat-order test
  case was missing its own required previous-order-number field — the
  validation logic was correct, the test data wasn't).
- `index.html`'s inline `<script>` blocks pass `node --check` (valid
  JavaScript syntax) after every change in this round.
- `supabase/functions/submit-order/index.ts` was type-checked with `tsc`;
  the only remaining diagnostics are expected "cannot find name `Deno`" /
  "cannot find module `esm.sh`" messages, because this sandbox has no local
  Deno type definitions — that is a tooling limitation, not a code error.
  It has **not** been run against a live Deno/Supabase Edge Runtime.
- A full-text search for the required forbidden strings was re-run against
  the final `index.html` — clean.
- Two full-page screenshots (`screenshot-desktop.jpg`, `screenshot-mobile.jpg`)
  were actually rendered with `wkhtmltoimage`, confirming real layout,
  section order, and mobile stacking — see the caveat above about fonts
  and backend state.

**Not verified — needs your own testing before go-live:**
- The Edge Function has not been deployed or exercised against a real
  Supabase project by anyone. Deploy it to a **test** project first and run
  through the checklist in §5 before pointing it at production.
- File upload is wired end-to-end in the code (browser reads the file →
  base64 → Edge Function decodes → uploads to the private bucket → records
  metadata), but this path has not been exercised against a live bucket.
- The screenshots confirm layout, not final typography (see caveat above)
  or interactive behaviour (sticky CTA bar on scroll, live price updates,
  dynamic person-field generation) — verify those by hand in a real browser.
- Rate limiting is a **basic** best-effort check (max 5 orders per email per
  10 minutes) queried against the `orders` table — it is not a dedicated
  rate-limiting service and won't stop a determined attacker rotating email
  addresses. Reasonable for this project's scale, not bulletproof.

---

## 8. Known scope gaps (not built in this pass)

- No admin dashboard — use Supabase's own Table Editor to review orders,
  or query directly (see the example view at the bottom of
  `supabase-setup.sql`).
- No email notifications on new orders yet. A natural next step is a
  Supabase Database Webhook on `orders` → an email service (e.g. Resend)
  — not included here to keep this delivery's scope contained.
