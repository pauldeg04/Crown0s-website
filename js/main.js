/* Crown Head Spa — shared site behavior */

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initAccordions();
  initServiceCatalog();
  initCompanions();
  initBookingForm();
  markActiveNavLink();
  initGalleryLightbox();
  initBranchTabs();
  initGoogleReviews();
  initCookieConsent();
  initPromoModal();
  initFbChatWidget();
});

/* ==========================================================================
   Floating Messenger chat widget

   Toggle button in the corner opens a small menu with one m.me link per
   branch. Markup is repeated on every page, so this just wires the click
   handlers and closes the menu on an outside click or Escape.
   ========================================================================== */

function initFbChatWidget() {
  const widget = document.querySelector(".fb-chat-widget");
  if (!widget) return;

  const toggle = widget.querySelector(".fb-chat-toggle");
  const menu = widget.querySelector(".fb-chat-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!widget.contains(e.target)) menu.classList.remove("open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") menu.classList.remove("open");
  });
}

/* ==========================================================================
   Booking promo popup

   Opens when the booking page loads, once per browser session so guests who
   come back to the form aren't shown it again. Closed with the X button, the
   "Maybe later" link, the backdrop, or Escape. Only book.html carries the
   markup, so this is a no-op everywhere else.
   ========================================================================== */

const PROMO_MODAL_KEY = "crownPromoSeen";

function initPromoModal() {
  const modal = document.getElementById("promoModal");
  if (!modal) return;

  // sessionStorage throws in private-mode Safari, so a failed read just means
  // the popup shows — better than the page erroring out.
  try {
    if (sessionStorage.getItem(PROMO_MODAL_KEY) === "1") return;
  } catch (err) {
    /* storage unavailable — fall through and show it */
  }

  const card = modal.querySelector(".promo-modal-card");
  const closeBtn = modal.querySelector(".promo-modal-close");
  const dismissBtn = modal.querySelector(".promo-modal-dismiss");
  const cta = modal.querySelector("#promoModalCta");
  const lastFocused = document.activeElement;

  function open() {
    modal.hidden = false;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    modal.classList.remove("open");
    modal.hidden = true;
    document.body.style.overflow = "";
    try {
      sessionStorage.setItem(PROMO_MODAL_KEY, "1");
    } catch (err) {
      /* storage unavailable — the popup will simply show again next load */
    }
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (dismissBtn) dismissBtn.addEventListener("click", close);
  if (cta) cta.addEventListener("click", close);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) close();
  });

  // Keep tabbing inside the popup while it's open.
  modal.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = card.querySelectorAll("button, [href]");
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Small delay so the page paints first and the popup doesn't feel abrupt.
  setTimeout(open, 600);
}

/* ==========================================================================
   Cookie consent

   Nothing on this site tracks anyone yet, so today this bar only records a
   preference. It exists ahead of that because consent has to be asked BEFORE
   a tracking script runs, not after — wiring it in later would mean the first
   visitors were measured without being asked.

   When an analytics or advertising tag is added, load it from
   onConsentGranted() below and nowhere else. Putting the tag straight into the
   page would fire it on load regardless of what the visitor chose here.
   ========================================================================== */

const CONSENT_KEY = "crownCookieConsent";

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch (err) {
    /* Private browsing can throw on access. Treat it as "not asked yet" and
       leave the visitor untracked, which is the safe direction to fail. */
    return null;
  }
}

function storeConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch (err) {
    /* Nothing to do — the bar reappears next visit, which is preferable to
       assuming a consent we could not record. */
  }
}

/* The single place a tracking tag may be started from. */
function onConsentGranted() {
  /* No analytics or advertising tags are installed yet. */
}

function initCookieConsent() {
  const footerLegal = document.querySelector(".footer-legal");

  if (footerLegal) {
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "cookie-reset";
    reset.textContent = "Cookie settings";
    reset.addEventListener("click", () => showCookieBar(true));
    footerLegal.appendChild(reset);
  }

  const consent = readConsent();

  if (consent === "accepted") {
    onConsentGranted();
    return;
  }

  if (consent === "declined") {
    return;
  }

  showCookieBar(false);
}

