# Crown Head Spa Website — Work Log

Running log of changes made to the public website, newest entry on top.

---

## 2026-09-19 (16) — Payday Sale promo: Number of Guests + a service per guest

**Requested by:** User — after Name, ask for Number of Guests; list Guest 1…N beside a services dropdown for each.

- [payday-promo.html](payday-promo.html) / [js/payday-promo.js](js/payday-promo.js): the single Services field and Number of Companions are replaced by **Number of Guests** (1–4, required) and, under it, a "Guest 1 … Guest N" row per guest, each with its own Payday service dropdown (same struck-out original price format). Tapping the calendar needs the guest count and every guest's service first. Each guest's card is drawn at their own service length ("G1"…"G4", different heights), all starting at the chosen time on separate beds — found with a small backtracking search, and the hour is only accepted if every guest fits. Changing guests/services clears the picked time. The order sends `guests: [{serviceName}]` and the previewed `beds` to `submitPaydayVoucherOrder`, which re-checks and holds each bed for its own service length.
- [css/style.css](css/style.css): `.promo-guest-row` layout (label beside dropdown).

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (15) — Payday Sale promo: "Order Voucher" with a 1-hour hold + countdown

**Requested by:** User — the button becomes **Order Voucher**; the chosen slot is held for 1 hour (countdown from 59:59) and shown to whoever opens the page; unplotted holds expire and free the beds again.

- [payday-promo.html](payday-promo.html) / [js/payday-promo.js](js/payday-promo.js): button renamed; submit now calls the new `submitPaydayVoucherOrder` Cloud Function (`Income Report/functions/index.js`) with the service, time, chosen bed, companion count, email and notes instead of `submitBookingRequest`. The calendar draws each held stretch as an amber "On hold" card with a live mm:ss countdown (new legend entry), counts held time as unavailable for picking, refreshes when a timer ends, and re-polls every 30 s (not while the visitor is mid-pick). After a successful order the same branch/date stays on screen so the client sees their own held slot counting down; a "slot taken" reply reloads the grid.
- [css/style.css](css/style.css): `.promo-grid-held` / `.promo-hold-timer`.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (14) — Payday Sale promo: service duration + companion cards preview on the calendar

**Requested by:** User — picking a 90-min service with 2 companions should show the 90-minute card on the grid, plus companion cards created automatically.

- [js/payday-promo.js](js/payday-promo.js): the service and companion count must be chosen before tapping a time. A tap now previews a card the full length of the service on one bed ("You") and one matching card per companion ("C1", "C2", "C3") on the nearest other open beds at the same time. A time is only accepted if every card fits — each bed free for the whole duration and inside its window — otherwise a message explains, and it tries the next hour first. Changing the service or companions clears the picked time. Service options now carry their duration (`data-duration`).
- [css/style.css](css/style.css): companion cards use a different colour from the main card.
- [payday-promo.html](payday-promo.html): hint copy updated.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (13) — Payday Sale promo: required email + number of companions (max 3)

**Requested by:** User — email is now required (the voucher is sent there), and a companion count (number only, max 3 = 4 guests, all branches) must be chosen before a time can be picked on the calendar.

- [payday-promo.html](payday-promo.html): Email is required (with error + "voucher will be sent here" hint); new required **Number of Companions** select (None / 1 / 2 / 3).
- [js/payday-promo.js](js/payday-promo.js): tapping the calendar without a companion count shows a prompt and scrolls to that field. With one chosen, a time is only picked if that hour has at least as many open beds as guests (1 + companions), otherwise a message says how many are open; changing the count clears an already-picked time. On submit the notes read `[Payday Sale Promo] Guests: N (1 + K companions)…`, so staff see the group size in CrownOS (companion names aren't collected — `submitBookingRequest` isn't changed).

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (12) — Payday Sale promo: original price struck out beside the Payday price

**Requested by:** User — in the Services list, show the original price struck out next to the Payday Sale price.

