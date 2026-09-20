const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* Storage helpers: read/write JSON in localStorage */
function get(k, d = []) {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
}
function set(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}
function adoptDefaultPassword(account) {
  if (!account) return account;
  if (!account.password || LEGACY_PASSWORDS.includes(account.password))
    account.password = DEFAULT_PASSWORD;
  return account;
}
function id(p) {
  return p + Date.now().toString().slice(-7);
}
function toast(m, error = false) {
  const x = $("#toast");
  if (!x) return;
  x.textContent = m;
  x.classList.toggle("error", !!error);
  x.classList.add("toast", "show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => x.classList.remove("show"), 3000);
}
function setFieldError(el, msg) {
  const box = typeof el === "string" ? $(el) : el;
  if (!box) return false;
  const text = msg || "";
  box.textContent = text;
  box.classList.toggle("show", !!text);
  box.closest("label")?.classList.toggle("has-error", !!text);
  return false;
}
function fieldOrToast(input, msg) {
  const err = input?.closest("label")?.querySelector(".field-error");
  if (err) return setFieldError(err, msg);
  toast(msg, true);
}

/* Session / navigation */
function session() {
  return get("session", null);
}
function creditPassengerPoints(passengerId, amount, passengerName) {
  const add = Number(amount) || 0;
  if (!add) return 0;
  const list = get("passengers", []);
  const u =
    list.find((x) => x.id === passengerId) ||
    (passengerName
      ? list.find((x) => x.name === passengerName)
      : null);
  if (!u) return 0;
  u.points = (Number(u.points) || 0) + add;
  set("passengers", list);
  const sess = session();
  if (sess && sess.role === "passenger" && sess.id === u.id) {
    sess.points = u.points;
    set("session", sess);
  }
  if (typeof fillWallet === "function") fillWallet();
  const dash = $("#points");
  if (dash) dash.textContent = u.points;
  const rewards = $("#rpoints");
  if (rewards) rewards.textContent = u.points;
  return u.points;
}
function logout() {
  localStorage.removeItem("session");
  location.href = "../index.html";
}
function setActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".app aside nav a").forEach((link) => {
    const target = link.getAttribute("href")?.split("#")[0].split("?")[0];
    link.classList.toggle("active", target === current);
  });
}
function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/* Pop-up forms and read-only details */
function openFormModal({ title, fields, submit = "Save" }) {
  return new Promise((resolve) => {
    let wrap = $("#appModal");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "appModal";
      wrap.className = "modal hidden";
      document.body.appendChild(wrap);
    }
    wrap.innerHTML = `<div class="modalbox"><button class="close-btn" type="button" aria-label="Close">✕</button><h2>${escHtml(title)}</h2><form id="appModalForm">${fields.map((f) => `<label>${escHtml(f.label)}<input name="${escHtml(f.id)}" value="${escHtml(f.value ?? "")}" type="${escHtml(f.type || "text")}" ${f.required === false ? "" : "required"}></label>`).join("")}<button class="btn full" type="submit">${escHtml(submit)}</button></form></div>`;
    wrap.classList.remove("hidden");
    const done = (v) => {
      if (wrap.classList.contains("hidden")) return;
      wrap.classList.add("hidden");
      resolve(v);
    };
    wrap.querySelector(".close-btn").onclick = () => done(null);
    wrap.onclick = (e) => {
      if (e.target === wrap) done(null);
    };
    wrap.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target),
        vals = {};
      fields.forEach((f) => (vals[f.id] = String(fd.get(f.id) || "").trim()));
      done(vals);
    };
    setTimeout(() => wrap.querySelector("input")?.focus(), 30);
  });
}
function openDetailsModal({ title, fields }) {
  let wrap = $("#appModal");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "appModal";
    wrap.className = "modal hidden";
    document.body.appendChild(wrap);
  }
  wrap.innerHTML = `<div class="modalbox detail"><button class="close-btn" type="button" aria-label="Close">✕</button><h2>${escHtml(title)}</h2>${(fields || []).map((f) => `<div class="details-field"><label>${escHtml(f.label)}</label><div>${escHtml(f.value ?? "—")}</div></div>`).join("")}</div>`;
  wrap.classList.remove("hidden");
  const done = () => wrap.classList.add("hidden");
  wrap.querySelector(".close-btn").onclick = done;
  wrap.onclick = (e) => {
    if (e.target === wrap) done();
  };
}