function showCookieBar(reopened) {
  let bar = document.getElementById("cookieBar");

  if (!bar) {
    bar = buildCookieBar();
    document.body.appendChild(bar);
  }

  if (reopened) {
    bar.querySelector(".cookie-reopened").hidden = false;
  }

  /* Added hidden, then shown on the next frame so the bar animates in rather
     than appearing mid-paint on first load. */
  requestAnimationFrame(() => bar.classList.add("show"));
}

function buildCookieBar() {
  const bar = document.createElement("div");
  bar.id = "cookieBar";
  bar.className = "cookie-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Cookie choices");

  const text = document.createElement("p");
  text.innerHTML =
    "We use only what this site needs to work. With your permission we would " +
    "also like to measure how the site is used so we can improve it. " +
    "Declining changes nothing about how the site works for you. " +
    '<a href="privacy.html">Read our Privacy Policy</a>.' +
    '<span class="cookie-reopened" hidden> Choosing below replaces your previous answer.</span>';

  const actions = document.createElement("div");
  actions.className = "cookie-actions";

  const decline = document.createElement("button");
  decline.type = "button";
  decline.className = "btn btn-quiet";
  decline.textContent = "Decline";
  decline.addEventListener("click", () => {
    storeConsent("declined");
    hideCookieBar(bar);
  });

  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "btn btn-primary";
  accept.innerHTML = "<span>Accept</span>";
  accept.addEventListener("click", () => {
    storeConsent("accepted");
    onConsentGranted();
    hideCookieBar(bar);
  });

  actions.appendChild(decline);
  actions.appendChild(accept);

  bar.appendChild(text);
  bar.appendChild(actions);

  return bar;
}

function hideCookieBar(bar) {
  bar.classList.remove("show");
}

/* ==========================================================================
   Google reviews (testimonials page)
   Pulls both branches from the getGoogleReviews Cloud Function, which talks
   to the Google Places API server-side so the API key stays off this page.

   Google caps the API at five reviews per branch and gives no way to ask
   for more or to sort them by date, so the rating summary above the cards
   carries the real totals — five cards under "4.9 from 127 reviews" reads
   as a sample rather than as the whole story.

   Review text is written by the public, so every value from the response is
   set with textContent and never interpolated into innerHTML.
   ========================================================================== */
function initGoogleReviews() {
  const panels = Array.from(document.querySelectorAll(".branch-panel[data-branch]"));
  if (panels.length === 0) return;

  (async () => {
    try {
      if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
        throw new Error("Firebase not initialized");
      }

      const getGoogleReviews = firebase.functions().httpsCallable("getGoogleReviews");
      const result = await getGoogleReviews();
      const branches = (result.data && result.data.branches) || [];

      panels.forEach((panel) => {
        const branch = branches.find((entry) => entry.key === panel.dataset.branch);
        renderBranchReviews(panel, branch);
      });

      upgradeReviewLinks(branches);
    } catch (err) {
      console.warn("Could not load Google reviews:", err);
      panels.forEach((panel) => {
        setReviewsStatus(
          panel,
          "Reviews are taking a moment to load. You can read them on Google in the meantime."
        );
      });
    }
  })();
}

/* The "Leave a Review" buttons ship pointing at each branch's Google listing,
   which always works. When the branch data arrives it carries a place ID, so
   point them at Google's review composer instead — one fewer tap for a guest
   who is already willing to write something. */
function upgradeReviewLinks(branches) {
  const container = document.querySelector("[data-review-links]");
  if (!container) return;

  branches.forEach((branch) => {
    if (!branch.writeReviewUrl) return;
    const link = container.querySelector('a[data-branch="' + branch.key + '"]');
    if (link) link.href = branch.writeReviewUrl;
  });
}

function setReviewsStatus(panel, message) {
  panel.innerHTML = "";
  const status = document.createElement("p");
  status.className = "reviews-status";
  status.textContent = message;
  panel.appendChild(status);
}

