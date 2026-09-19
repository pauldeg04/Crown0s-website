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
  initPromoServices();
  initPromoCalendar();
  initPromoBookingForm();
});

/* ---------- treatments ---------- */

/* Services offered on the page: only those marked "Available for Payday"
   in CrownOS List of Services, with their Payday Sale Price — fetched live
   from the getPaydaySaleServices Cloud Function so it can't drift from
   what staff set up. Every guest gets their own dropdown of these. */
let promoServices = [];
let promoServicesMessage = "Loading services…";

async function initPromoServices() {
  try {
    if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
      throw new Error("Firebase not initialized");
    }

    const getPaydaySaleServices = firebase.functions().httpsCallable("getPaydaySaleServices");
    const result = await getPaydaySaleServices();
    promoServices = (result.data && result.data.services) || [];
    promoServicesMessage = promoServices.length === 0 ? "No Payday Sale services available right now" : "";
  } catch (err) {
    console.warn("Could not load Payday Sale services:", err);
    promoServices = [];
    promoServicesMessage = "Could not load services — please call us instead";
  }

  renderGuestRows();
}

function promoServiceOptionsHtml(selected) {
  if (promoServices.length === 0) {
    return `<option value="" disabled selected>${promoServicesMessage || "No services available"}</option>`;
  }

  /* <option> text can't be styled, so the original price is struck out
     with combining-strikethrough characters (works in every native
     dropdown, including phone pickers). */
  const strike = (text) => Array.from(text).map((ch) => ch + "\u0336").join("");

  const options = promoServices.map((service) => {
    const price = "₱" + Number(service.price).toLocaleString("en-PH");
    const category = service.category ? ` - ${service.category}` : "";
    const original =
      Number(service.regularPrice) > Number(service.price)
        ? strike("₱" + Number(service.regularPrice).toLocaleString("en-PH")) + "  "
        : "";
    const escaped = service.name.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

    return `<option value="${escaped}" data-duration="${service.duration}"${service.name === selected ? " selected" : ""}>${service.name.replace(/&/g, "&amp;").replace(/</g, "&lt;")} (${service.duration} mins)${category} — ${original}${price}</option>`;
  });

  return `<option value=""${selected ? "" : " selected"} disabled>Select a service</option>` + options.join("");
}

/* One row per guest ("Guest 1" … "Guest N"), each with its own service
   dropdown. Existing choices are kept when the count changes. */
