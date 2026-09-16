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
function alphaTextError(value, label = "This field") {
  const n = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return label + " is required.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(n))
    return label + " can contain alphabets only.";
  return "";
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
function trainNumberError(value) {
  const d = String(value || "").replace(/\D/g, "");
  if (!d) return "Train number is required.";
  if (!/^\d{5}$/.test(d)) return "Train number must be exactly 5 digits.";
  return "";
}
function platformError(value, label = "Platform number") {
  const d = String(value || "").replace(/\D/g, "");
  if (!d) return label + " is required.";
  const n = Number(d);
  if (!Number.isInteger(n) || n < 1 || n > 20)
    return "Enter a platform number from 1 to 20.";
  return "";
}

/* Booking pick-up / drop and staff assignment */
function bookingPick(b) {
  return String((b && (b.pickPlatform || b.platform)) || "").trim();
}
function bookingDrop(b) {
  return String((b && b.dropPlatform) || "").trim();
}
function bookingRoute(b) {
  const pick = bookingPick(b) || "—",
    drop = bookingDrop(b) || "—";
  return `Pick ${pick} → Drop ${drop}`;
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
  return Math.round(Math.max(0, Number(pts) || 0) * 0.5);
}
function couponTtl() {
  return 24 * 60 * 60 * 1000;
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
const DEMO_PNRS = [
  {
    pnr: "4521987630",
    train: "12951",
    station: "Mumbai Central",
    platform: "4",
  },
  { pnr: "6109873421", train: "11010", station: "Thane", platform: "2" },
  {
    pnr: "8234561907",
    train: "12127",
    station: "Pune Junction",
    platform: "1",
  },
];

/* Demo tickets and journey gate before booking / waste upload */
function findDemoPnr(value) {
  const p = String(value || "").replace(/\D/g, "");
  return DEMO_PNRS.find((x) => x.pnr === p) || null;
}
function demoPnrError(value) {
  const p = String(value || "").replace(/\D/g, "");
  if (!p) return "PNR is required.";
  if (!/^\d{10}$/.test(p)) return "PNR must contain exactly 10 digits.";
  if (!findDemoPnr(p)) return "Invalid PNR. Use one of the demo ticket PNRs.";
  return "";
}
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
  set("passengers", [
    {
      id: "P1001",
      name: "Rahul Sharma",
      mobile: "+919876543210",
      email: "rahul@example.com",
      password: "Passenger@123",
      points: 320,
    },
    {
      id: "P1002",
      name: "Anita Patil",
      mobile: "+919988776655",
      email: "anita@example.com",
      password: "Passenger@123",
      points: 180,
    },
  ]);
  set("staff", [
    {
      id: "STF1001",
      employeeId: "STF1001",
      name: "Priya Joshi",
      password: "Staff@123",
      role: "Porter",
      status: "Available",
    },
    {
      id: "STF1002",
      employeeId: "STF1002",
      name: "Amit Verma",
      password: "Staff@123",
      role: "Wheelchair",
      status: "Available",
    },
  ]);
  set("bookings", [
    {
      id: "BK-240101",
      passengerId: "P1001",
      passenger: "Rahul Sharma",
      service: "Wheelchair",
      station: "Mumbai Central",
      platform: "4",
      date: "2026-09-15",
      time: "10:30",
      fare: 105,
      status: "Assigned",
      staffId: "STF1002",
      train: "12951",
    },
    {
      id: "BK-240102",
      passengerId: "P1002",
      passenger: "Anita Patil",
      service: "Porter",
      station: "Thane",
      platform: "2",
      date: "2026-09-16",
      time: "16:00",
      fare: 158,
      status: "Booked",
      staffId: "",
      train: "11010",
    },
  ]);
  set("waste", []);
  set("complaints", []);
  set("redemptions", []);
  set("rewards", [
    {
      id: "R1",
      name: "Free Tea Coupon",
      points: 100,
      description: "Free tea coupon",
    },
    {
      id: "R2",
      name: "Waiting Room Access",
      points: 250,
      description: "Waiting room access",
    },
    {
      id: "R3",
      name: "Discount Voucher",
      points: 400,
      description: "₹100 discount voucher",
    },
  ]);
  set("resources", {
    wheelchairs: [
      { id: "WC1", station: "Mumbai Central", quantity: 8 },
      { id: "WC2", station: "Thane", quantity: 6 },
    ],
    vehicles: [
      { id: "V1", station: "Mumbai Central", count: 6 },
      { id: "V2", station: "Thane", count: 5 },
    ],
  });
  set("seeded", true);
}
seed();
// Always make sure demo accounts exist, even if LocalStorage was created by an older project version.
(function ensureDemoAccounts() {
  const passengers = get("passengers", []),
    staff = get("staff", []);
  const isDemoP = (x) =>
    String(x.mobile || "")
      .replace(/\D/g, "")
      .slice(-10) === "9876543210";
  if (!passengers.some(isDemoP))
    passengers.push({
      id: "P1001",
      name: "Rahul Sharma",
      mobile: "+919876543210",
      email: "rahul@example.com",
      password: "Passenger@123",
      points: 320,
    });
  if (!staff.some((x) => x.employeeId === "STF1001"))
    staff.push({
      id: "STF1001",
      employeeId: "STF1001",
      name: "Priya Joshi",
      password: "Staff@123",
      role: "Porter",
      status: "Available",
    });
  if (!staff.some((x) => x.employeeId === "STF1002"))
    staff.push({
      id: "STF1002",
      employeeId: "STF1002",
      name: "Amit Verma",
      password: "Staff@123",
      role: "Wheelchair",
      status: "Available",
    });
  if (!get("demoPoints320", false)) {
    const demoP = passengers.find(isDemoP);
    if (demoP) demoP.points = 320;
    set("demoPoints320", true);
  }
  // Repair the demo password if it was changed/corrupted in an earlier local run.
  const demo = staff.find((x) => x.employeeId === "STF1001");
  if (demo) {
    demo.password = "Staff@123";
    demo.role = "Porter";
    demo.status = demo.status || "Available";
  }
  set("passengers", passengers);
  set("staff", staff);
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
function digitsOnly(v) {
  return String(v || "").replace(/\D/g, "");
}
function indianLocalDigits(value) {
  const raw = String(value || "").trim();
  let d = digitsOnly(raw);
  const compact = raw.replace(/\s+/g, "");
  if (/^\+91/.test(compact) || (d.length >= 12 && d.startsWith("91"))) {
    if (d.startsWith("91")) d = d.slice(2);
  }
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}
function storeIndianMobile(value) {
  const d = indianLocalDigits(value);
  return d ? "+91" + d : "";
}
function formatIndianMobile(value) {
  const d = indianLocalDigits(value);
  return d ? "+91 " + d : "";
}
function sameIndianMobile(a, b) {
  const x = indianLocalDigits(a),
    y = indianLocalDigits(b);
  return !!x && x === y;
}
function indianMobileError(value) {
  const d = indianLocalDigits(value);
  if (!d) return "Mobile number is required.";
  if (!/^[6-9]/.test(d))
    return "Indian mobile number must start with 6, 7, 8 or 9.";
  if (d.length !== 10) return "Indian mobile number must be 10 digits.";
  return "";
}
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
function personNameError(value) {
  const n = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return "Full name is required.";
  if (n.length > 20) return "Full name cannot be more than 20 characters.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(n))
    return "Full name can contain alphabets and spaces only.";
  return "";
}
function emailError(value) {
  const e = String(value || "").trim();
  if (!e) return "Email is required.";
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(e))
    return "Enter a valid email address.";
  return "";
}
function bindPersonName(el) {
  if (!el || el.dataset.nameBound) return;
  if ((el.tagName || "") !== "INPUT") return;
  el.dataset.nameBound = "1";
  el.setAttribute("maxlength", "20");
  el.setAttribute("pattern", "[A-Za-z ]{1,20}");
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
      if (next.length > 20) {
        e.preventDefault();
        fieldOrToast(el, "Full name cannot be more than 20 characters.");
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
      .slice(0, 20);
    if (pasted && !cleaned) {
      fieldOrToast(el, "Full name can contain alphabets and spaces only.");
      return;
    }
    el.value = cleaned;
    if (/[^A-Za-z ]/.test(pasted))
      fieldOrToast(el, "Full name can contain alphabets and spaces only.");
    else if (pasted.replace(/\s+/g, " ").trim().length > 20)
      fieldOrToast(el, "Full name cannot be more than 20 characters.");
  });
  el.addEventListener("input", () => {
    const raw = el.value;
    let cleaned = raw.replace(/[^A-Za-z ]/g, "").replace(/ {2,}/g, " ");
    if (cleaned.startsWith(" ")) cleaned = cleaned.trimStart();
    if (cleaned.length > 20) {
      cleaned = cleaned.slice(0, 20);
      fieldOrToast(el, "Full name cannot be more than 20 characters.");
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
    if (el.closest("#registerForm,#staffRegister,#adminRegister,#otp")) return;
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
      el.setAttribute("maxlength", "10");
      el.setAttribute("pattern", "[6-9][0-9]{9}");
      el.setAttribute("autocomplete", "tel");
      el.setAttribute("placeholder", "9876543210");
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
  if (session() && $("#user"))
    $("#user").textContent = session().name || "User";
  fillWallet();
  if ($("#loginForm")) initLogin();
  if ($("#registerForm")) initRegister();
  bindIndianMobile($("#mobile"));
  bindIndianMobile($("#staffMobile"));
  bindIndianMobile($("#pmobile"));
  const syncForgot = bindIndianMobile(
    $("#fidentity"),
    () => $("#frole")?.value !== "staff",
  );
  $("#frole")?.addEventListener("change", syncForgot);
  ["#name", "#pname", "#staffName", "#adminName"].forEach((s) =>
    bindPersonName($(s)),
  );
  ["#email", "#pemail", "#staffEmail", "#adminEmail"].forEach((s) =>
    bindEmail($(s)),
  );
  initStaffRegister();
  initAdminRegister();
});
function fillWallet() {
  const el = $("#walletPoints");
  if (!el) return;
  const s = session();
  if (s) {
    const me = get("passengers", []).find((x) => x.id === s.id) || s;
    el.textContent = me.points || 0;
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
            ? "9876543210"
            : role === "staff"
              ? "STF1001"
              : "admin@railease.demo";
        $("#demo").textContent =
          role === "passenger"
            ? "Passenger: +91 9876543210 / Passenger@123"
            : role === "staff"
              ? "Staff: STF1001 / Staff@123"
              : "Admin: admin@railease.demo / Admin@123";
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
      if (a.toLowerCase() !== "admin@railease.demo")
        return showIdError("No admin account found with this email.");
      if (p !== "Admin@123") return showPwError("Incorrect password.");
      u = { id: "ADM1", name: "Administrator" };
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
function passwordError(value) {
  const p = String(value || "");
  if (!p) return "Password is required.";
  if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(p))
    return "Password needs 8+ chars, upper, lower and number.";
  return "";
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
    if (!otp || !/^\d{6}$/.test(otp))
      setFieldError("#otpError", "Enter the 6-digit OTP.");
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
    $("#otpInput").value = $("#otpInput").value.replace(/\D/g, "").slice(0, 6);
    setFieldError("#otpError", "");
  });
  $("#verify").onclick = () => {
    const otp = ($("#otpInput").value || "").trim();
    setFieldError("#otpError", "");
    if (!/^\d{6}$/.test(otp)) return err("#otpError", "Enter the 6-digit OTP.");
    if (otp !== "123456") return err("#otpError", "Use demo OTP 123456.");
    let u = get("pending");
    let a = get("passengers");
    a.push(u);
    set("passengers", a);
    set("session", { role: "passenger", ...u });
    localStorage.removeItem("pending");
    location.href = "passenger/dashboard.html";
  };
}
function initStaffRegister() {
  const form = $("#staffRegister");
  if (!form) return;
  function err(id, msg) {
    setFieldError(id, msg);
    return false;
  }
  attachRegisterBlur([
    {
      input: "#staffName",
      error: "#staffNameError",
      check: () => personNameError($("#staffName").value),
    },
    {
      input: "#staffEmpId",
      error: "#staffEmpError",
      check: () =>
        ($("#staffEmpId").value || "").trim() ? "" : "Employee ID is required.",
    },
    {
      input: "#staffMobile",
      error: "#staffMobileError",
      check: () => indianMobileError($("#staffMobile").value),
    },
    {
      input: "#staffEmail",
      error: "#staffEmailError",
      check: () => emailError($("#staffEmail").value),
    },
    {
      input: "#staffPw",
      error: "#staffPwError",
      check: () => passwordError($("#staffPw").value),
    },
  ]);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    [
      "#staffNameError",
      "#staffEmpError",
      "#staffMobileError",
      "#staffEmailError",
      "#staffPwError",
    ].forEach((s) => setFieldError(s, ""));
    const n = personNameError($("#staffName").value);
    if (n) return err("#staffNameError", n);
    if (!($("#staffEmpId").value || "").trim())
      return err("#staffEmpError", "Employee ID is required.");
    const mobileErr = indianMobileError($("#staffMobile").value);
    if (mobileErr) return err("#staffMobileError", mobileErr);
    const em = emailError($("#staffEmail").value);
    if (em) return err("#staffEmailError", em);
    const p = $("#staffPw").value;
    if (!p) return err("#staffPwError", "Password is required.");
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(p))
      return err(
        "#staffPwError",
        "Password needs 8+ chars, upper, lower and number.",
      );
    toast("OTP verification submitted for approval.");
  });
}
function initAdminRegister() {
  const form = $("#adminRegister");
  if (!form) return;
  function err(id, msg) {
    setFieldError(id, msg);
    return false;
  }
  attachRegisterBlur([
    {
      input: "#adminName",
      error: "#adminNameError",
      check: () => personNameError($("#adminName").value),
    },
    {
      input: "#adminEmail",
      error: "#adminEmailError",
      check: () => emailError($("#adminEmail").value),
    },
    {
      input: "#adminPw",
      error: "#adminPwError",
      check: () => passwordError($("#adminPw").value),
    },
  ]);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ["#adminNameError", "#adminEmailError", "#adminPwError"].forEach((s) =>
      setFieldError(s, ""),
    );
    const n = personNameError($("#adminName").value);
    if (n) return err("#adminNameError", n);
    const em = emailError($("#adminEmail").value);
    if (em) return err("#adminEmailError", em);
    const p = $("#adminPw").value;
    if (!p) return err("#adminPwError", "Password is required.");
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(p))
      return err(
        "#adminPwError",
        "Password needs 8+ chars, upper, lower and number.",
      );
    toast("Admin registration submitted for approval.");
  });
}
