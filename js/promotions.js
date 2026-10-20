/* ==========================================================================
   Crown Head Spa — Promotions page (unlisted, promotions.html)

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
   in CrownOS List of Services, with their Promo Price — fetched live
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
    promoServicesMessage = promoServices.length === 0 ? "No promo services available right now" : "";
  } catch (err) {
    console.warn("Could not load Promotions services:", err);
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

/* Month calendar on the left, the chosen day's open start times on the
   right (Calendly-style). The availability still comes from the
   getPaydaySaleAvailability Cloud Function, one bed list per day; a start
   time is "open" when every guest can be given their own bed, free for the
   whole length of THEIR service, all starting at that time. */
function initPromoCalendar() {
  const branchSelect = document.getElementById("promoBranch");
  const dateInput = document.getElementById("promoDate");
  const statusEl = document.getElementById("promoCalendarStatus");
  const monthTitle = document.getElementById("promoMonthTitle");
  const monthGrid = document.getElementById("promoMonthGrid");
  const prevMonthBtn = document.getElementById("promoPrevMonth");
  const nextMonthBtn = document.getElementById("promoNextMonth");
  const slotsEl = document.getElementById("promoTimeSlots");

  if (!branchSelect || !dateInput || !statusEl || !monthGrid || !slotsEl) return;

  const SLOT_STEP = 30;
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const pad = (n) => String(n).padStart(2, "0");
  const toDateValue = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

  const nowLocal = new Date();
  const today = toDateValue(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());
  dateInput.value = today;

  let viewYear = nowLocal.getFullYear();
  let viewMonth = nowLocal.getMonth();
  let lastData = null;

  function formatTime(hhmm) {
    const [hourStr, minute] = String(hhmm || "00:00").split(":");
    const hour = Number(hourStr);
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minute} ${suffix}`;
  }

  function minutesToHHMM(total) {
    return pad(Math.floor(total / 60)) + ":" + pad(total % 60);
  }

  function timeToMinutes(hhmm) {
    const [hour, minute] = String(hhmm || "00:00").split(":").map(Number);
    return hour * 60 + minute;
  }

  /* ----- month calendar ----- */

  function renderMonth() {
    monthTitle.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    /* Pad with the neighbouring months' dates (dimmed, not selectable),
       so the grid is always full weeks like the reference layout. */
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const date = new Date(viewYear, viewMonth, 1 - firstWeekday + i);
      const value = toDateValue(date.getFullYear(), date.getMonth(), date.getDate());
      const inMonth = date.getMonth() === viewMonth;
      const past = value < today;
      const classes = ["promo-cal-day"];

      if (!inMonth || past) classes.push("promo-cal-day-off");
      if (value === today) classes.push("promo-cal-day-today");
      if (value === dateInput.value) classes.push("promo-cal-day-selected");

      cells.push(
        `<button type="button" class="${classes.join(" ")}" data-date="${value}"${!inMonth || past ? " disabled" : ""}${value === dateInput.value ? ' aria-pressed="true"' : ""}>${date.getDate()}</button>`
      );
    }

    monthGrid.innerHTML = cells.join("");
    prevMonthBtn.disabled = viewYear === nowLocal.getFullYear() && viewMonth === nowLocal.getMonth();
  }

  /* ----- time slots ----- */

  /* Durations (minutes) of the guests' chosen services; before anything is
     chosen a single 60-minute guest is assumed so open times still show. */
  function currentDurations() {
    const guestRows = document.getElementById("promoGuestRows");
    const selects = guestRows ? Array.from(guestRows.querySelectorAll("select")) : [];
    const chosen = selects.map((select) => (select.value && select.selectedOptions[0] ? Number(select.selectedOptions[0].dataset.duration) || 60 : 0));

    return chosen.length > 0 && chosen.every(Boolean) ? chosen : [60];
  }

  function bedIsFree(bed, minute, duration) {
    const end = minute + duration;
    const taken = bed.taken.some(([start, stop]) => minute < stop && end > start);

    return minute >= bed.from && end <= bed.to && !taken;
  }

  /* Finds a free bed for every guest at `minute` (small backtracking search,
     as each guest has their own service length). Returns the beds in guest
     order, or null. The server re-checks on submit. */
  function assignBeds(beds, minute, durations) {
    const picked = [];

    const place = (index) => {
      if (index === durations.length) return true;

      for (const bed of beds) {
        if (picked.includes(bed) || !bedIsFree(bed, minute, durations[index])) continue;
        picked.push(bed);
        if (place(index + 1)) return true;
        picked.pop();
      }

      return false;
    };

    return place(0) ? picked.slice() : null;
  }

  function bedsFromData(data) {
    return (data.beds || [])
      .filter((bed) => bed.available)
      .map((bed) => ({
        number: bed.bed,
        from: timeToMinutes(bed.from),
        to: timeToMinutes(bed.to),
        taken: (bed.occupied || [])
          .concat(bed.held || [])
          .map((range) => [timeToMinutes(range.startTime), timeToMinutes(range.endTime)])
      }));
  }

  function renderSlots(data) {
    lastData = data;

    if (!data.beds || data.beds.length === 0) {
      statusEl.textContent = data.blocked
        ? "This date isn't available for Promotions" +
          (data.blockReason ? ` (${data.blockReason})` : "") +
          " — please choose another date."
        : "No beds are set up for this branch yet.";
      slotsEl.innerHTML = "";
      return;
    }

    if (data.blocked) {
      statusEl.textContent =
        "This date isn't available for Promotions" + (data.blockReason ? ` (${data.blockReason})` : "") + " — please choose another date.";
      slotsEl.innerHTML = "";
      return;
    }

    statusEl.textContent = "";

    const beds = bedsFromData(data);
    const durations = currentDurations();
    const opening = timeToMinutes(data.openingTime);
    const closing = Math.max(opening + 60, timeToMinutes(data.closingTime));

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isToday = dateInput.value === today;
    const selectedTime = document.getElementById("promoFormTime");
    const selectedMinute = selectedTime && selectedTime.value ? timeToMinutes(selectedTime.value) : null;

    const slots = [];

    for (let minute = opening; minute < closing; minute += SLOT_STEP) {
      const open = !(isToday && minute <= nowMinutes) && !!assignBeds(beds, minute, durations);
      slots.push(
        `<button type="button" class="promo-slot${minute === selectedMinute ? " promo-slot-selected" : ""}" data-minute="${minute}"${open ? "" : " disabled"}>${formatTime(minutesToHHMM(minute))}</button>`
      );
    }

    slotsEl.innerHTML = slots.join("");

    if (!slotsEl.querySelector(".promo-slot:not([disabled])")) {
      statusEl.textContent = "No open times left on this date — please choose another date.";
    }
  }

  /* Tapping an open time fills in the form's Preferred Time and the beds
     found for every guest, then scrolls to the details form. Number of
     guests and every guest's service must be chosen first. */
  slotsEl.addEventListener("click", (event) => {
    const button = event.target.closest(".promo-slot");
    if (!button || button.disabled || !lastData) return;

    const timeInput = document.getElementById("promoFormTime");
    const formEl = document.getElementById("promoDetailsCard");
    const guestsSelect = document.getElementById("promoFormGuests");
    const guestRows = document.getElementById("promoGuestRows");
    const bedsField = document.getElementById("promoFormBeds");
    if (!timeInput || !guestsSelect || !guestRows) return;

    const prompt = (field, text) => {
      field.closest(".field").classList.add("invalid");
      statusEl.textContent = text;
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    if (guestsSelect.value === "") {
      prompt(guestsSelect, "Please choose your number of guests first, then tap a time.");
      return;
    }

    const missing = Array.from(guestRows.querySelectorAll("select")).find((select) => select.value === "");
    if (missing) {
      prompt(missing, "Please choose a service for every guest first, then tap a time.");
      return;
    }

    const minute = Number(button.dataset.minute);
    const durations = currentDurations();
    const assigned = assignBeds(bedsFromData(lastData), minute, durations);

    if (!assigned) {
      statusEl.textContent = `There aren't enough open beds at that time for ${durations.length} guest${durations.length === 1 ? "" : "s"}. Please pick another time.`;
      renderSlots(lastData);
      return;
    }

    timeInput.value = minutesToHHMM(minute);
    timeInput.closest(".field").classList.remove("invalid");
    if (bedsField) bedsField.value = assigned.map((bed) => bed.number).join(",");

    slotsEl.querySelectorAll(".promo-slot-selected").forEach((el) => el.classList.remove("promo-slot-selected"));
    button.classList.add("promo-slot-selected");

    statusEl.textContent =
      `Selected ${formatTime(minutesToHHMM(minute))} for ${durations.length} guest${durations.length === 1 ? "" : "s"} — added to the form below.`;

    if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ----- loading ----- */

  let requestToken = 0;

  async function refresh(silent) {
    const branch = branchSelect.value;
    const date = dateInput.value;

    if (!branch || !date) return;

    if (silent !== true) {
      statusEl.textContent = "Loading availability…";
      slotsEl.innerHTML = "";
      }

    const token = ++requestToken;

    try {
      if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
        throw new Error("Firebase not initialized");
      }

      const getPaydaySaleAvailability = firebase.functions().httpsCallable("getPaydaySaleAvailability");
      const result = await getPaydaySaleAvailability({ branch, date });

      if (token !== requestToken) return; // superseded by a newer request

      renderSlots(result.data || {});
    } catch (err) {
      if (token !== requestToken) return;
      console.warn("Could not load Promotions availability:", err);
      statusEl.textContent = "Could not load availability right now — please try again in a moment.";
    }
  }

  function selectDate(value) {
    if (!value || value < today || value === dateInput.value) return;

    dateInput.value = value;

    /* A different day means a different time — clear the old pick. */
    const timeInput = document.getElementById("promoFormTime");
    const bedsField = document.getElementById("promoFormBeds");
    if (timeInput) timeInput.value = "";
    if (bedsField) bedsField.value = "";

    renderMonth();
    refresh();
  }

  monthGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".promo-cal-day");
    if (button && !button.disabled) selectDate(button.dataset.date);
  });

  prevMonthBtn.addEventListener("click", () => {
    if (prevMonthBtn.disabled) return;
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderMonth();
  });

  nextMonthBtn.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderMonth();
  });

  /* A different group size or service may not fit the time already
     picked, so clear it and re-work which times are open. */
  const guestsSelectEl = document.getElementById("promoFormGuests");
  const guestRowsEl = document.getElementById("promoGuestRows");

  const clearPicked = () => {
    const timeInput = document.getElementById("promoFormTime");
    const hadPick = !!(timeInput && timeInput.value);

    if (hadPick) {
      timeInput.value = "";
      const bedsField = document.getElementById("promoFormBeds");
      if (bedsField) bedsField.value = "";
    }

    if (lastData) renderSlots(lastData);
    if (hadPick) statusEl.textContent = "Your guests or services changed — please tap a time on the calendar again.";
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

  branchSelect.addEventListener("change", () => refresh());

  renderMonth();
  refresh();

  /* Re-poll now and then so other people's new orders show up — but never
     while this visitor has a time picked, since a reload would wipe it. */
  const timeField = document.getElementById("promoFormTime");
  const isPicking = () => !!(timeField && timeField.value);

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

    /* Final confirmation — nothing is sent (and no slot is held) until the
       client reviews the order and confirms it. */
    const confirmed = await confirmPromoOrder({
      branch: branchSelect.value,
      date: dateInput.value,
      startTime: document.getElementById("promoFormTime").value,
      guests: Array.from(document.querySelectorAll("#promoGuestRows select")).map((select) => select.value),
      clientName: document.getElementById("promoFormName").value.trim(),
      mobile: document.getElementById("promoFormMobile").value.trim(),
      email: document.getElementById("promoFormEmail").value.trim(),
      notes: document.getElementById("promoFormNotes").value.trim()
    });

    if (!confirmed) return;

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
      /* Branch and Date sit inside the form now (between the guest
         services and the contact details), so reset() would wipe them —
         keep them so the client still sees their held slot. */
      const keptBranch = branchSelect.value;
      const keptDate = dateInput.value;
      form.reset();
      branchSelect.value = keptBranch;
      dateInput.value = keptDate;
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

  /* Enter (or "Go" on a phone keyboard) in any field must never place the
     order — it used to submit the form the moment someone pressed Enter
     after typing a time. The order is only sent by pressing the Order
     Voucher button. */
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA" && event.target.tagName !== "BUTTON") {
      event.preventDefault();
    }
  });

  form.querySelectorAll("[required]").forEach((field) => {
    field.addEventListener("input", () => field.closest(".field").classList.remove("invalid"));
    field.addEventListener("change", () => field.closest(".field").classList.remove("invalid"));
  });
}