function renderBranchReviews(panel, branch) {
  if (!branch || !Array.isArray(branch.reviews) || branch.reviews.length === 0) {
    setReviewsStatus(panel, "No reviews to show for this branch yet.");
    return;
  }

  panel.innerHTML = "";

  panel.appendChild(buildReviewsSummary(branch));

  const grid = document.createElement("div");
  grid.className = "reviews-grid";
  branch.reviews.forEach((review) => grid.appendChild(buildReviewCard(review)));
  panel.appendChild(grid);

  if (branch.mapsUrl) {
    const footer = document.createElement("div");
    footer.className = "reviews-footer";

    const link = document.createElement("a");
    link.className = "btn btn-outline";
    link.href = branch.mapsUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "See all reviews on Google";

    footer.appendChild(link);
    panel.appendChild(footer);
  }
}

function buildReviewsSummary(branch) {
  const summary = document.createElement("div");
  summary.className = "reviews-summary";

  if (typeof branch.rating === "number") {
    const score = document.createElement("span");
    score.className = "reviews-score";
    score.textContent = branch.rating.toFixed(1);
    summary.appendChild(score);
    summary.appendChild(buildStars(branch.rating));
  }

  const count = document.createElement("span");
  count.className = "reviews-count";
  count.textContent = branch.reviewCount === 1
    ? "1 Google review"
    : branch.reviewCount.toLocaleString() + " Google reviews";
  summary.appendChild(count);

  return summary;
}

/* Rounds to the nearest half star, the way Google's own summary does. */
function buildStars(rating) {
  const stars = document.createElement("span");
  stars.className = "reviews-stars";
  stars.setAttribute("aria-label", rating.toFixed(1) + " out of 5 stars");

  const rounded = Math.round(rating * 2) / 2;
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "review-star";
    if (rounded >= i) {
      star.classList.add("is-full");
    } else if (rounded >= i - 0.5) {
      star.classList.add("is-half");
    }
    star.textContent = "★";
    stars.appendChild(star);
  }

  return stars;
}

function buildReviewCard(review) {
  const card = document.createElement("article");
  card.className = "review-card";

  const head = document.createElement("div");
  head.className = "review-head";

  if (review.authorPhoto) {
    const photo = document.createElement("img");
    photo.className = "review-avatar";
    photo.src = review.authorPhoto;
    photo.alt = "";
    photo.loading = "lazy";
    head.appendChild(photo);
  } else {
    const initial = document.createElement("span");
    initial.className = "review-avatar review-avatar-initial";
    initial.textContent = (review.author || "?").trim().charAt(0).toUpperCase();
    head.appendChild(initial);
  }

  const meta = document.createElement("div");
  meta.className = "review-meta";

  const author = document.createElement("span");
  author.className = "review-author";
  author.textContent = review.author;
  meta.appendChild(author);

  if (review.relativeTime) {
    const when = document.createElement("span");
    when.className = "review-time";
    when.textContent = review.relativeTime;
    meta.appendChild(when);
  }

  head.appendChild(meta);
  card.appendChild(head);

  if (typeof review.rating === "number") {
    card.appendChild(buildStars(review.rating));
  }

  const text = document.createElement("p");
  text.className = "review-text";
  text.textContent = review.text;
  card.appendChild(text);

  return card;
}

/* ==========================================================================
   Branch tabs
   Testimonials shows one Elfsight Google Reviews widget per branch. Both
   widgets stay mounted (no data-elfsight-app-lazy) so each one initializes on
   page load even while hidden; switching tabs just swaps which panel is shown,
   then fires a resize so the carousel re-measures itself now that it has width.
   ========================================================================== */
function initBranchTabs() {
  const tabs = Array.from(document.querySelectorAll(".branch-tab"));
  if (tabs.length === 0) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((other) => {
        const panel = document.getElementById(other.getAttribute("aria-controls"));
        const isSelected = other === tab;
        other.classList.toggle("is-active", isSelected);
        other.setAttribute("aria-selected", isSelected ? "true" : "false");
        if (panel) panel.hidden = !isSelected;
      });

      window.dispatchEvent(new Event("resize"));
    });
  });
}