/* Number / alphabet field helpers used on booking and feedback forms */
function complaintBookingId(x) {
  if (x && x.bookingId) return x.bookingId;
  const pid = x && x.passengerId;
  if (!pid) return "";
  const list = get("bookings", [])
    .filter((b) => b.passengerId === pid)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return (list[0] && list[0].id) || "";
}
function bindDigits(el, maxLen) {
  if (!el || el.dataset.digitsBound) return;
  el.dataset.digitsBound = "1";
  el.setAttribute("inputmode", "numeric");
  el.setAttribute("maxlength", String(maxLen));
  el.setAttribute("pattern", `[0-9]{1,${maxLen}}`);
  const clean = () => {
    const d = String(el.value || "")
      .replace(/\D/g, "")
      .slice(0, maxLen);
    if (el.value !== d) el.value = d;
  };
  el.addEventListener("input", clean);
  el.addEventListener("paste", (e) => {
    e.preventDefault();
    el.value = ((e.clipboardData || window.clipboardData).getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, maxLen);
  });
}
function bindAlphaText(el) {
  if (!el || el.dataset.alphaBound) return;
  el.dataset.alphaBound = "1";
  el.addEventListener("input", () => {
    const cleaned = String(el.value || "")
      .replace(/[^A-Za-z ]/g, "")
      .replace(/ {2,}/g, " ");
    if (el.value !== cleaned) el.value = cleaned;
  });
}

/* Booking pick-up / drop and staff assignment */
function bookingPick(b) {
  return String((b && b.pickPlatform) || "").trim();
}
function bookingDrop(b) {
  return String((b && b.dropPlatform) || "").trim();
}
function bookingWhen(b) {
  const d = String((b && b.date) || "").trim();
  const t = String((b && b.time) || "").trim();
  if (!d && !t) return "—";
  if (d && t) return d + " · " + t;
  return d || t;
}
function bookingRoute(b) {
  const pick = bookingPick(b) || "—",
    drop = bookingDrop(b) || "—";
  return `Pickup point ${pick} → Drop point ${drop}`;
}
function staffDisplayName(staffId) {
  if (!staffId) return "";
  const x = get("staff", []).find(
    (y) => y.employeeId === staffId || y.id === staffId,
  );
  return (x && x.name) || String(staffId);
}
function staffMatchesService(staff, service) {
  const r = String((staff && staff.role) || "").toLowerCase();
  const s = String(service || "").toLowerCase();
  if (s.includes("porter")) return r.includes("porter");
  if (s.includes("wheelchair")) return r.includes("wheelchair");
  if (s.includes("vehicle"))
    return r.includes("vehicle") || r.includes("driver");
  return false;
}
function assignableStaff(service) {
  const busy = new Set(
    get("bookings", [])
      .filter(
        (b) => b.staffId && b.status !== "Completed" && b.status !== "Rejected",
      )
      .map((b) => b.staffId),
  );
  return (
    get("staff", []).find(
      (x) =>
        staffMatchesService(x, service) &&
        String(x.status || "Available").toLowerCase() === "available" &&
        !busy.has(x.employeeId) &&
        !busy.has(x.id),
    ) || null
  );
}
function confirmAction({
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirm = "Yes",
  cancel = "Cancel",
} = {}) {
  return new Promise((resolve) => {
    let wrap = $("#confirmModal");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "confirmModal";
      wrap.className = "modal hidden";
      document.body.appendChild(wrap);
    }
    wrap.innerHTML = `<div class="modalbox"><button class="close-btn" type="button" aria-label="Close">✕</button><h2>${escHtml(title)}</h2><p>${escHtml(message)}</p><div class="modal-actions"><button type="button" class="btn outline" data-cancel>${escHtml(cancel)}</button><button type="button" class="btn danger" data-ok>${escHtml(confirm)}</button></div></div>`;
    wrap.classList.remove("hidden");
    const done = (v) => {
      if (wrap.classList.contains("hidden")) return;
      wrap.classList.add("hidden");
      resolve(v);
    };
    wrap.querySelector(".close-btn").onclick = () => done(false);
    wrap.querySelector("[data-cancel]").onclick = () => done(false);
    wrap.querySelector("[data-ok]").onclick = () => done(true);
    wrap.onclick = (e) => {
      if (e.target === wrap) done(false);
    };
  });
}
function wasteStatus(x) {
  const s = String((x && x.status) || "").toLowerCase();
  if (s === "submitted") return "pending";
  if (s === "approved") return "accepted";
  return s || "pending";
}
function wasteStatusLabel(x) {
  const s = wasteStatus(x);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function listQuery(sel) {
  return ($(sel)?.value || "").trim().toLowerCase();
}
function textMatch(q, ...vals) {
  if (!q) return true;
  return vals.some((v) =>
    String(v || "")
      .toLowerCase()
      .includes(q),
  );
}
function paginate(items, page, size = 5) {
  const pages = Math.max(1, Math.ceil((items.length || 0) / size));
  const p = Math.min(Math.max(1, Number(page) || 1), pages);
  return {
    page: p,
    pages,
    slice: items.slice((p - 1) * size, p * size),
    empty: !items.length,
  };
}
function fillPager(sel, page, pages) {
  const el = $(sel);
  if (!el) return;
  el.innerHTML = !pages
    ? ""
    : `<button type="button" class="btn sm outline" data-list-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Prev</button><span>Page ${page} of ${pages}</span><button type="button" class="btn sm outline" data-list-page="${page + 1}" ${page >= pages ? "disabled" : ""}>Next</button>`;
}
function attachList(searchSel, pagerSel, state, draw) {
  $(searchSel)?.addEventListener("input", () => {
    state.page = 1;
    draw();
  });
  $(pagerSel)?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-list-page]");
    if (!b || b.disabled) return;
    const p = +b.dataset.listPage;
    if (!p || p < 1) return;
    state.page = p;
    draw();
  });
}