/* Pop-up "Please confirm your order" window. Resolves true when the client
   presses Confirm Order, false on Go Back / Esc / clicking outside. */
function confirmPromoOrder(order) {
  const esc = (text) =>
    String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const peso = (amount) => "₱" + Number(amount).toLocaleString("en-PH");

  const [year, month, day] = order.date.split("-").map(Number);
  const dateText = new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const [hourStr, minute] = order.startTime.split(":");
  const timeText = `${Number(hourStr) % 12 || 12}:${minute} ${Number(hourStr) >= 12 ? "PM" : "AM"}`;

  let total = 0;
  const guestRows = order.guests
    .map((name, index) => {
      const service = promoServices.find((item) => item.name === name);
      const price = service ? Number(service.price) : 0;
      total += price;

      return `<li><span>Guest ${index + 1} — ${esc(name)}${service ? ` (${service.duration} mins)` : ""}</span><strong>${service ? peso(price) : ""}</strong></li>`;
    })
    .join("");

  const overlay = document.createElement("div");
  overlay.className = "promo-confirm-overlay";
  overlay.innerHTML = `
    <div class="promo-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="promoConfirmTitle">
      <h3 id="promoConfirmTitle">Please confirm your order</h3>
      <p class="promo-confirm-intro">Review your details below. Your chosen time will be held for 1 hour once you confirm.</p>

      <dl class="promo-confirm-details">
        <div><dt>Branch</dt><dd>Crown Head Spa — ${esc(order.branch)}</dd></div>
        <div><dt>Date</dt><dd>${esc(dateText)}</dd></div>
        <div><dt>Time</dt><dd>${esc(timeText)}</dd></div>
        <div><dt>Name</dt><dd>${esc(order.clientName)}</dd></div>
        <div><dt>Contact</dt><dd>${esc(order.mobile)}</dd></div>
        <div><dt>Email</dt><dd>${esc(order.email)}</dd></div>
        ${order.notes ? `<div><dt>Notes</dt><dd>${esc(order.notes)}</dd></div>` : ""}
      </dl>

      <ul class="promo-confirm-guests">${guestRows}</ul>
      ${total > 0 ? `<p class="promo-confirm-total"><span>Total</span><strong>${peso(total)}</strong></p>` : ""}

      <div class="promo-confirm-actions">
        <button type="button" class="btn btn-outline" data-confirm="no">Go Back</button>
        <button type="button" class="btn btn-primary" data-confirm="yes">Confirm Order</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.classList.add("promo-confirm-open");

  const confirmBtn = overlay.querySelector('[data-confirm="yes"]');
  confirmBtn.focus();

  return new Promise((resolve) => {
    const close = (result) => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      document.body.classList.remove("promo-confirm-open");
      resolve(result);
    };

    const onKey = (event) => {
      if (event.key === "Escape") close(false);
    };

    document.addEventListener("keydown", onKey);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
      const choice = event.target.closest("[data-confirm]");
      if (choice) close(choice.dataset.confirm === "yes");
    });
  });
}

/* Same Cloud Function book.html's own form calls (see main.js's
   submitBookingRequest) — a Promotions request is stored exactly
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
          "Thank you! Your voucher order was received and your slot is on hold for 1 hour (please keep your phone handy). " +
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
    console.warn("voucher order failed to reach the server:", err);
    return { ok: false, message: fallbackMessage };
  }
}
