const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
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
let lastField = null;
const validationMessage =
  /\b(enter|select|invalid|required|cannot|must|not found|incorrect|no account|available|expired|passwords? do not match|validate|camera|picture|image)\b/i;
function fieldError(field, message) {
  if (!field) return false;
  let error = field.parentElement?.querySelector(":scope > .field-error");
  if (!error) {
    error = document.createElement("div");
    error.className = "field-error";
    field.insertAdjacentElement("afterend", error);
  }
  error.textContent = message;
  field.setAttribute("aria-invalid", "true");
  return true;
}
function clearFieldError(field) {
  field?.parentElement?.querySelector(":scope > .field-error")?.remove();
  field?.removeAttribute("aria-invalid");
}
function errorField() {
  const active = document.activeElement;
  return active && /INPUT|SELECT|TEXTAREA/.test(active.tagName)
    ? active
    : lastField ||
        document.querySelector(
          "form input:invalid,form select:invalid,form textarea:invalid",
        );
}
function toast(m, error = false) {
  const message = String(m);
  if (
    (error || validationMessage.test(message)) &&
    fieldError(errorField(), message)
  )
    return;
  const x = $("#toast");
  if (!x) return;
  x.textContent = message;
  x.classList.toggle("error", !!error);
  x.classList.add("toast", "show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => x.classList.remove("show"), 3000);
}
document.addEventListener("focusin", (e) => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) lastField = e.target;
});
document.addEventListener("input", (e) => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) clearFieldError(e.target);
});
document.addEventListener(
  "invalid",
  (e) => {
    fieldError(e.target, e.target.validationMessage);
  },
  true,
);
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
      mobile: "9876543210",
      email: "rahul@example.com",
      password: "Passenger@123",
      points: 320,
    },
    {
      id: "P1002",
      name: "Anita Patil",
      mobile: "9988776655",
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
  if (!passengers.some((x) => x.mobile === "9876543210"))
    passengers.push({
      id: "P1001",
      name: "Rahul Sharma",
      mobile: "9876543210",
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
    const demoP = passengers.find((x) => x.mobile === "9876543210");
    if (demoP) demoP.points = 320;
    set("demoPoints320", true);
  }
  // Repair the demo password if it was changed/corrupted in an earlier local run.
  const demo = staff.find((x) => x.employeeId === "STF1001");
  if (demo) {
    demo.password = "Staff@123";
    demo.role = demo.role || "Porter";
    demo.status = demo.status || "Available";
  }
  set("passengers", passengers);
  set("staff", staff);
})();
function digitsOnly(v) {
  return String(v || "").replace(/\D/g, "");
}
function indianMobileError(value) {
  const d = digitsOnly(value);
  if (!d) return "Mobile number is required.";
  if (!/^[6-9]/.test(d))
    return "Indian mobile number must start with 6, 7, 8 or 9.";
  if (d.length > 10)
    return "Indian mobile number cannot be more than 10 digits.";
  if (d.length !== 10) return "Indian mobile number must be 10 digits.";
  return "";
}
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
      toast("Full name can contain alphabets and spaces only.", true);
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
        toast("Full name cannot be more than 20 characters.", true);
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
      toast("Full name can contain alphabets and spaces only.", true);
      return;
    }
    el.value = cleaned;
    if (/[^A-Za-z ]/.test(pasted))
      toast("Full name can contain alphabets and spaces only.", true);
    else if (pasted.replace(/\s+/g, " ").trim().length > 20)
      toast("Full name cannot be more than 20 characters.", true);
  });
  el.addEventListener("input", () => {
    const raw = el.value;
    let cleaned = raw.replace(/[^A-Za-z ]/g, "").replace(/ {2,}/g, " ");
    if (cleaned.startsWith(" ")) cleaned = cleaned.trimStart();
    if (cleaned.length > 20) {
      cleaned = cleaned.slice(0, 20);
      toast("Full name cannot be more than 20 characters.", true);
    } else if (/[^A-Za-z ]/.test(raw))
      toast("Full name can contain alphabets and spaces only.", true);
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
      toast(err, true);
      return false;
    }
    return true;
  }
  if (el.dataset.emailBound) return check;
  el.dataset.emailBound = "1";
  el.setAttribute("type", "email");
  el.setAttribute("autocomplete", "email");
  el.addEventListener("blur", () => {
    if (on()) check();
  });
  el.addEventListener("paste", () =>
    setTimeout(() => {
      if (on()) check();
    }, 0),
  );
  return check;
}
function bindIndianMobile(el, enabled) {
  if (!el) return () => {};
  const on = () =>
    typeof enabled === "function" ? enabled() : enabled !== false;
  if (el.dataset.mobileBound) {
    const apply = () => {
      if (on()) {
        el.setAttribute("type", "tel");
        el.setAttribute("inputmode", "numeric");
        el.setAttribute("maxlength", "10");
        el.setAttribute("pattern", "[6-9][0-9]{9}");
        el.setAttribute("autocomplete", "tel");
      } else {
        el.setAttribute("type", "text");
        el.removeAttribute("inputmode");
        el.removeAttribute("maxlength");
        el.removeAttribute("pattern");
        el.removeAttribute("autocomplete");
      }
    };
    apply();
    return apply;
  }
  el.dataset.mobileBound = "1";
  function applyAttrs() {
    if (on()) {
      el.setAttribute("type", "tel");
      el.setAttribute("inputmode", "numeric");
      el.setAttribute("maxlength", "10");
      el.setAttribute("pattern", "[6-9][0-9]{9}");
      el.setAttribute("autocomplete", "tel");
    } else {
      el.setAttribute("type", "text");
      el.removeAttribute("inputmode");
      el.removeAttribute("maxlength");
      el.removeAttribute("pattern");
      el.removeAttribute("autocomplete");
    }
  }
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
      toast("Enter numbers only.", true);
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
        toast("Indian mobile number must start with 6, 7, 8 or 9.", true);
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
      toast("Indian mobile number cannot be more than 10 digits.", true);
    }
  });
  el.addEventListener("paste", (e) => {
    if (!on()) return;
    e.preventDefault();
    const pasted =
      (e.clipboardData || window.clipboardData).getData("text") || "";
    const d = digitsOnly(pasted);
    if (pasted && !d) {
      toast("Enter numbers only.", true);
      return;
    }
    el.value = d.slice(0, 10);
    if (d[0] && !/^[6-9]/.test(d[0])) {
      el.value = "";
      toast("Indian mobile number must start with 6, 7, 8 or 9.", true);
      return;
    }
    if (d.length > 10)
      toast("Indian mobile number cannot be more than 10 digits.", true);
  });
  el.addEventListener("input", () => {
    if (!on()) return;
    const raw = el.value,
      d = digitsOnly(raw);
    if (raw !== d.slice(0, 10)) {
      const tooLong = d.length > 10;
      el.value = d.slice(0, 10);
      if (tooLong)
        toast("Indian mobile number cannot be more than 10 digits.", true);
      else if (/\D/.test(raw)) toast("Enter numbers only.", true);
    }
    const kept = digitsOnly(el.value);
    if (kept[0] && !/^[6-9]/.test(kept[0])) {
      el.value = "";
      toast("Indian mobile number must start with 6, 7, 8 or 9.", true);
    }
  });
  return applyAttrs;
}
document.addEventListener("DOMContentLoaded", () => {
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
  $("#staffRegister")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = personNameError($("#staffName").value);
    if (n) return toast(n, true);
    const em = emailError($("#staffEmail").value);
    if (em) return toast(em, true);
    const err = indianMobileError($("#staffMobile").value);
    if (err) return toast(err, true);
    toast("OTP verification submitted for approval.");
  });
  $("#adminRegister")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = personNameError($("#adminName").value);
    if (n) return toast(n, true);
    const em = emailError($("#adminEmail").value);
    if (em) return toast(em, true);
    toast("Admin registration submitted for approval.");
  });
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
  function loginError(message) {
    toast(message, true);
  }
  function validateIdentity() {
    const value = $("#identity").value.trim();
    if (!value)
      return loginError(
        role === "passenger"
          ? "Mobile number is required."
          : role === "staff"
            ? "Employee ID is required."
            : "Email is required.",
      );
    if (role === "passenger") {
      const err = indianMobileError(value);
      if (err) return loginError(err);
    }
    if (role === "admin") {
      const err = emailError(value);
      if (err) return loginError(err);
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
            ? "Passenger: 9876543210 / Passenger@123"
            : role === "staff"
              ? "Staff: STF1001 / Staff@123"
              : "Admin: admin@railease.demo / Admin@123";
        syncMobile();
      }),
  );
  $("#identity").addEventListener("blur", validateIdentity);
  $("#loginForm").onsubmit = (e) => {
    e.preventDefault();
    if (!validateIdentity()) return;
    const a = $("#identity").value.trim(),
      p = $("#password").value;
    if (!p) return loginError("Password is required.");
    let u = null;
    if (role === "passenger") {
      const acc = get("passengers", []).find((x) => x.mobile === a);
      if (!acc) return loginError("No account found with this mobile number.");
      if (acc.password !== p) return loginError("Incorrect password.");
      u = acc;
    } else if (role === "staff") {
      const acc = get("staff", []).find(
        (x) => x.employeeId.toUpperCase() === a.toUpperCase(),
      );
      if (!acc)
        return loginError("No staff account found with this Employee ID.");
      if (acc.password !== p) return loginError("Incorrect password.");
      u = acc;
    } else {
      if (a.toLowerCase() !== "admin@railease.demo")
        return loginError("No admin account found with this email.");
      if (p !== "Admin@123") return loginError("Incorrect password.");
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
function initRegister() {
  $("#registerForm").onsubmit = (e) => {
    e.preventDefault();
    const nameErr = personNameError($("#name").value);
    if (nameErr) return toast(nameErr, true);
    const emailErr = emailError($("#email").value);
    if (emailErr) return toast(emailErr, true);
    let m = $("#mobile").value.trim(),
      p = $("#pw").value;
    const mobileErr = indianMobileError(m);
    if (mobileErr) return toast(mobileErr, true);
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(p))
      return toast("Password needs 8+ chars, upper, lower and number.");
    if (p !== $("#cpw").value) return toast("Passwords do not match.");
    if (get("passengers").some((x) => x.mobile === m))
      return toast("Mobile already registered.");
    set("pending", {
      id: id("P"),
      name: $("#name").value.replace(/\s+/g, " ").trim(),
      mobile: m,
      email: $("#email").value.trim(),
      password: p,
      points: 0,
    });
    $("#otpInput").value = "";
    $("#otp").classList.remove("hidden");
    setTimeout(() => $("#otpInput")?.focus(), 50);
  };
  $("#otpInput")?.addEventListener("input", () => {
    $("#otpInput").value = $("#otpInput").value.replace(/\D/g, "").slice(0, 6);
  });
  $("#verify").onclick = () => {
    const otp = ($("#otpInput").value || "").trim();
    if (!/^\d{6}$/.test(otp)) return toast("Enter the 6-digit OTP.", true);
    if (otp !== "123456") return toast("Use demo OTP 123456.", true);
    let u = get("pending");
    let a = get("passengers");
    a.push(u);
    set("passengers", a);
    set("session", { role: "passenger", ...u });
    localStorage.removeItem("pending");
    location.href = "passenger/dashboard.html";
  };
}
