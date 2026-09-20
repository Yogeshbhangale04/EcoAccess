/* Create Booking wizard: service, availability, fare, payment */
window.initBooking = function () {
  let service = "",
    base = 0,
    journeyPlatform = "",
    j = journeyValidation();
  const stationEl = $("#station");
  if (stationEl)
    stationEl.innerHTML = DUMMY.stations
      .map((s) => `<option>${escHtml(s)}</option>`)
      .join("");
  if (j) {
    $("#pnr").value = j.pnr;
    $("#train").value = j.train;
    $("#date").value = j.date;
    $("#station").value = j.station;
    journeyPlatform = String(j.platform || "").replace(/\D/g, "");
    if ($("#bookingTime") && j.time)
      $("#bookingTime").value = String(j.time).slice(0, 5);
  }
  const today = new Date();
  const ymd =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");
  if ($("#date")) {
    $("#date").min = ymd;
    if (!$("#date").value) $("#date").value = ymd;
  }
  $$(".choice[data-service]").forEach((b) => {
    const fare = DUMMY.serviceFares[b.dataset.service];
    const small = b.querySelector("small");
    if (small && fare != null) small.textContent = "₹" + fare;
  });
  const weight = $("#porterWeight");
  if (weight)
    weight.innerHTML = DUMMY.porterRates
      .map(
        (r) =>
          `<option value="${escHtml(r.value)}">${escHtml(r.label)}</option>`,
      )
      .join("");
  const taxEl = $("#tax");
  if (taxEl?.parentElement) {
    const pct = Math.round(DUMMY.taxRate * 100);
    taxEl.parentElement.childNodes[0].textContent =
      DUMMY.taxName + " " + pct + "% ";
  }
  bindDigits($("#pnr"), DUMMY.limits.pnrLength);
  bindDigits($("#train"), DUMMY.limits.trainNumberLength);
  if ($("#pnr"))
    $("#pnr").value = String($("#pnr").value || "")
      .replace(/\D/g, "")
      .slice(0, DUMMY.limits.pnrLength);
  if ($("#train"))
    $("#train").value = String($("#train").value || "")
      .replace(/\D/g, "")
      .slice(0, DUMMY.limits.trainNumberLength);
  const fareHint = document.querySelector("#step4 > p.muted");
  if (fareHint)
    fareHint.textContent =
      "Redeem " +
      DUMMY.rewards.redeemMinPoints +
      "+ reward points to generate a coupon (points × " +
      DUMMY.rewards.couponPointRate +
      "). Apply it here to reduce the resource booking fare.";
  show(1);
  function unitRate() {
    if (service === "Porter") return Number($("#porterWeight").value) || 0;
    return DUMMY.serviceFares[service] || 0;
  }
  function currentCount() {
    if (service === "Porter") return 1;
    return Number($("#passengerCount").value) || 1;
  }
  function calcBase() {
    if (service === "Porter") {
      const bags = Number($("#porterBags").value) || 1;
      return unitRate() * bags;
    }
    return unitRate() * currentCount();
  }
  function gross() {
    return base + Math.round(base * DUMMY.taxRate);
  }
  function selectedCoupon() {
    const cid = $("#couponSelect")?.value;
    return usableCoupons(session().id).find((x) => x.id === cid) || null;
  }
  function discountFor(total) {
    const c = selectedCoupon();
    if (!c) return 0;
    return Math.min(Number(c.remaining ?? c.value) || 0, total);
  }
  function fillCoupons() {
    const sel = $("#couponSelect"),
      box = $("#couponBox");
    if (!sel) return;
    const list = usableCoupons(session().id);
    const exp =
      typeof couponExpiry === "function"
        ? (c) => new Date(couponExpiry(c)).toLocaleString()
        : () => "";
    const placeholder = list.length ? "Enter coupon" : "No coupon";
    sel.innerHTML =
      `<option value="">${placeholder}</option>` +
      list
        .map(
          (c) =>
            `<option value="${c.id}">${c.code} · ₹${c.remaining ?? c.value} off${typeof couponExpiry === "function" ? ` · expires ${exp(c)}` : ""}</option>`,
        )
        .join("");
    sel.disabled = !list.length;
    if (box) box.classList.toggle("hidden", false);
    sel.onchange = renderFare;
  }
  function renderFare() {
    const recap = $("#routeRecap");
    if (recap) {
      const pick = ($("#pickPlatform").value || "").trim() || "—";
      const drop = ($("#dropPlatform").value || "").trim() || "—";
      recap.textContent = `Pickup point ${pick} → Drop platform ${drop}`;
    }
    const tax = Math.round(base * DUMMY.taxRate),
      g = base + tax,
      disc = discountFor(g),
      pay = Math.max(0, g - disc);
    $("#base").textContent = "₹" + base;
    $("#tax").textContent = "₹" + tax;
    if ($("#discount")) $("#discount").textContent = "₹" + disc;
    $("#total").textContent = "₹" + pay;
    const payBtn = $("#pay");
    if (payBtn)
      payBtn.textContent = pay
        ? `Pay ₹${pay} & Generate Booking ID`
        : "Confirm Booking (₹0)";
  }
  function usedCount(serviceName, station) {
    return get("bookings")
      .filter(
        (x) =>
          x.service === serviceName &&
          x.station === station &&
          x.status !== "Completed" &&
          x.status !== "Rejected",
      )
      .reduce((n, x) => n + (Number(x.passengerCount) || 1), 0);
  }
  function availableVehicles(station) {
    const stock = Number(
      (get("resources").vehicles || []).find((x) => x.station === station)
        ?.count || 0,
    );
    return Math.max(0, stock - usedCount("Inter Vehicle", station));
  }
  function availableWheelchairs(station) {
    const stock = Number(
      (get("resources").wheelchairs || []).find((x) => x.station === station)
        ?.quantity || 0,
    );
    return Math.max(0, stock - usedCount("Wheelchair", station));
  }
  function isPorterStaff(x) {
    const r = String(x.role || "").toLowerCase();
    return r === "porter" || r.includes("porter");
  }
  function isStaffFree(x) {
    const s = String(x.status || "Available")
      .trim()
      .toLowerCase();
    return s !== "unavailable" && s !== "busy" && s !== "offline";
  }
  function availablePorters() {
    const porters = get("staff", []).filter(
      (x) => isPorterStaff(x) && isStaffFree(x),
    );
    const busy = get("bookings")
      .filter(
        (x) =>
          x.service === "Porter" &&
          x.status !== "Completed" &&
          x.status !== "Rejected" &&
          x.staffId,
      )
      .map((x) => x.staffId);
    return Math.max(
      0,
      porters.filter((x) => !busy.includes(x.employeeId)).length,
    );
  }
  function applyPassengerLimit() {
    const input = $("#passengerCount"),
      label = input?.closest("label");
    if (!input || !label) return;
    if (service === "Porter") {
      label.classList.add("hidden");
      input.value = "1";
      return;
    }
    label.classList.remove("hidden");
    const station = $("#station").value;
    let max = DUMMY.limits.passengerMax;
    if (service === "Wheelchair") max = availableWheelchairs(station);
    input.min = 1;
    if (max < 1) {
      input.max = 1;
      input.value = 1;
      return;
    }
    input.max = max;
    const n = Number(input.value) || 1;
    if (n > max) input.value = max;
    if (n < 1) input.value = 1;
  }
  $("#passengerCount")?.addEventListener("input", applyPassengerLimit);
  function showAvailability() {
    const station = $("#station").value;
    let line = "",
      count = 0;
    if (service === "Wheelchair") {
      count = availableWheelchairs(station);
      line = `Number of available Wheelchairs: <b>${count}</b>`;
    } else if (service === "Inter Vehicle") {
      count = availableVehicles(station);
      line = `Number of available Vehicles: <b>${count}</b>`;
    } else {
      count = availablePorters();
      line = `Number of available Porters: <b>${count}</b>`;
    }
    const ok = count > 0;
    $("#avail").innerHTML =
      `${ok ? "✓" : "✗"} ${service} ${ok ? "is" : "is not"} available at ${station}.<br>${line}`;
    applyPassengerLimit();
  }
  $("#next1").onclick = () => {
    const pnrErr = demoPnrError($("#pnr").value);
    if (pnrErr) return toast(pnrErr, true);
    const trainErr = trainNumberError($("#train").value);
    if (trainErr) return toast(trainErr, true);
    const dateErr = bookingDateError($("#date").value);
    if (dateErr) return toast(dateErr, true);
    const timeErr = bookingTimeError($("#bookingTime")?.value);
    if (timeErr) return toast(timeErr, true);
    show(2);
  };
  $$(".choice").forEach(
    (b) =>
      (b.onclick = () => {
        $$(".choice").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        service = b.dataset.service;
        $("#porterDetails").classList.toggle("hidden", service !== "Porter");
        applyPassengerLimit();
        base = calcBase();
      }),
  );
  $("#next2").onclick = () => {
    if (!service) return toast("Select a service.");
    if (service === "Porter") {
      let bags = Number($("#porterBags").value),
        rate = Number($("#porterWeight").value);
      if (
        !Number.isInteger(bags) ||
        bags < 1 ||
        bags > DUMMY.limits.porterBagsMax
      )
        return toast(
          "Enter between 1 and " + DUMMY.limits.porterBagsMax + " bags.",
        );
      if (!rate) return toast("Select a weight range.");
    }
    showAvailability();
    show(3);
  };
  $("#next3").onclick = () => {
    const pick = ($("#pickPlatform").value || "").trim(),
      drop = ($("#dropPlatform").value || "").trim(),
      station = $("#station").value;
    if (!pick) return toast("Enter a pickup point.", true);
    if (!drop) return toast("Enter a drop platform.", true);
    if (pick.toLowerCase() === drop.toLowerCase())
      return toast("Pickup point and drop platform must be different.", true);
    if (service === "Porter") {
      if (availablePorters() < 1)
        return toast("No porters are available.", true);
    } else {
      const count = Number($("#passengerCount").value);
      if (!Number.isInteger(count) || count < 1)
        return toast("Enter a valid number of passengers.");
      if (service === "Inter Vehicle") {
        if (availableVehicles(station) < 1)
          return toast("No vehicles are available at this station.", true);
        if (count > DUMMY.limits.passengerMax)
          return toast(
            "Enter between 1 and " + DUMMY.limits.passengerMax + " passengers.",
          );
      }
      if (service === "Wheelchair") {
        const avail = availableWheelchairs(station);
        if (avail < 1)
          return toast("No wheelchairs are available at this station.", true);
        if (count > avail)
          return toast(
            `Only ${avail} wheelchair(s) available. Reduce the number of passengers.`,
            true,
          );
      }
    }
    base = calcBase();
    fillCoupons();
    renderFare();
    show(4);
  };
  $("#next4").onclick = () => show(5);
  function selectedPay() {
    return $$('input[name="pay"]').find((i) => i.checked)?.value || "upi";
  }
  function cardPayError() {
    const num = ($("#cardNumber")?.value || "").replace(/\s/g, "");
    const name = ($("#cardName")?.value || "").trim();
    const exp = ($("#cardExpiry")?.value || "").trim();
    const cvv = ($("#cardCvv")?.value || "").trim();
    if (!name) return "Enter the name on the card.";
    if (!/^\d{16}$/.test(num)) return "Enter a 16-digit card number.";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) return "Enter expiry as MM/YY.";
    if (!/^\d{3,4}$/.test(cvv)) return "Enter a 3 or 4 digit CVV.";
    return "";
  }
  $("#pay").onclick = () => {
    if (selectedPay() === "card") {
      const err = cardPayError();
      if (err) return toast(err, true);
    }
    let u = session(),
      bags = service === "Porter" ? Number($("#porterBags").value) : 0,
      weightRange =
        service === "Porter"
          ? $("#porterWeight").selectedOptions[0].textContent
          : "";
    const g = gross(),
      c = selectedCoupon(),
      disc = discountFor(g),
      pay = Math.max(0, g - disc);
    const pickVal = ($("#pickPlatform").value || "").trim();
    const dropVal = ($("#dropPlatform").value || "").trim();
    const platVal = journeyPlatform || pickVal;
    const member =
      typeof assignableStaff === "function" ? assignableStaff(service) : null;
    let b = {
      id: id("BK-"),
      passengerId: u.id,
      passenger: u.name,
      service,
      station: $("#station").value,
      platform: platVal,
      date: $("#date").value,
      time: $("#bookingTime").value,
      fare: pay,
      grossFare: g,
      discount: disc,
      couponCode: c ? c.code : "",
      status: member ? "Assigned" : "Booked",
      staffId: member ? member.employeeId : "",
      train: $("#train").value,
      bags,
      weightRange,
      passengerCount: service === "Porter" ? 1 : currentCount(),
      pickPlatform: pickVal,
      dropPlatform: dropVal,
    };
    if (c && disc > 0) spendCoupon(c.id, disc, "booking", b.id);
    let a = get("bookings");
    a.push(b);
    set("bookings", a);
    for (let i = 1; i <= 5; i++) $("#step" + i).classList.add("hidden");
    $(".steps")?.classList.add("hidden");
    $$(".steps [data-step]").forEach((el) =>
      el.classList.remove("active", "done"),
    );
    $("#done").classList.remove("hidden");
    $("#bookingId").textContent = b.id;
    toast("Booking created.");
  };
};
