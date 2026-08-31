# Crown Head Spa Website — Work Log

Running log of changes made to the public website, newest entry on top.

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