function renderGuestRows() {
  const countSelect = document.getElementById("promoFormGuests");
  const container = document.getElementById("promoGuestRows");
  if (!countSelect || !container) return;

  const count = Math.min(4, Math.max(0, Number(countSelect.value) || 0));
  const previous = Array.from(container.querySelectorAll("select")).map((select) => select.value);

  container.innerHTML = "";

  for (let index = 0; index < count; index++) {
    const row = document.createElement("div");
    row.className = "field promo-guest-row";
    row.innerHTML = `
      <label for="promoGuestService${index + 1}">Guest ${index + 1}</label>
      <select id="promoGuestService${index + 1}" class="promo-guest-service" required${promoServices.length === 0 ? " disabled" : ""}>
        ${promoServiceOptionsHtml(previous[index] || "")}
      </select>
      <span class="error-msg">Please choose a service for Guest ${index + 1}.</span>
    `;
    container.appendChild(row);
  }
}

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

  function minutesToHHMM(total) {
    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  }

  function timeToMinutes(hhmm) {
    const [hour, minute] = String(hhmm || "00:00").split(":").map(Number);
    return hour * 60 + minute;
  }

  function renderBeds(data) {
    if (!data.beds || data.beds.length === 0) {
      statusEl.textContent = data.blocked
        ? "This date isn't available for the Payday Sale" +
          (data.blockReason ? ` (${data.blockReason})` : "") +
          " — please choose another date."
        : "No beds are set up for this branch yet.";
      listEl.innerHTML = "";
      return;
    }

    /* A blocked date still shows the bed calendar so guests can see the
       day's schedule — just dimmed, with the reason above it. */
    statusEl.textContent = data.blocked
      ? "This date isn't available for the Payday Sale" +
        (data.blockReason ? ` (${data.blockReason})` : "") +
        " — please choose another date. Here's the schedule for reference."
      : "";

    listEl.classList.toggle("promo-bed-list-blocked", !!data.blocked);

    const PX_PER_MIN = 0.9;
    const opening = timeToMinutes(data.openingTime);
    const closing = Math.max(opening + 60, timeToMinutes(data.closingTime));
    const totalHeight = (closing - opening) * PX_PER_MIN;
    const y = (minute) => (Math.min(Math.max(minute, opening), closing) - opening) * PX_PER_MIN;

    const hourMarks = [opening];
    for (let m = Math.ceil((opening + 1) / 60) * 60; m < closing; m += 60) hourMarks.push(m);

    const header = data.beds
      .map((bed) => `
        <div class="promo-grid-head-cell${bed.available ? "" : " promo-grid-head-off"}" title="Bed ${bed.bed}: ${bed.available ? `${formatTime(bed.from)} – ${formatTime(bed.to)}` : "Not offered"}">
          <strong>Bed ${bed.bed}</strong>
          <small>${bed.available ? `${formatTime(bed.from)} – ${formatTime(bed.to)}` : "Not offered"}</small>
        </div>`)
      .join("");

    const timeCol = hourMarks
      .map((m) => `<div class="promo-grid-hour" style="top:${y(m)}px;">${formatTime(minutesToHHMM(m))}</div>`)
      .join("");

    const bedCols = data.beds
      .map((bed) => {
        const shade = (from, to) =>
          to > from
            ? `<div class="promo-grid-off" style="top:${y(from)}px;height:${y(to) - y(from)}px;"></div>`
            : "";

        let off = "";
        if (!bed.available) {
          off = shade(opening, closing);
        } else {
          off = shade(opening, timeToMinutes(bed.from)) + shade(timeToMinutes(bed.to), closing);
        }

        const occupied = bed.available
          ? (bed.occupied || [])
              .map((range) => {
                const start = Math.max(timeToMinutes(range.startTime), opening);
                const end = Math.min(timeToMinutes(range.endTime), closing);
                if (end <= start) return "";
                return `<div class="promo-grid-occupied" title="Occupied" style="top:${y(start)}px;height:${y(end) - y(start)}px;"></div>`;
              })
              .join("")
          : "";

        const held = bed.available
          ? (bed.held || [])
              .map((range) => {
                const start = Math.max(timeToMinutes(range.startTime), opening);
                const end = Math.min(timeToMinutes(range.endTime), closing);
                if (end <= start) return "";
                return `<div class="promo-grid-held" title="On hold — expires when the timer ends" style="top:${y(start)}px;height:${y(end) - y(start)}px;"><span class="promo-hold-timer" data-expires="${range.expiresAt}">${formatCountdown(range.expiresAt - Date.now())}</span></div>`;
              })
              .join("")
          : "";

        const blockedRanges = (bed.occupied || []).concat(bed.held || []);

        const openWindow = bed.available && !data.blocked
          ? `data-bed="${bed.bed}" data-from="${timeToMinutes(bed.from)}" data-to="${timeToMinutes(bed.to)}" data-bed-number="${bed.bed}" data-occupied="${blockedRanges.map((r) => timeToMinutes(r.startTime) + "-" + timeToMinutes(r.endTime)).join(",")}"`
          : "";

        return `<div class="promo-grid-col${openWindow ? " promo-grid-col-pickable" : ""}" ${openWindow} style="height:${totalHeight}px;">${off}${occupied}${held}</div>`;
      })
      .join("");

    listEl.innerHTML = `
      <div class="promo-grid-scroll">
        <div class="promo-grid" style="--bed-count:${data.beds.length};--hour-height:${PX_PER_MIN * 60}px;">
          <div class="promo-grid-head">
            <div class="promo-grid-head-cell promo-grid-corner">Time</div>
            ${header}
          </div>
          <div class="promo-grid-body">
            <div class="promo-grid-time" style="height:${totalHeight}px;">${timeCol}</div>
            ${bedCols}
          </div>
        </div>
      </div>`;

    attachPicking(opening, PX_PER_MIN);
  }

  /* Clicking an open stretch of the calendar fills in the form's
     Preferred Time on the hour (1-hour steps), previews every guest's card
     on the grid, and scrolls to the form. Number of guests and every
     guest's service must be chosen first. Each guest needs their own bed,
     free for the whole length of THEIR service, all starting at the same
     time — so the cards can have different heights. A small backtracking
     search finds a bed for each guest (Guest 1 preferring the bed clicked,
     the rest nearby); if the hour clicked doesn't work it tries the next
     one. The server still re-checks on submit. */
  function attachPicking(opening, pxPerMin) {
    const timeInput = document.getElementById("promoFormTime");
    const formEl = document.getElementById("promoBookingForm");
    const guestsSelect = document.getElementById("promoFormGuests");
    const guestRows = document.getElementById("promoGuestRows");
    const bedsField = document.getElementById("promoFormBeds");
    if (!timeInput || !guestsSelect || !guestRows) return;

    const cols = Array.from(listEl.querySelectorAll(".promo-grid-col-pickable"));

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const bedIsFree = (col, minute, duration) => {
      const from = Number(col.dataset.from);
      const to = Number(col.dataset.to);
      const end = minute + duration;
      const taken = (col.dataset.occupied || "")
        .split(",")
        .filter(Boolean)
        .some((pair) => {
          const [start, stop] = pair.split("-").map(Number);
          return minute < stop && end > start;
        });

      return minute >= from && end <= to && !taken && !(dateInput.value === today && minute <= nowMinutes);
    };

    const prompt = (field, text) => {
      field.closest(".field").classList.add("invalid");
      statusEl.textContent = text;
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    cols.forEach((col) => {
      col.addEventListener("click", (event) => {
        if (guestsSelect.value === "") {
          prompt(guestsSelect, "Please choose your number of guests first, then tap a time.");
          return;
        }

        const serviceSelects = Array.from(guestRows.querySelectorAll("select"));
        const missing = serviceSelects.find((select) => select.value === "");
        if (missing) {
          prompt(missing, "Please choose a service for every guest first, then tap a time.");
          return;
        }

        const durations = serviceSelects.map((select) => Number(select.selectedOptions[0].dataset.duration) || 60);
        const guests = durations.length;

        const rect = col.getBoundingClientRect();
        const raw = opening + Math.floor((event.clientY - rect.top) / pxPerMin);
        const clickIndex = cols.indexOf(col);

        const bedOrder = cols
          .slice()
          .sort((a, b) => Math.abs(cols.indexOf(a) - clickIndex) - Math.abs(cols.indexOf(b) - clickIndex) || cols.indexOf(a) - cols.indexOf(b));

        const assign = (minute) => {
          const picked = [];

          const place = (index) => {
            if (index === guests) return true;

            for (const candidate of bedOrder) {
              if (picked.includes(candidate) || !bedIsFree(candidate, minute, durations[index])) continue;
              picked.push(candidate);
              if (place(index + 1)) return true;
              picked.pop();
            }

            return false;
          };

          return place(0) ? picked.slice() : null;
        };

        let minute = Math.floor(raw / 60) * 60;
        let assigned = assign(minute);

        if (!assigned) {
          minute += 60;
          assigned = assign(minute);
        }

        if (!assigned) {
          statusEl.textContent =
            `There aren't enough open beds at that time for ${guests} guest${guests === 1 ? "" : "s"} — each guest needs a bed free for their whole service. Please pick another time.`;
          return;
        }

        timeInput.value = minutesToHHMM(minute);
        timeInput.closest(".field").classList.remove("invalid");
        if (bedsField) bedsField.value = assigned.map((c) => c.dataset.bedNumber).join(",");

        listEl.querySelectorAll(".promo-grid-pick").forEach((el) => el.remove());

        assigned.forEach((target, index) => {
          const pick = document.createElement("div");
          pick.className = "promo-grid-pick" + (index > 0 ? " promo-grid-pick-companion" : "");
          pick.style.top = (minute - opening) * pxPerMin + "px";
          pick.style.height = durations[index] * pxPerMin + "px";
          pick.innerHTML = `<span>G${index + 1}</span>`;
          target.appendChild(pick);
        });

        statusEl.textContent =
          `Selected ${formatTime(minutesToHHMM(minute))} for ${guests} guest${guests === 1 ? "" : "s"} — added to the form below.`;

        if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  let requestToken = 0;

  async function refresh(silent) {
    const branch = branchSelect.value;
    const date = dateInput.value;

    if (!branch || !date) return;

    if (silent !== true) {
      statusEl.textContent = "Loading availability…";
      listEl.innerHTML = "";
    }

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

  /* A different group size or service may not fit the time already
     picked, so clear it. */
  const guestsSelectEl = document.getElementById("promoFormGuests");
  const guestRowsEl = document.getElementById("promoGuestRows");

  const clearPicked = () => {
    const timeInput = document.getElementById("promoFormTime");
    if (timeInput && timeInput.value) {
      timeInput.value = "";
      const bedsField = document.getElementById("promoFormBeds");
      if (bedsField) bedsField.value = "";
      listEl.querySelectorAll(".promo-grid-pick").forEach((node) => node.remove());
      statusEl.textContent = "Your guests or services changed — please tap a time on the calendar again.";
    }
  };

  if (guestsSelectEl) {
    guestsSelectEl.addEventListener("change", () => {
      guestsSelectEl.closest(".field").classList.remove("invalid");
      renderGuestRows();
      clearPicked();
    });
  }

  if (guestRowsEl) {
    guestRowsEl.addEventListener("change", (event) => {
      const row = event.target.closest(".field");
      if (row) row.classList.remove("invalid");
      clearPicked();
    });
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

  /* Held slots (someone has ordered a voucher and it isn't plotted yet)
     count down one hour. Tick the timers every second; when one runs out
     the slot is free again, so reload the grid. Also re-poll now and then
     so other people's new holds show up — but never while this visitor is
     mid-pick, since a reload would wipe their preview. */
  function formatCountdown(ms) {
    const secs = Math.max(0, Math.min(3599, Math.floor(ms / 1000)));
    return String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
  }

  const timeField = document.getElementById("promoFormTime");
  const isPicking = () => !!(timeField && timeField.value) || !!listEl.querySelector(".promo-grid-pick");

  setInterval(() => {
    let expired = false;

    listEl.querySelectorAll(".promo-hold-timer").forEach((el) => {
      const remaining = Number(el.dataset.expires) - Date.now();
      if (remaining <= 0) expired = true;
      el.textContent = formatCountdown(remaining);
    });

    if (expired && !isPicking()) refresh(true);
  }, 1000);

  setInterval(() => {
    if (!isPicking() && !document.hidden) refresh(true);
  }, 30000);
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
      date: dateInput.value,
      startTime: document.getElementById("promoFormTime").value,
      beds: document.getElementById("promoFormBeds").value.split(",").filter(Boolean).map(Number),
      guests: Array.from(document.querySelectorAll("#promoGuestRows select")).map((select) => ({ serviceName: select.value })),
      clientName: document.getElementById("promoFormName").value.trim(),
      mobile: document.getElementById("promoFormMobile").value.trim(),
      email: document.getElementById("promoFormEmail").value.trim(),
      notes: notesValue
    });

    if (confirmationText) {
      confirmationText.textContent = outcome.message;
    }

    if (outcome.ok) {
      form.reset();
      document.getElementById("promoFormBeds").value = "";
      renderGuestRows();
    }

    if (outcome.ok || outcome.reason === "no_capacity" || outcome.reason === "date_blocked") {
      /* Keep the same branch/date so the client sees their held slot (or
         what's left) with its countdown. */
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
    "We couldn't send your order right now. Please try again in a moment, or call or message us directly using the details in the footer.";

  try {
    if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
      throw new Error("Firebase not initialized");
    }

    const submit = firebase.functions().httpsCallable("submitPaydayVoucherOrder");
    const result = await submit({
      branch: data.branch,
      date: data.date,
      startTime: data.startTime,
      beds: data.beds || [],
      guests: data.guests || [],
      clientName: data.clientName,
      mobile: data.mobile,
      email: data.email,
      notes: data.notes || ""
    });

    if (result.data && result.data.ok) {
      return {
        ok: true,
        message:
          "Thank you! Your voucher order was received and your slot is on hold for 1 hour (see the countdown on the calendar below). " +
          "Our marketing team will confirm it and send your voucher to your email. If it isn't confirmed within the hour, the slot is released to other clients."
      };
    }

    if (result.data && result.data.reason === "no_capacity") {
      return {
        ok: false,
        reason: "no_capacity",
        message: "Sorry, that time was just taken or put on hold by another client. Please pick another available time on the calendar and try again."
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
    console.warn("Payday Sale voucher order failed to reach the server:", err);
    return { ok: false, message: fallbackMessage };
  }
}