/* ==========================================================================
   Service catalog
   Replaces the hardcoded "Select a treatment" options with the real, live
   crownServiceMasterList (see Income Report/list-services.js) via the
   getBookableServices Cloud Function, so a name/duration change made there
   (e.g. Back Massage 15 -> 30 mins) shows up here automatically instead of
   needing this file hand-edited too. Falls back to the built-in options
   already in the markup if the call fails or returns nothing.
   ========================================================================== */
function initServiceCatalog() {
  const serviceSelect = document.getElementById("service");
  if (!serviceSelect) return;

  (async () => {
    try {
      if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
        throw new Error("Firebase not initialized");
      }

      const getBookableServices = firebase.functions().httpsCallable("getBookableServices");
      const result = await getBookableServices();
      const services = (result.data && result.data.services) || [];
      if (services.length === 0) return;

      serviceSelect.innerHTML = "";

      const placeholder = new Option("Select a treatment", "", true, true);
      placeholder.disabled = true;
      serviceSelect.appendChild(placeholder);

      services.forEach((service) => {
        // Some service names already end in "(60mins)" etc. (used to tell
        // duration variants of the same treatment apart) — strip that
        // before appending the real duration so the label doesn't read
        // "Name (60mins) (60 mins)". The value stays the exact name,
        // unstripped, since that's what has to match crownServiceMasterList.
        const displayName = service.name.replace(/\s*\(\d+\s*mins?\)\s*$/i, "");
        serviceSelect.appendChild(new Option(`${displayName} (${service.duration} mins)`, service.name));
      });

      serviceSelect.appendChild(new Option("Not sure yet — recommend for me", "Not sure yet"));
    } catch (err) {
      console.warn("Could not load the live service list, keeping the built-in one:", err);
    }
  })();
}

/* ==========================================================================
   Booking companions
   Lets a guest list the names of people they're booking with. Purely
   informational for staff (shown in the CrownOS booking request queue) —
   does not affect slot availability/capacity.
   ========================================================================== */

function initCompanions() {
  const list = document.getElementById("companionList");
  const addBtn = document.getElementById("addCompanionBtn");
  const serviceTemplate = document.getElementById("service");
  if (!list || !addBtn || !serviceTemplate) return;

  function addCompanionRow() {
    const row = document.createElement("div");
    row.className = "companion-row";
    row.innerHTML =
      '<div class="companion-fields">' +
        '<input type="text" name="companion" placeholder="Companion\'s name" maxlength="80" required>' +
        '<select name="companionService" required></select>' +
      '</div>' +
      '<button type="button" class="companion-remove" aria-label="Remove companion">&times;</button>';

    row.querySelector('select[name="companionService"]').innerHTML = serviceTemplate.innerHTML;
    list.appendChild(row);
    row.querySelector("input").focus();
  }

  addBtn.addEventListener("click", addCompanionRow);

  list.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".companion-remove");
    if (!removeBtn) return;
    removeBtn.closest(".companion-row").remove();
  });
}

/* Only counts a row once BOTH the name and service are filled in — a row
   left blank (e.g. added by accident) is silently skipped rather than
   sent as a half-empty companion. */
function getCompanions(form) {
  return Array.from(form.querySelectorAll(".companion-row"))
    .map((row) => ({
      name: row.querySelector('input[name="companion"]').value.trim(),
      serviceName: row.querySelector('select[name="companionService"]').value
    }))
    .filter((companion) => companion.name && companion.serviceName);
}

function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function markActiveNavLink() {
  const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = (link.getAttribute("href") || "").toLowerCase();
    if (href === current || (current === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
}

function initAccordions() {
  document.querySelectorAll(".accordion-item").forEach((item) => {
    const trigger = item.querySelector(".accordion-trigger");
    const panel = item.querySelector(".accordion-panel");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".accordion-item.open").forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove("open");
          openItem.querySelector(".accordion-panel").style.maxHeight = null;
        }
      });
      if (isOpen) {
        item.classList.remove("open");
        panel.style.maxHeight = null;
      } else {
        item.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });
}

