/* ==========================================================================
   Crown Head Spa — Payday Sale promo page (unlisted, payday-promo.html)

   Two pieces, both independent of book.html's own booking form (main.js's
   initBookingForm targets #bookingForm specifically, so it no-ops here):

   1. A view-only calendar — one row per bed, showing its Payday-Sale
      availability window and which parts of it are already occupied.
      Never clickable, never shows a client name: it calls the
      getPaydaySaleAvailability Cloud Function (Income Report/functions/
      index.js), which deliberately returns only start/end time ranges,
      nothing else — see that function's own comment for why.

   2. A simplified booking-request form (no guest rows/companions, no
      live time-slot dropdown) that calls the existing submitBookingRequest
      Cloud Function — the exact same one book.html itself uses, so a
      request submitted here lands in CrownOS's normal Booking Requests
      review flow. The only difference is the notes field gets a
      "[Payday Sale Promo]" tag prepended, so staff can tell these leads
      apart from a regular book.html request at a glance.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initPromoCalendar();
  initPromoBookingForm();
});

/* ---------- calendar ---------- */

function initPromoCalendar() {
  const branchSelect = document.getElementById("promoBranch");
  const dateInput = document.getElementById("promoDate");
  const prevBtn = document.getElementById("promoPrevDay");
  const nextBtn = document.getElementById("promoNextDay");
  const statusEl = document.getElementById("promoCalendarStatus");
  const listEl = document.getElementById("promoBedList");

  if (!branchSelect || !dateInput || !statusEl || !listEl) return;

  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  dateInput.setAttribute("min", today);

  function addDays(dateValue, days) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function formatTime(hhmm) {
    const [hourStr, minute] = String(hhmm || "00:00").split(":");
    const hour = Number(hourStr);
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minute} ${suffix}`;
  }

  function timeToMinutes(hhmm) {
    const [hour, minute] = String(hhmm || "00:00").split(":").map(Number);
    return hour * 60 + minute;
  }

  function renderBeds(data) {
    if (data.blocked) {
      statusEl.textContent =
        "This date isn't available for the Payday Sale" +
        (data.blockReason ? ` (${data.blockReason})` : "") +
        " — please choose another date.";
      listEl.innerHTML = "";
      return;
    }

    if (!data.beds || data.beds.length === 0) {
      statusEl.textContent = "No beds are set up for this branch yet.";
      listEl.innerHTML = "";
      return;
    }

    statusEl.textContent = "";

    listEl.innerHTML = data.beds
      .map((bed) => {
        if (!bed.available) {
          return `
            <div class="promo-bed-row">
              <div class="promo-bed-label">Bed ${bed.bed}<span class="promo-bed-status promo-bed-status-off">Not offered today</span></div>
            </div>
          `;
        }

        const windowStart = timeToMinutes(bed.from);
        const windowEnd = Math.max(windowStart, timeToMinutes(bed.to));
        const span = Math.max(1, windowEnd - windowStart);

        const segments = (bed.occupied || [])
          .map((range) => {
            const start = Math.min(Math.max(timeToMinutes(range.startTime), windowStart), windowEnd);
            const end = Math.min(Math.max(timeToMinutes(range.endTime), windowStart), windowEnd);

            if (end <= start) return "";

            const left = ((start - windowStart) / span) * 100;
            const width = ((end - start) / span) * 100;

            return `<span class="promo-bed-occupied" style="left:${left}%;width:${width}%;"></span>`;
          })
          .join("");

        return `
          <div class="promo-bed-row">
            <div class="promo-bed-label">Bed ${bed.bed}<span class="promo-bed-status promo-bed-status-open">${formatTime(bed.from)} – ${formatTime(bed.to)}</span></div>
            <div class="promo-bed-bar">${segments}</div>
          </div>
        `;
      })
      .join("");
  }

  let requestToken = 0;

  async function refresh() {
    const branch = branchSelect.value;
    const date = dateInput.value;

    if (!branch || !date) return;

    statusEl.textContent = "Loading availability…";
    listEl.innerHTML = "";

    const token = ++requestToken;

    try {
      if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
        throw new Error("Firebase not initialized");
      }

      const getPaydaySaleAvailability = firebase.functions().httpsCallable("getPaydaySaleAvailability");
      const result = await getPaydaySaleAvailability({ branch, date });

      if (token !== requestToken) return; // superseded by a newer request

      renderBeds(result.data || {});
    } catch (err) {
      if (token !== requestToken) return;
      console.warn("Could not load Payday Sale availability:", err);
      statusEl.textContent = "Could not load availability right now — please try again in a moment.";
    }
  }

  branchSelect.addEventListener("change", refresh);
  dateInput.addEventListener("change", refresh);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const next = addDays(dateInput.value || today, -1);
      if (next < today) return; // never step before today
      dateInput.value = next;
      refresh();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      dateInput.value = addDays(dateInput.value || today, 1);
      refresh();
    });
  }

  refresh();
}

/* ---------- booking-request form ---------- */

function initPromoBookingForm() {
  const form = document.getElementById("promoBookingForm");
  if (!form) return;

  const confirmationBox = document.getElementById("promoBookingConfirmation");
  const confirmationText = confirmationBox ? confirmationBox.querySelector("p") : null;
  const submitBtn = form.querySelector('button[type="submit"]');
  const branchSelect = document.getElementById("promoBranch");
  const dateInput = document.getElementById("promoDate");

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

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = "Sending...";
    }

    const notesValue = document.getElementById("promoFormNotes").value.trim();

    const outcome = await submitPaydayPromoRequest({
      branch: branchSelect.value,
      serviceName: document.getElementById("promoFormService").value,
      date: dateInput.value,
      startTime: document.getElementById("promoFormTime").value,
      clientName: document.getElementById("promoFormName").value.trim(),
      mobile: document.getElementById("promoFormMobile").value.trim(),
      email: document.getElementById("promoFormEmail").value.trim(),
      notes: "[Payday Sale Promo] " + notesValue
    });

    if (confirmationText) {
      confirmationText.textContent = outcome.message;
    }

    if (outcome.ok) {
      form.reset();
      dateInput.value = dateInput.getAttribute("min");
      branchSelect.dispatchEvent(new Event("change"));
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
}

/* Same Cloud Function book.html's own form calls (see main.js's
   submitBookingRequest) — a Payday Sale promo request is stored exactly
   like any other public-website booking request, so it shows up in
   CrownOS's existing Booking Requests review flow with no extra wiring. */
async function submitPaydayPromoRequest(data) {
  const fallbackMessage =
    "We've saved your request. If you don't hear from us within a few hours, please call or message us directly using the details in the footer.";

  try {
    if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
      throw new Error("Firebase not initialized");
    }

    const submit = firebase.functions().httpsCallable("submitBookingRequest");
    const result = await submit({
      branch: data.branch,
      serviceName: data.serviceName,
      date: data.date,
      startTime: data.startTime,
      clientName: data.clientName,
      mobile: data.mobile,
      email: data.email || "",
      notes: data.notes || "",
      companions: []
    });

    if (result.data && result.data.ok) {
      return {
        ok: true,
        message:
          "Thank you! Your Payday Sale request has been received. We'll call you shortly to confirm."
      };
    }

    if (result.data && result.data.reason === "no_capacity") {
      return {
        ok: false,
        reason: "no_capacity",
        message: "Sorry, that time was just taken. Please check the calendar above and pick another time."
      };
    }

    if (result.data && result.data.reason === "date_blocked") {
      return {
        ok: false,
        reason: "date_blocked",
        message: "Sorry, that date is not available. Please choose a different date."
      };
    }

    return { ok: false, message: fallbackMessage };
  } catch (err) {
    console.warn("Payday Sale request failed to reach the server:", err);
    return { ok: false, message: fallbackMessage };
  }
}
