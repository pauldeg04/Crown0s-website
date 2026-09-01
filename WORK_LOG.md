# Crown Head Spa Website — Work Log

Running log of changes made to the public website, newest entry on top.

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