/* ==========================================================================
   Gallery lightbox
   Clicking any gallery-tile image opens it enlarged in an overlay.
   ========================================================================== */

function initGalleryLightbox() {
  const images = document.querySelectorAll(".gallery-tile img");
  if (!images.length) return;

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
    <img src="" alt="">
  `;
  document.body.appendChild(overlay);

  const overlayImg = overlay.querySelector("img");
  const closeBtn = overlay.querySelector(".lightbox-close");

  function open(src, alt) {
    overlayImg.src = src;
    overlayImg.alt = alt || "";
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  images.forEach((img) => {
    img.addEventListener("click", () => open(img.currentSrc || img.src, img.alt));
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("open")) close();
  });
}

/* ==========================================================================
   Booking form
   Fetches real available time slots from the getAvailableSlots Cloud
   Function once branch/service/date are all chosen, then submits through
   submitBookingRequest — which validates, re-checks capacity, and creates
   both the bookingRequests doc (staff review) and a temporary scheduleHolds
   doc (releases automatically if staff can't confirm — see
   Income Report/functions/index.js). Also keeps a local copy in
   localStorage as a backup (see window.CrownBookings below) in case the
   call fails — e.g. the visitor is offline.
   ========================================================================== */

function initBookingForm() {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const confirmationBox = document.getElementById("bookingConfirmation");
  const confirmationText = confirmationBox ? confirmationBox.querySelector("p") : null;
  const submitBtn = form.querySelector('button[type="submit"]');
  const timeSelect = document.getElementById("time");
  const branchSelect = document.getElementById("branch");
  const serviceSelect = document.getElementById("service");
  const dateInput = document.getElementById("date");
  const dateBlockedMsg = document.getElementById("dateBlockedMsg");

  function setDateBlockedMessage(text) {
    if (!dateBlockedMsg) return;
    if (text) {
      dateBlockedMsg.textContent = text;
      dateBlockedMsg.classList.add("show");
    } else {
      dateBlockedMsg.textContent = "";
      dateBlockedMsg.classList.remove("show");
    }
  }

  let slotsRequestToken = 0;

  async function refreshSlots() {
    const branch = branchSelect.value;
    const service = serviceSelect.value;
    const date = dateInput.value;

    setDateBlockedMessage("");
    timeSelect.innerHTML = "";

    if (!branch || !service || !date) {
      timeSelect.disabled = true;
      timeSelect.appendChild(new Option("Select branch, service & date first", "", true, true));
      return;
    }

    timeSelect.disabled = true;
    timeSelect.appendChild(new Option("Checking availability…", "", true, true));

    const requestToken = ++slotsRequestToken;

    try {
      if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
        throw new Error("Firebase not initialized");
      }

      const getAvailableSlots = firebase.functions().httpsCallable("getAvailableSlots");
      const result = await getAvailableSlots({ branch, date, serviceName: service });

      if (requestToken !== slotsRequestToken) return; // superseded by a newer request

      const slots = (result.data && result.data.slots) || [];
      timeSelect.innerHTML = "";

      if (result.data && result.data.blocked) {
        const reason = result.data.reason ? ` (${result.data.reason})` : "";
        setDateBlockedMessage(`This date is not available for booking${reason} — please choose another date.`);
        timeSelect.appendChild(new Option("Not available for this date", "", true, true));
        timeSelect.disabled = true;
        return;
      }

      if (slots.length === 0) {
        timeSelect.appendChild(new Option("Select a time", "", true, true));
        timeSelect.disabled = true;
        setDateBlockedMessage("No available slots for this date — please choose another date.");
        return;
      }

      timeSelect.appendChild(new Option("Select a time", "", true, true));
      slots.forEach((slot) => {
        timeSelect.appendChild(new Option(slot.label, slot.startTime));
      });
      timeSelect.disabled = false;
    } catch (err) {
      if (requestToken !== slotsRequestToken) return;
      console.warn("Could not load available slots:", err);
      timeSelect.innerHTML = "";
      timeSelect.appendChild(new Option("Select a time", "", true, true));
      timeSelect.disabled = true;
      setDateBlockedMessage("Could not load availability — please call us instead.");
    }
  }

  [branchSelect, serviceSelect, dateInput].forEach((el) => {
    el.addEventListener("change", refreshSlots);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fields = Array.from(form.querySelectorAll("[required]"));
    let hasError = false;

    fields.forEach((field) => {
      const wrapper = field.closest(".field");
      const valid = field.checkValidity() && field.value.trim() !== "";
      if (!valid) {
        hasError = true;
        wrapper.classList.add("invalid");
      } else {
        wrapper.classList.remove("invalid");
      }
    });

    if (hasError) {
      confirmationBox.classList.remove("show");
      const firstInvalid = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.companions = getCompanions(form);
    data.submittedAt = new Date().toISOString();
    data.status = "Pending confirmation";

    saveBookingLocally(data);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = "Sending...";
    }

    const outcome = await submitBookingRequest(data);

    if (confirmationText) {
      confirmationText.textContent = outcome.message;
    }

    if (outcome.ok) {
      form.reset();
      refreshSlots();
    } else if (outcome.reason === "no_capacity" || outcome.reason === "date_blocked") {
      refreshSlots();
    }

    confirmationBox.classList.add("show");
    confirmationBox.scrollIntoView({ behavior: "smooth", block: "center" });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText;
    }
  });

  form.querySelectorAll("[required]").forEach((field) => {
    field.addEventListener("input", () => field.closest(".field").classList.remove("invalid"));
    field.addEventListener("change", () => field.closest(".field").classList.remove("invalid"));
  });

  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }
}

/* Calls the submitBookingRequest Cloud Function, which validates input,
   re-checks capacity in a transaction, and on success writes both the
   bookingRequests doc (for CrownOS staff review, see
   Income Report/booking-requests.js) and a scheduleHolds doc that
   temporarily blocks the slot until staff confirm or decline it. Returns
   {ok, reason, message} so the caller can show the guest what actually
   happened instead of always showing the same "Thank you!" regardless of
   outcome. */
async function submitBookingRequest(data) {
  const fallbackMessage =
    "We've saved your request. If you don't hear from us within a few hours, please call or message us directly using the details in the footer.";

  try {
    if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
      throw new Error("Firebase not initialized");
    }

    const submit = firebase.functions().httpsCallable("submitBookingRequest");
    const result = await submit({
      branch: data.branch,
      serviceName: data.service,
      date: data.date,
      startTime: data.time,
      clientName: data.name,
      mobile: data.mobile,
      email: data.email || "",
      notes: data.notes || "",
      companions: data.companions || []
    });

    if (result.data && result.data.ok) {
      return {
        ok: true,
        message:
          "Thank you! Your request has been received and this slot is temporarily held for you. We'll call you shortly to confirm — if we can't reach you, the hold is automatically released after a few hours."
      };
    }

    if (result.data && result.data.reason === "no_capacity") {
      return {
        ok: false,
        reason: "no_capacity",
        message: "Sorry, that time slot was just taken by another guest. Please pick another available time below and try again."
      };
    }

    if (result.data && result.data.reason === "date_blocked") {
      return {
        ok: false,
        reason: "date_blocked",
        message: "Sorry, that date is not available for booking. Please choose a different date."
      };
    }

    return { ok: false, message: fallbackMessage };
  } catch (err) {
    console.warn("Booking request failed to reach the server:", err);
    return { ok: false, message: fallbackMessage };
  }
}

function saveBookingLocally(entry) {
  try {
    const key = "crownHeadSpaBookings";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (err) {
    console.warn("Could not save booking locally:", err);
  }
}

window.CrownBookings = {
  all() {
    return JSON.parse(localStorage.getItem("crownHeadSpaBookings") || "[]");
  },
  clear() {
    localStorage.removeItem("crownHeadSpaBookings");
  },
};
