# Crown Head Spa Website — Work Log

Running log of changes made to the public website, newest entry on top.

---

## 2026-09-18 — Updated branch hours to 1PM–10PM for both branches

**Requested by:** User — Biñan and Calamba branches are now both open
daily from 1PM to 10PM (Biñan's hours moved from 10AM; Calamba's start
time moved from 12PM).

- Updated the shared footer hours line across every page
  ([index.html](index.html), [about.html](about.html),
  [services.html](services.html), [branches.html](branches.html),
  [gallery.html](gallery.html), [promos.html](promos.html),
  [testimonials.html](testimonials.html), [contact.html](contact.html),
  [careers.html](careers.html), [book.html](book.html),
  [privacy.html](privacy.html), [head-spa-binan.html](head-spa-binan.html),
  [head-spa-calamba.html](head-spa-calamba.html)) to
  "Biñan open daily 1PM–10PM · Calamba open daily 1PM–10PM".
- [branches.html](branches.html): updated each branch card's hours line
  to "Open daily, 1:00 PM – 10:00 PM".
- [contact.html](contact.html): updated the FAQ hours line to match.
- [book.html](book.html): updated the "business hours" copy in the
  booking confirmation notice (both the inline note and the success
  message) to reflect 1PM–10PM.
- [head-spa-binan.html](head-spa-binan.html) and
  [head-spa-calamba.html](head-spa-calamba.html): updated the
  `HealthAndBeautyBusiness` JSON-LD `openingHours` to `Mo-Su 13:00-22:00`
  and the body copy hours line to match.

## 2026-09-12 — Local SEO: homepage copy + Biñan/Calamba landing pages

**Requested by:** User — forwarded SEO consultant suggestions (homepage
title/hero copy, plus a proposed `/head-spa-laguna` page) and asked for
analysis before implementing.

- [index.html](index.html): homepage `<title>`, meta description, and
  Open Graph/Twitter tags updated to `Crown Head Spa | Head Spa &
  Massage in Laguna` (dropped the consultant's "Best" claim — no
  reviews/ranking on the page to back an unsubstantiated superlative).
  Added a descriptive sentence under the existing "Your Royal
  Relaxation Awaits." hero headline naming the location and services,
  without replacing the branding copy.
- Instead of a single `/head-spa-laguna` page (which would have
  cannibalized keywords already targeted by [branches.html](branches.html)
  and the homepage), added two dedicated per-branch landing pages:
  [head-spa-binan.html](head-spa-binan.html) and
  [head-spa-calamba.html](head-spa-calamba.html), each with unique
  content, its own title/meta/OG tags, and `HealthAndBeautyBusiness`
  JSON-LD for its address/phone/hours.
- [branches.html](branches.html): added an internal link from each
  branch card to its new head-spa-{branch} landing page.
- Added [sitemap.xml](sitemap.xml) and [robots.txt](robots.txt) (none
  existed before) so the new pages get crawled/indexed.
- [firebase.json](firebase.json): added the two new page routes to the
  no-cache header list, and excepted `robots.txt` from the `*.txt`
  ignore rule so it actually deploys.

**Status:** Deployed to production (`crownheadspa.web.app`).

---

## 2026-09-08 — Comfort Treat poster swapped to updated design