- [js/payday-promo.js](js/payday-promo.js): each option now reads `Service (mins) - Category — ~~₱Regular~~  ₱Payday`. `<option>` text can't be styled, so the strikethrough uses combining strikethrough characters (U+0336), which render in every native dropdown including phone pickers. Only shown when the Regular price is higher than the Payday price.
- `getPaydaySaleServices` (`Income Report/functions/index.js`) now also returns `regularPrice` (nothing else new).

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo, and `functions:getPaydaySaleServices`.

## 2026-09-19 (11) — Payday Sale promo: "Preferred Treatment" renamed to "Services"

**Requested by:** User — rename the field; only services ticked Available for Payday in CrownOS are listed (already the case since the previous entry).

- [payday-promo.html](payday-promo.html) / [js/payday-promo.js](js/payday-promo.js): label, placeholder, error and status messages now say "Services" / "service" instead of "Preferred Treatment" / "treatment".

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (10) — Payday Sale promo: treatments now come from CrownOS

**Requested by:** User — only services marked "Available for Payday" (with their Payday Sale price) should be offered.

- [payday-promo.html](payday-promo.html): the hardcoded treatment list is gone; the dropdown starts as "Loading treatments…".
- [js/payday-promo.js](js/payday-promo.js): `initPromoServices()` fills it from the new `getPaydaySaleServices` Cloud Function (`Income Report/functions/index.js`) — name, duration, category and ₱ Payday price per option. Shows a message if there are none or the call fails.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (9) — Payday Sale promo: Preferred Time input no longer overflows its box

**Requested by:** User — the Preferred Time input box extended past the form border on phone.

- [css/style.css](css/style.css): `input[type="time"]` now gets the same treatment as `input[type="date"]` (`appearance: none`, `min-width: 0`, `max-width: 100%`) — iOS Safari ignores `box-sizing` on native time inputs, same bug already fixed for the date field.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (8) — Payday Sale promo: calendar fits the screen width

**Requested by:** User — 50% was too small; instead make the grid fit a phone's width with no sideways scrolling.

- [css/style.css](css/style.css): bed columns are now `minmax(0, 1fr)` so the grid always fills the card width (no horizontal scroll); tighter time column/padding under 560px.
- [js/payday-promo.js](js/payday-promo.js): hour height set to 54px (`PX_PER_MIN` 0.9), between the original 72px and the too-small 36px.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (7) — Payday Sale promo: calendar cells shrunk to 50%

**Requested by:** User — make each calendar box 50% smaller, horizontally and vertically.

- [js/payday-promo.js](js/payday-promo.js): `PX_PER_MIN` 1.2 → 0.6 (hour row 72px → 36px). The bed's From–To window moved into the header's tooltip and the "Occupied" label into a tooltip, since neither fits the smaller cells.
- [css/style.css](css/style.css): bed columns fixed at 34px (was ~64px), time column 62px, smaller header/marker text.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (6) — Payday Sale promo: form moved above the calendar

**Requested by:** User — swap the positions so the booking form is on top.

- [payday-promo.html](payday-promo.html): order is now hint → booking form → Branch/Date + calendar; hint copy says "the calendar below". Clicking the calendar still fills Preferred Time and scrolls (now up) to the form.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (5) — Payday Sale promo: 1-hour click steps + auto-scroll to form

**Requested by:** User — clicking should snap to the exact hour, then jump to the form.

- [js/payday-promo.js](js/payday-promo.js): `attachPicking()` now snaps to the hour (moves to the next free hour if the clicked hour is taken), marker covers the full hour, and it smooth-scrolls to `#promoBookingForm` after a pick.
- [css/style.css](css/style.css): `scroll-margin-top` on the form so the sticky header doesn't cover it; marker height now set in JS.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (4) — Payday Sale promo: click the calendar to fill in Preferred Time

**Requested by:** User — clients should click the calendar and have the form's Preferred Time fill in automatically.

- [js/payday-promo.js](js/payday-promo.js): open stretches of a bed's column are now clickable (`attachPicking()`). A click snaps to the nearest 10 minutes, ignores occupied time, times outside the bed's window, past times today, and blocked dates, then fills `#promoFormTime`, drops a gold marker on the grid and shows "Selected … added to the form". The server still re-checks capacity on submit.
- [payday-promo.html](payday-promo.html): hint copy changed from "for reference only" to "tap an open spot".
- [css/style.css](css/style.css): pointer cursor/hover on open columns and `.promo-grid-pick` marker.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (3) — Payday Sale promo: calendar restyled to match CrownOS grid

