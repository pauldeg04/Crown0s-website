/* Crown Head Spa — shared site behavior */

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initAccordions();
  initServiceCatalog();
  initCompanions();
  initBookingForm();
  markActiveNavLink();
  initGalleryLightbox();
});

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