**Requested by:** User — sent a revised Comfort Treat poster (graham
crackers with chocolate-dipped pretzel sticks, "soft marshmallows and
crispy graham crackers" copy) to replace the first version.

- [images/promo-comfort-treat.jpg](images/promo-comfort-treat.jpg):
  replaced in place with the new poster, same encoding (600×900 JPEG).
- [book.html](book.html): alt text and the sr-only dialog heading
  updated to match the new poster's wording ("soft marshmallows and
  crispy graham crackers" instead of "marshmallows and graham
  crackers" / "crunchy graham crackers, and sweet marshmallow bites").

**Status:** Deployed to production (`crownheadspa.web.app`).

---

## 2026-09-07 — Comfort Treat promo popup on booking page

**Requested by:** User — wants the new "Comfort Treat" poster (hot
chocolate with marshmallows and graham crackers) to pop up on the booking
page, the same way the extended opening rates promo did before.

- Re-added the promo popup pattern (markup/CSS/JS) that was removed on
  2026-08-31, now pointing at the new poster.
- [images/promo-comfort-treat.jpg](images/promo-comfort-treat.jpg): new
  poster, re-encoded from the 2.2 MB source PNG to a 600×900 JPEG
  (~166 KB).
- [book.html](book.html): `#promoModal` markup restored, with alt text
  and an sr-only heading describing the Comfort Treat offer, and a CTA
  reading "Book Now & Treat Yourself".
- [css/style.css](css/style.css): `.promo-modal*` rules restored
  unchanged from the prior implementation.
- [js/main.js](js/main.js): `initPromoModal()` restored unchanged —
  opens once per browser session (`sessionStorage`), closable via the X,
  backdrop, Escape, or "Maybe later".
- Note: this repo also has other unrelated uncommitted work in progress
  (clean URLs, homepage hero redesign, WhatsApp chat option, booking
  form copy tweaks) spanning most pages. That work was left untouched
  and unstaged — only the promo popup's own hunks were committed here.

**Status:** Deployed to production (`crownheadspa.web.app`).

---

## 2026-09-01 — Booking page Service dropdown shows category

**Requested by:** User — wants each option in the booking form's Service
dropdown to show its category, e.g. `Crown Reset (25 mins) - Head Spa`,
`The Reset Duo (85 mins) - Combo`.

- [js/main.js](js/main.js): `buildServiceSelectHtml()` now appends
  ` - {category}` to each option's label when the live
  `getBookableServices` Cloud Function (CrownOS) returns one, matching
  the format above.
- [book.html](book.html): the built-in `#serviceOptionsTemplate` fallback
  (used if the live call fails) now carries the same `- Category` suffix
  for every option, sourced from the actual categories in CrownOS's
  Service Master List at the time of writing.
- Depends on a matching CrownOS change (`getBookableServices` now returns
  `category`) — see that project's own work log.

**Status:** Deployed to production (`crownheadspa.web.app`).

---

## 2026-09-01 — Service category tags, Kiddie Calm Deals section removed

**Requested by:** User — wanted each service on
[services.html](services.html) to show its category so clients can
identify it more easily, and asked to temporarily remove the Kiddie Calm
Deals section.

- [services.html](services.html): every service item's title now carries
  a small category tag — **Head Spa** (Pure Head Spa section), **Combo**
  (Head Spa + Massage Combos section), **Massage** (Pure Body Massage
  section) — matching the category naming used in CrownOS's List of
  Services (`Package` was recently renamed to `Combo` there too).
- Removed the **Kiddie Calm Deals** section (Little Crown Head Spa, Dad or
  Mom & Mini Duo, Family Calm Package) — "muna" (for now), per the user.
- [css/style.css](css/style.css): added `.service-category-tag`, a small
  pill next to each service title, styled distinctly from the existing
  `.badge` ("Most Popular") so the two don't read as the same thing.

**Note:** the homepage ([index.html](index.html)) still has a "Kiddie
Package" promo card linking to Services — not touched, since it wasn't
part of this request, but it now points to a page with no Kiddie section
on it. Flag if that should also come down.

**Status:** Deployed to production (`crownheadspa.web.app`).

---

## 2026-08-31 — Booking form field order and layout

**Requested by:** User — wanted the fields on the [book.html](book.html)
booking form arranged vertically in the same order a client actually
fills them out, so the two-column layout wasn't confusing.

- [book.html](book.html): reordered fields to Branch → Number of Guest →
  Name & Services → Preferred Date → Preferred Time → Contact Number →
  Email Address → Notes.
- [css/style.css](css/style.css): `.form-grid` and `.guest-row` forced to
  a single column at every screen width (previously two columns side by
  side above 640px/560px), so the fields read top-to-bottom instead of
  left/right pairs.
- [js/main.js](js/main.js): added explicit "Full Name" / "Service"
  labels to each guest row, since the shared `.guest-rows-header` (now
  hidden) no longer lines up with a single-column layout.
- Removed the promo popup modal (markup/CSS/JS) that used to show when
  the booking page opened — pre-existing uncommitted change picked up
  and shipped in the same deploy at the user's request.

**Status:** Deployed to production (`crownheadspa.web.app`).