/* Reward coupons (points × 0.5, expire after 24 hours) */
function couponValueFromPoints(pts) {
  return Math.round(
    Math.max(0, Number(pts) || 0) * DUMMY.rewards.couponPointRate,
  );
}
function couponTtl() {
  return DUMMY.rewards.couponTtlMs;
}
function couponExpiry(c) {
  return Number(c && c.expiresAt) || ((c && c.createdAt) || 0) + couponTtl();
}
function couponIsExpired(c) {
  return (c.status || "") !== "Used" && Date.now() >= couponExpiry(c);
}
function expireStaleCoupons() {
  const all = get("coupons", []);
  let n = 0;
  all.forEach((c) => {
    if (!c.expiresAt && c.createdAt) c.expiresAt = couponExpiry(c);
    if (c.status === "Used" || c.status === "Expired") return;
    if (couponIsExpired(c)) {
      c.status = "Expired";
      n++;
    }
  });
  if (n) set("coupons", all);
}
function listCoupons(pid) {
  expireStaleCoupons();
  return get("coupons", [])
    .filter((x) => x.passengerId === pid)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
function usableCoupons(pid) {
  return listCoupons(pid).filter(
    (x) =>
      x.status !== "Used" &&
      x.status !== "Expired" &&
      (x.remaining ?? x.value) > 0,
  );
}
function spendCoupon(couponId, amount, usedFor, usedOn) {
  expireStaleCoupons();
  const all = get("coupons", []),
    x = all.find((y) => y.id === couponId);
  if (!x || x.status === "Used" || x.status === "Expired" || couponIsExpired(x))
    return 0;
  const have = Number(x.remaining ?? x.value) || 0,
    take = Math.min(have, Math.max(0, Number(amount) || 0));
  x.remaining = have - take;
  if (x.remaining <= 0) {
    x.remaining = 0;
    x.status = "Used";
  }
  x.usedFor = usedFor;
  x.usedOn = usedOn;
  x.usedAt = Date.now();
  set("coupons", all);
  return take;
}
function couponCode(value) {
  return (
    "EA" +
    String(value) +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

/* Demo tickets and journey gate before booking / waste upload */
function journeyValidation() {
  let u = session();
  if (!u || u.role !== "passenger") return null;
  return (
    get("journeyValidations", []).find(
      (x) => x.passengerId === u.id && x.valid === true,
    ) || null
  );
}
function requireJourney() {
  let u = session();
  if (!u || u.role !== "passenger") {
    location.href = "../login.html";
    return null;
  }
  if (!journeyValidation()) {
    toast(
      "Please validate your journey before booking a service or uploading waste proof.",
    );
    setTimeout(() => (location.href = "journey-validation.html"), 450);
    return null;
  }
  return u;
}
function seed() {
  if (get("seeded", false)) return;
  const s = DUMMY.seed;
  set("passengers", s.passengers.map((x) => ({ ...x })));
  set("staff", s.staff.map((x) => ({ ...x })));
  set("bookings", s.bookings.map((x) => ({ ...x })));
  set("waste", []);
  set("complaints", []);
  set("redemptions", []);
  set("resources", {
    wheelchairs: s.resources.wheelchairs.map((x) => ({ ...x })),
    vehicles: s.resources.vehicles.map((x) => ({ ...x })),
  });
  set("admins", s.admins.map((x) => ({ ...x })));
  set("seeded", true);
}
seed();
// Ensure starter accounts exist. Default password is applied only for
// new accounts or leftover demo passwords — never after register/reset.
(function ensureDemoAccounts() {
  const passengers = get("passengers", []),
    staff = get("staff", []),
    admins = get("admins", []);
  const demoMobile = DUMMY.demoPassengerMobile;
  const isDemoP = (x) =>
    String(x.mobile || "")
      .replace(/\D/g, "")
      .slice(-10) === demoMobile;
  const copy = (x) => ({ ...x });
  if (!passengers.some(isDemoP))
    passengers.push(copy(DUMMY.seed.passengers[0]));
  DUMMY.seed.staff.forEach((row) => {
    if (!staff.some((x) => x.employeeId === row.employeeId))
      staff.push(copy(row));
  });
  if (
    !admins.some(
      (x) => String(x.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    )
  )
    admins.push(copy(DUMMY.seed.admins[0]));
  if (!get("demoPoints320", false)) {
    const demoP = passengers.find(isDemoP);
    if (demoP && (demoP.points == null || demoP.points === ""))
      demoP.points = DUMMY.seed.passengers[0].points;
    set("demoPoints320", true);
  }
  const demo = staff.find((x) => x.employeeId === DUMMY.demoStaffId);
  if (demo) {
    demo.role = "Porter";
    demo.status = demo.status || "Available";
  }
  if (!get("pwdMigratedTest123", false)) {
    passengers.forEach(adoptDefaultPassword);
    staff.forEach(adoptDefaultPassword);
    admins.forEach(adoptDefaultPassword);
    set("pwdMigratedTest123", true);
  }
  set("passengers", passengers);
  set("staff", staff);
  set("admins", admins);
})();
(function migrateBookingRoute() {
  const a = get("bookings", []);
  let n = 0;
  a.forEach((b) => {
    if (!b.pickPlatform && b.platform) {
      b.pickPlatform = String(b.platform);
      n++;
    }
    if (!b.dropPlatform && (b.pickPlatform || b.platform)) {
      const p = Number(b.pickPlatform || b.platform);
      b.dropPlatform = Number.isInteger(p)
        ? String(p >= 20 ? p - 1 : p + 1)
        : String(b.pickPlatform || b.platform);
      n++;
    }
  });
  if (n) set("bookings", a);
})();
(function migrateSeedPickupPoints() {
  const seed = {
    "BK-240101": {
      pickPlatform: "Main entrance, Gate 2",
      dropPlatform: "Platform 5 waiting hall",
    },
    "BK-240102": {
      pickPlatform: "Taxi stand",
      dropPlatform: "Platform 1",
    },
  };
  const a = get("bookings", []);
  let n = 0;
  a.forEach((b) => {
    const m = seed[b.id];
    if (!m) return;
    const pick = String(b.pickPlatform || "").trim();
    const drop = String(b.dropPlatform || "").trim();
    if (!pick || pick === String(b.platform || "") || /^\d+$/.test(pick)) {
      b.pickPlatform = m.pickPlatform;
      n++;
    }
    if (!drop || /^\d+$/.test(drop)) {
      b.dropPlatform = m.dropPlatform;
      n++;
    }
  });
  if (n) set("bookings", a);
})();
(function migrateIndianMobiles() {
  const passengers = get("passengers", []);
  let changed = false;
  passengers.forEach((p) => {
    const n = storeIndianMobile(p.mobile);
    if (n && p.mobile !== n) {
      p.mobile = n;
      changed = true;
    }
  });
  if (changed) set("passengers", passengers);
  const sess = get("session", null);
  if (sess && sess.mobile) {
    const n = storeIndianMobile(sess.mobile);
    if (n && sess.mobile !== n) {
      sess.mobile = n;
      set("session", sess);
    }
  }
})();
function bindPersonName(el) {
  if (!el || el.dataset.nameBound) return;
  if ((el.tagName || "") !== "INPUT") return;
  const max = DUMMY.limits.nameMaxLength;
  el.dataset.nameBound = "1";
  el.setAttribute("maxlength", String(max));
  el.setAttribute("pattern", `[A-Za-z ]{1,${max}}`);
  el.setAttribute("autocomplete", "name");
  el.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Enter",
        "Escape",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key)
    )
      return;
    const selStart = el.selectionStart || 0,
      selEnd = el.selectionEnd || 0;
    if (e.key.length === 1 && !/[A-Za-z ]/.test(e.key)) {
      e.preventDefault();
      fieldOrToast(el, "Full name can contain alphabets and spaces only.");
      return;
    }
    if (e.key === " " && (selStart === 0 || el.value[selStart - 1] === " ")) {
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && /[A-Za-z ]/.test(e.key)) {
      const next = el.value.slice(0, selStart) + e.key + el.value.slice(selEnd);
      if (next.length > max) {
        e.preventDefault();
        fieldOrToast(el, personNameError(next) || "Full name cannot be more than " + max + " characters.");
      }
    }
  });
  el.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted =
      (e.clipboardData || window.clipboardData).getData("text") || "";
    const cleaned = pasted
      .replace(/[^A-Za-z ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
    if (pasted && !cleaned) {
      fieldOrToast(el, "Full name can contain alphabets and spaces only.");
      return;
    }
    el.value = cleaned;
    if (/[^A-Za-z ]/.test(pasted))
      fieldOrToast(el, "Full name can contain alphabets and spaces only.");
    else if (pasted.replace(/\s+/g, " ").trim().length > max)
      fieldOrToast(el, "Full name cannot be more than " + max + " characters.");
  });
  el.addEventListener("input", () => {
    const raw = el.value;
    let cleaned = raw.replace(/[^A-Za-z ]/g, "").replace(/ {2,}/g, " ");
    if (cleaned.startsWith(" ")) cleaned = cleaned.trimStart();
    if (cleaned.length > max) {
      cleaned = cleaned.slice(0, max);
      fieldOrToast(el, "Full name cannot be more than " + max + " characters.");
    } else if (/[^A-Za-z ]/.test(raw))
      fieldOrToast(el, "Full name can contain alphabets and spaces only.");
    if (el.value !== cleaned) el.value = cleaned;
  });
}
function bindEmail(el, enabled) {
  if (!el) return () => {};
  if ((el.tagName || "") !== "INPUT") return () => {};
  const on = () =>
    typeof enabled === "function" ? enabled() : enabled !== false;
  function check() {
    if (!on()) return true;
    const v = el.value.trim();
    if (!v) return true;
    const err = emailError(v);
    if (err) {
      fieldOrToast(el, err);
      return false;
    }
    return true;
  }
  if (el.dataset.emailBound) return check;
  el.dataset.emailBound = "1";
  el.setAttribute("type", "email");
  el.setAttribute("autocomplete", "email");
  el.addEventListener("blur", () => {
    if (!on()) return;
    if (el.closest("#registerForm,#otp")) return;
    check();
  });
  el.addEventListener("paste", () =>
    setTimeout(() => {
      if (on()) check();
    }, 0),
  );
  return check;
}
function wrapPhoneField(el) {
  if (!el) return null;
  const existing = el.closest(".phone-field");
  if (existing) return existing;
  const wrap = document.createElement("span");
  wrap.className = "phone-field";
  const code = document.createElement("span");
  code.className = "phone-code";
  code.textContent = "+91";
  code.title = "India";
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(code);
  wrap.appendChild(el);
  return wrap;
}
function bindIndianMobile(el, enabled) {
  if (!el) return () => {};
  const on = () =>
    typeof enabled === "function" ? enabled() : enabled !== false;
  wrapPhoneField(el);
  function applyAttrs() {
    const wrap = el.closest(".phone-field");
    wrap?.classList.toggle("is-plain", !on());
    if (on()) {
      el.setAttribute("type", "tel");
      el.setAttribute("inputmode", "numeric");
      el.setAttribute("maxlength", String(DUMMY.limits.mobileLength));
      el.setAttribute("pattern", "[6-9][0-9]{9}");
      el.setAttribute("autocomplete", "tel");
      el.setAttribute("placeholder", DUMMY.demoPassengerMobile);
    } else {
      el.setAttribute("type", "text");
      el.removeAttribute("inputmode");
      el.removeAttribute("maxlength");
      el.removeAttribute("pattern");
      el.removeAttribute("autocomplete");
    }
  }
  if (el.dataset.mobileBound) {
    applyAttrs();
    return applyAttrs;
  }
  el.dataset.mobileBound = "1";
  applyAttrs();
  el.addEventListener("keydown", (e) => {
    if (!on()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Enter",
        "Escape",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key)
    )
      return;
    if (e.key.length === 1 && !/\d/.test(e.key)) {
      e.preventDefault();
      fieldOrToast(el, "Enter numbers only.");
      return;
    }
    const selStart = el.selectionStart || 0,
      selEnd = el.selectionEnd || 0;
    if (/\d/.test(e.key)) {
      const next = digitsOnly(
        el.value.slice(0, selStart) + e.key + el.value.slice(selEnd),
      );
      if (next[0] && !/^[6-9]/.test(next[0])) {
        e.preventDefault();
        fieldOrToast(el, "Indian mobile number must start with 6, 7, 8 or 9.");
        return;
      }
    }
    const selected = selEnd - selStart;
    if (
      /\d/.test(e.key) &&
      digitsOnly(el.value).length >= 10 &&
      selected === 0
    ) {
      e.preventDefault();
      fieldOrToast(el, "Indian mobile number cannot be more than 10 digits.");
    }
  });
  el.addEventListener("paste", (e) => {
    if (!on()) return;
    e.preventDefault();
    const pasted =
      (e.clipboardData || window.clipboardData).getData("text") || "";
    const d = indianLocalDigits(pasted);
    if (pasted && !d) {
      fieldOrToast(el, "Enter numbers only.");
      return;
    }
    el.value = d;
    if (d[0] && !/^[6-9]/.test(d[0])) {
      el.value = "";
      fieldOrToast(el, "Indian mobile number must start with 6, 7, 8 or 9.");
      return;
    }
    if (digitsOnly(pasted).replace(/^91/, "").length > 10)
      fieldOrToast(el, "Indian mobile number cannot be more than 10 digits.");
  });
  el.addEventListener("input", () => {
    if (!on()) return;
    const raw = el.value,
      d = digitsOnly(raw);
    if (raw !== d.slice(0, 10)) {
      const tooLong = d.length > 10;
      el.value = d.slice(0, 10);
      if (tooLong)
        fieldOrToast(el, "Indian mobile number cannot be more than 10 digits.");
      else if (/\D/.test(raw)) fieldOrToast(el, "Enter numbers only.");
    }
    const kept = digitsOnly(el.value);
    if (kept[0] && !/^[6-9]/.test(kept[0])) {
      el.value = "";
      fieldOrToast(el, "Indian mobile number must start with 6, 7, 8 or 9.");
    }
  });
  return applyAttrs;
}
function bindPasswordToggle(el) {
  if (!el || el.dataset.pwToggleBound) return;
  if (el.closest(".password-field")) {
    el.dataset.pwToggleBound = "1";
    return;
  }
  el.dataset.pwToggleBound = "1";
  const wrap = document.createElement("span");
  wrap.className = "password-field";
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "password-toggle";
  btn.setAttribute("aria-label", "Show password");
  const eye = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOff = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/></svg>`;
  btn.innerHTML = eye;
  wrap.appendChild(btn);
  btn.addEventListener("click", () => {
    const show = el.type === "password";
    el.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.innerHTML = show ? eyeOff : eye;
  });
}
function bindAllPasswordToggles() {
  document.querySelectorAll('input[type="password"]').forEach(bindPasswordToggle);
}

/* Run on every page: logout, nav highlight, login/register forms */
document.addEventListener("DOMContentLoaded", () => {
  if (!$("#toast")) {
    const t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  $("[data-logout]")?.addEventListener("click", logout);
  $("#menu")?.addEventListener("click", () =>
    document.querySelector("aside")?.classList.toggle("open"),
  );
  setActiveNav();
  fillUserHeader();
  fillWallet();
  bindAllPasswordToggles();
  if ($("#loginForm")) initLogin();
  if ($("#registerForm")) initRegister();
  bindIndianMobile($("#mobile"));
  bindIndianMobile($("#pmobile"));
  const syncForgot = bindIndianMobile(
    $("#fidentity"),
    () => $("#frole")?.value !== "staff",
  );
  $("#frole")?.addEventListener("change", syncForgot);
  ["#name", "#pname"].forEach((s) => bindPersonName($(s)));
  ["#email", "#pemail"].forEach((s) => bindEmail($(s)));
});
function sessionRoleLabel(s) {
  const r = String((s && s.role) || "").toLowerCase();
  if (r === "passenger") return "Passenger";
  if (r === "staff") {
    const rec = get("staff", []).find(
      (x) => x.employeeId && x.employeeId === s.employeeId,
    );
    const job = String((rec && rec.role) || s.staffRole || "").trim();
    if (job && job.toLowerCase() !== "staff") return job;
    return "Staff";
  }
  return "";
}
function fillUserHeader() {
  const el = $("#user");
  const s = session();
  if (!el || !s) return;
  const name = s.name || "User";
  const role = sessionRoleLabel(s);
  if (!role) {
    el.textContent = name;
    return;
  }
  el.innerHTML =
    `<span class="user-name">${escHtml(name)}</span>` +
    `<span class="user-role">${escHtml(role)}</span>`;
}
window.fillUserHeader = fillUserHeader;
function fillWallet() {
  const el = $("#walletPoints");
  if (!el) return;
  const s = session();
  if (s) {
    const me = get("passengers", []).find((x) => x.id === s.id) || s;
    el.textContent = Number(me.points) || 0;
  }
  const icon = $(".wallet-icon");
  if (icon && !icon.querySelector("img"))
    icon.innerHTML = '<img src="../images/wallet.png" alt="">';
}
function initLogin() {
  let role = "passenger";
  function showIdError(msg) {
    setFieldError("#identityError", msg);
    return false;
  }
  function showPwError(msg) {
    setFieldError("#passwordError", msg);
    return false;
  }
  function clearLoginErrors() {
    setFieldError("#identityError", "");
    setFieldError("#passwordError", "");
  }
  function validateIdentity() {
    const value = $("#identity").value.trim();
    setFieldError("#identityError", "");
    if (!value)
      return showIdError(
        role === "passenger"
          ? "Mobile number is required."
          : role === "staff"
            ? "Employee ID is required."
            : "Email is required.",
      );
    if (role === "passenger") {
      const err = indianMobileError(value);
      if (err) return showIdError(err);
    }
    if (role === "admin") {
      const err = emailError(value);
      if (err) return showIdError(err);
    }
    return true;
  }
  const roleButtons = $$("[data-role]");
  const syncMobile = bindIndianMobile(
    $("#identity"),
    () => role === "passenger",
  );
  roleButtons.forEach(
    (b) =>
      (b.onclick = () => {
        role = (b.dataset.role || "passenger").toLowerCase();
        roleButtons.forEach((x) => x.classList.toggle("active", x === b));
        $("#idLabel").firstChild.textContent =
          role === "passenger"
            ? "Mobile Number"
            : role === "staff"
              ? "Employee ID"
              : "Email";
        $("#identity").placeholder =
          role === "passenger"
            ? DUMMY.demoPassengerMobile
            : role === "staff"
              ? DUMMY.demoStaffId
              : ADMIN_EMAIL;
        clearLoginErrors();
        $("#identity").value = "";
        $("#password").value = "";
        syncMobile();
      }),
  );
  $("#identity").addEventListener("input", () =>
    setFieldError("#identityError", ""),
  );
  $("#password").addEventListener("input", () =>
    setFieldError("#passwordError", ""),
  );
  $("#identity").addEventListener("blur", validateIdentity);
  $("#loginForm").onsubmit = (e) => {
    e.preventDefault();
    clearLoginErrors();
    if (!validateIdentity()) return;
    const a = $("#identity").value.trim(),
      p = $("#password").value;
    if (!p) return showPwError("Password is required.");
    let u = null;
    if (role === "passenger") {
      const acc = get("passengers", []).find((x) =>
        sameIndianMobile(x.mobile, a),
      );
      if (!acc) return showIdError("No account found with this mobile number.");
      if (acc.password !== p) return showPwError("Incorrect password.");
      u = acc;
    } else if (role === "staff") {
      const acc = get("staff", []).find(
        (x) => x.employeeId.toUpperCase() === a.toUpperCase(),
      );
      if (!acc)
        return showIdError("No staff account found with this Employee ID.");
      if (acc.password !== p) return showPwError("Incorrect password.");
      u = acc;
    } else {
      const acc = get("admins", []).find(
        (x) => String(x.email || "").toLowerCase() === a.toLowerCase(),
      );
      if (!acc) return showIdError("No admin account found with this email.");
      if (acc.password !== p) return showPwError("Incorrect password.");
      u = acc;
    }
    set("session", { ...u, role });
    location.href =
      role === "passenger"
        ? "passenger/dashboard.html"
        : role === "staff"
          ? "staff/dashboard.html"
          : "admin/dashboard.html";
  };
}
function attachRegisterBlur(fields) {
  fields.forEach((f) => {
    const el = $(f.input);
    if (!el || el.dataset.blurCheckBound) return;
    el.dataset.blurCheckBound = "1";
    el.addEventListener("blur", () => setFieldError(f.error, f.check() || ""));
    el.addEventListener("input", () => setFieldError(f.error, ""));
  });
}
function initRegister() {
  function err(id, msg) {
    setFieldError(id, msg);
    return false;
  }
  if ($("#demoOtpValue")) $("#demoOtpValue").textContent = DUMMY.demoOtp;
  if ($("#otpInput")) {
    $("#otpInput").placeholder = DUMMY.demoOtp;
    $("#otpInput").maxLength = DUMMY.limits.otpLength;
  }
  function clearReg() {
    [
      "#nameError",
      "#mobileError",
      "#emailError",
      "#pwError",
      "#cpwError",
    ].forEach((s) => setFieldError(s, ""));
  }
  attachRegisterBlur([
    {
      input: "#name",
      error: "#nameError",
      check: () => personNameError($("#name").value),
    },
    {
      input: "#mobile",
      error: "#mobileError",
      check: () => indianMobileError($("#mobile").value),
    },
    {
      input: "#email",
      error: "#emailError",
      check: () => emailError($("#email").value),
    },
    {
      input: "#pw",
      error: "#pwError",
      check: () => passwordError($("#pw").value),
    },
    {
      input: "#cpw",
      error: "#cpwError",
      check: () => {
        const p = $("#pw").value,
          c = $("#cpw").value;
        if (!c) return "Confirm password is required.";
        if (p !== c) return "Passwords do not match.";
        return "";
      },
    },
  ]);
  $("#otpInput")?.addEventListener("blur", () => {
    const otp = ($("#otpInput").value || "").trim();
    if (!otp) return setFieldError("#otpError", otpError(""));
    const bad = otpError(otp);
    if (bad) setFieldError("#otpError", bad);
  });
  $("#registerForm").onsubmit = (e) => {
    e.preventDefault();
    clearReg();
    const nameErr = personNameError($("#name").value);
    if (nameErr) return err("#nameError", nameErr);
    const mobileErr = indianMobileError($("#mobile").value);
    if (mobileErr) return err("#mobileError", mobileErr);
    const emailErr = emailError($("#email").value);
    if (emailErr) return err("#emailError", emailErr);
    const p = $("#pw").value;
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(p))
      return err(
        "#pwError",
        "Password needs 8+ chars, upper, lower and number.",
      );
    if (p !== $("#cpw").value)
      return err("#cpwError", "Passwords do not match.");
    const m = storeIndianMobile($("#mobile").value);
    if (get("passengers").some((x) => sameIndianMobile(x.mobile, m)))
      return err("#mobileError", "Mobile already registered.");
    set("pending", {
      id: id("P"),
      name: $("#name").value.replace(/\s+/g, " ").trim(),
      mobile: m,
      email: $("#email").value.trim(),
      password: p,
      points: 0,
    });
    $("#otpInput").value = "";
    setFieldError("#otpError", "");
    $("#otp").classList.remove("hidden");
    setTimeout(() => $("#otpInput")?.focus(), 50);
  };
  $("#otpInput")?.addEventListener("input", () => {
    $("#otpInput").value = $("#otpInput").value
      .replace(/\D/g, "")
      .slice(0, DUMMY.limits.otpLength);
    setFieldError("#otpError", "");
  });
  $("#verify").onclick = () => {
    const otp = ($("#otpInput").value || "").trim();
    setFieldError("#otpError", "");
    const bad = otpError(otp);
    if (bad) return err("#otpError", bad);
    let u = get("pending");
    let a = get("passengers");
    a.push(u);
    set("passengers", a);
    set("session", { role: "passenger", ...u });
    localStorage.removeItem("pending");
    location.href = "passenger/dashboard.html";
  };
}