**Requested by:** User — make the public calendar look like the CrownOS Payday Sale grid.

- [js/payday-promo.js](js/payday-promo.js): replaced the one-bar-per-bed rows with a CrownOS-style timeline grid — navy bed header cells (Bed N + From–To window, red when a bed isn't offered), hour labels down the side, hourly gridlines, grey striped "Occupied" blocks, hatched shading outside a bed's window. Still view-only; same `getPaydaySaleAvailability` data.
- [css/style.css](css/style.css): new `.promo-grid*` rules replace the old `.promo-bed-bar` ones; scrolls sideways on narrow screens.

**Deployed:** `firebase deploy --only hosting` → https://crownheadspa.com/payday-promo.

## 2026-09-19 (2) — Payday Sale promo: bed calendar now shows on blocked dates too

**Requested by:** User — wanted guests to be able to view the calendar even when a date is blocked (before, a blocked date showed only a message and no calendar).

- [js/payday-promo.js](js/payday-promo.js): a blocked date now still renders the per-bed bars, with the "not available" message and reason above them ("Here's the schedule for reference"). Only an empty bed list falls back to message-only.
- [css/style.css](css/style.css): new `.promo-bed-list-blocked` dims/greys the bars on blocked dates.

**Deployed:** `firebase deploy --only hosting` → live at https://crownheadspa.com/payday-promo.

## 2026-09-19 — New unlisted page: Payday Sale promo calendar

**Requested by:** User — wanted a special page for the Payday Sale campaign, reachable only by
whoever is given the direct link (not linked from the site's own nav/footer, and kept out of
search results). Shows a potential client which beds are open, calendar-type, view-only — then
lets them send a simplified booking request, with occupied beds reflecting real bookings.

- New page [payday-promo.html](payday-promo.html) — same site header/footer/chat-widget as every
  other page (so it doesn't feel broken if someone lands on it), but no nav link anywhere points
  to it, `<meta name="robots" content="noindex, nofollow">` in its `<head>`, a matching
  `Disallow: /payday-promo` added to [robots.txt](robots.txt), and it's left out of
  [sitemap.xml](sitemap.xml).
- Body has two parts: (1) a Branch selector + Date picker (prev/next day arrows, defaults to
  today) above one availability bar per bed — green for open, grey for occupied, calling the new
  `getPaydaySaleAvailability` Cloud Function (see `Income Report/functions/index.js`) on every
  branch/date change. Purely a view — no click-to-select, matching the request that this only be
  a schedule *view*, not an editable calendar. (2) A simplified booking-request form below it
  (Name, Preferred Treatment, Preferred Time, Mobile, Email, Notes — no guest rows/companions,
  unlike `book.html`'s full form) that calls the same `submitBookingRequest` Cloud Function
  `book.html` itself uses, so a request lands in CrownOS's normal Booking Requests review exactly
  like any other public-website request — just with a `[Payday Sale Promo]` tag prepended to its
  notes so staff can tell it apart at a glance.
- New [js/payday-promo.js](js/payday-promo.js) — self-contained, doesn't touch or depend on
  `book.html`'s own form logic in [js/main.js](js/main.js) (different element ids, so
  `main.js`'s `initBookingForm()` simply no-ops on this page); `main.js` is still loaded
  alongside it for the shared header/footer/cookie-consent/chat-widget behavior every page gets.
- New CSS block in [css/style.css](css/style.css) (`.promo-calendar-card` and friends) for the
  Branch/Date controls, the legend, and each bed's availability bar.

**What wasn't touched:** `book.html`'s own booking form, `getAvailableSlots`, and
`submitBookingRequest` — the promo page reads a brand-new Cloud Function for its calendar and
calls the *existing* `submitBookingRequest` unmodified for its form.

**Deployed:** `firebase deploy --only hosting` → live at https://crownheadspa.com/payday-promo
(no nav link, but reachable directly). The backing Cloud Function was deployed separately from
`Income Report` via `firebase deploy --only functions:getPaydaySaleAvailability`.

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
