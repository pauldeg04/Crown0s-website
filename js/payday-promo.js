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

/* The dropdown lists only services marked "Available for Payday" in
   CrownOS List of Services, with their Payday Sale Price — fetched live
   from the getPaydaySaleServices Cloud Function, so it can't drift from
   what staff set up. */
async function initPromoServices() {
  const select = document.getElementById("promoFormService");
  if (!select) return;

  const setMessage = (text) => {
    select.innerHTML = "";
    select.appendChild(new Option(text, "", true, true));
    select.options[0].disabled = true;
    select.disabled = true;
  };

  try {
    if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
      throw new Error("Firebase not initialized");
    }

    const getPaydaySaleServices = firebase.functions().httpsCallable("getPaydaySaleServices");
    const result = await getPaydaySaleServices();
    const services = (result.data && result.data.services) || [];

    if (services.length === 0) {
      setMessage("No Payday Sale services available right now");
      return;
    }

    select.innerHTML = "";
    const placeholder = new Option("Select a service", "", true, true);
    placeholder.disabled = true;
    select.appendChild(placeholder);

    services.forEach((service) => {
      const price = "₱" + Number(service.price).toLocaleString("en-PH");
      const category = service.category ? ` - ${service.category}` : "";

      /* <option> text can't be styled, so the original price is struck out
         with combining-strikethrough characters (works in every native
         dropdown, including phone pickers). */
      const strike = (text) => Array.from(text).map((ch) => ch + "\u0336").join("");
      const original =
        Number(service.regularPrice) > Number(service.price)
          ? strike("₱" + Number(service.regularPrice).toLocaleString("en-PH")) + "  "
          : "";

      select.appendChild(
        new Option(`${service.name} (${service.duration} mins)${category} — ${original}${price}`, service.name)
      );
    });

    select.disabled = false;
  } catch (err) {
    console.warn("Could not load Payday Sale treatments:", err);
    setMessage("Could not load services — please call us instead");
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

        const openWindow = bed.available && !data.blocked
          ? `data-bed="${bed.bed}" data-from="${timeToMinutes(bed.from)}" data-to="${timeToMinutes(bed.to)}" data-occupied="${(bed.occupied || []).map((r) => timeToMinutes(r.startTime) + "-" + timeToMinutes(r.endTime)).join(",")}"`
          : "";

        return `<div class="promo-grid-col${openWindow ? " promo-grid-col-pickable" : ""}" ${openWindow} style="height:${totalHeight}px;">${off}${occupied}</div>`;
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
     Preferred Time on the hour (1-hour steps) and scrolls to the form.
     The number of companions must be chosen first, and the hour needs at
     least one open bed per guest (the guest plus their companions), so a
     group is never sent a time the branch can't seat them at once. If the
     hour clicked doesn't work it moves to the next one. The server still
     re-checks on submit. */
  function attachPicking(opening, pxPerMin) {
    const timeInput = document.getElementById("promoFormTime");
    const formEl = document.getElementById("promoBookingForm");
    const companionsSelect = document.getElementById("promoFormCompanions");
    if (!timeInput || !companionsSelect) return;

    const cols = Array.from(listEl.querySelectorAll(".promo-grid-col-pickable"));

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const bedIsFree = (col, minute) => {
      const from = Number(col.dataset.from);
      const to = Number(col.dataset.to);
      const taken = (col.dataset.occupied || "")
        .split(",")
        .filter(Boolean)
        .some((pair) => {
          const [start, end] = pair.split("-").map(Number);
          return minute >= start && minute < end;
        });

      return minute >= from && minute < to && !taken && !(dateInput.value === today && minute <= nowMinutes);
    };

    cols.forEach((col) => {
      col.addEventListener("click", (event) => {
        if (companionsSelect.value === "") {
          companionsSelect.closest(".field").classList.add("invalid");
          statusEl.textContent = "Please choose your number of companions first, then tap a time.";
          companionsSelect.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        const guests = 1 + Number(companionsSelect.value);
        const rect = col.getBoundingClientRect();
        const raw = opening + Math.floor((event.clientY - rect.top) / pxPerMin);

        const openBedsAt = (minute) => cols.filter((c) => bedIsFree(c, minute));

        let minute = Math.floor(raw / 60) * 60;
        if (openBedsAt(minute).length < guests || !bedIsFree(col, minute)) minute += 60;

        const open = openBedsAt(minute);

        if (open.length < guests) {
          statusEl.textContent =
            `That time has ${open.length} open bed${open.length === 1 ? "" : "s"} but you need ${guests} for ${guests} guest${guests === 1 ? "" : "s"}. Please pick another time.`;
          return;
        }

        timeInput.value = minutesToHHMM(minute);
        timeInput.closest(".field").classList.remove("invalid");

        listEl.querySelectorAll(".promo-grid-pick").forEach((el) => el.remove());
        const target = bedIsFree(col, minute) ? col : open[0];
        const pick = document.createElement("div");
        pick.className = "promo-grid-pick";
        pick.style.top = (minute - opening) * pxPerMin + "px";
        pick.style.height = 60 * pxPerMin + "px";
        pick.textContent = formatTime(minutesToHHMM(minute));
        target.appendChild(pick);

        statusEl.textContent = `Selected ${formatTime(minutesToHHMM(minute))} for ${guests} guest${guests === 1 ? "" : "s"} — added to the form below.`;

        if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
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

  /* A different group size may not fit the time already picked. */
  const companionsSelectEl = document.getElementById("promoFormCompanions");
  if (companionsSelectEl) {
    companionsSelectEl.addEventListener("change", () => {
      companionsSelectEl.closest(".field").classList.remove("invalid");
      const timeInput = document.getElementById("promoFormTime");
      if (timeInput && timeInput.value) {
        timeInput.value = "";
        listEl.querySelectorAll(".promo-grid-pick").forEach((el) => el.remove());
        statusEl.textContent = "Group size changed — please tap a time on the calendar again.";
      }
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
    const companionCount = Math.min(3, Math.max(0, Number(document.getElementById("promoFormCompanions").value) || 0));

    const outcome = await submitPaydayPromoRequest({
      branch: branchSelect.value,
      serviceName: document.getElementById("promoFormService").value,
      date: dateInput.value,
      startTime: document.getElementById("promoFormTime").value,
      clientName: document.getElementById("promoFormName").value.trim(),
      mobile: document.getElementById("promoFormMobile").value.trim(),
      email: document.getElementById("promoFormEmail").value.trim(),
      notes:
        "[Payday Sale Promo] Guests: " + (1 + companionCount) +
        (companionCount > 0 ? ` (1 + ${companionCount} companion${companionCount === 1 ? "" : "s"})` : "") +
        (notesValue ? ". " + notesValue : "")
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
