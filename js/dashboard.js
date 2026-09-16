/* Passenger pages: dashboard, waste, rewards, feedback, profile */
function initProfile(u) {
  function fill() {
    $("#pnameView").textContent = u.name;
    $("#pmobileView").textContent = formatIndianMobile(u.mobile);
    $("#pemailView").textContent = u.email;
    $("#pname").value = u.name;
    $("#pmobile").value = indianLocalDigits(u.mobile);
    $("#pemail").value = u.email;
  }
  function showView() {
    $("#profileDetails").classList.remove("hidden");
    $("#profile").classList.add("hidden");
    $("#editProfile").classList.remove("hidden");
  }
  fill();
  $("#editProfile").onclick = () => {
    fill();
    $("#profileDetails").classList.add("hidden");
    $("#profile").classList.remove("hidden");
    $("#editProfile").classList.add("hidden");
    $("#pname").focus();
  };
  $("#cancelProfile")?.addEventListener("click", () => {
    fill();
    showView();
  });
  $("#profile").onsubmit = (e) => {
    e.preventDefault();
    const n = personNameError($("#pname").value);
    if (n) return toast(n, true);
    const em = emailError($("#pemail").value);
    if (em) return toast(em, true);
    let a = get("passengers"),
      x = a.find((y) => y.id === u.id);
    x.name = $("#pname").value.replace(/\s+/g, " ").trim();
    x.email = $("#pemail").value.trim();
    set("passengers", a);
    set("session", { role: "passenger", ...x });
    u = x;
    $("#user").textContent = x.name;
    fill();
    showView();
    toast("Profile updated.");
  };
}
document.addEventListener("DOMContentLoaded", () => {
  let u = session();
  if (!u || u.role !== "passenger") return (location.href = "../login.html");
  let bs = get("bookings").filter((b) => b.passengerId === u.id),
    me = get("passengers").find((x) => x.id === u.id) || u;
  if ($("#name")) $("#name").textContent = u.name.split(" ")[0];
  if ($("#upcoming"))
    $("#upcoming").textContent = bs.filter(
      (b) => b.status !== "Completed",
    ).length;
  if ($("#points")) $("#points").textContent = me.points || 0;
  if ($("#completed"))
    $("#completed").textContent = bs.filter(
      (b) => b.status === "Completed",
    ).length;
  if ($("#open"))
    $("#open").textContent = bs.filter((b) => b.status !== "Completed").length;
  if ($("#journeyStatus")) {
    let j = journeyValidation();
    $("#journeyStatus").innerHTML = j
      ? `✓ <b>Journey validated</b> — PNR ${j.pnr}, Train ${j.train}, ${j.date}. <a href="journey-validation.html">Update</a>`
      : `⚠ <b>Journey validation required.</b> Validate your journey before booking or uploading waste proof. <a href="journey-validation.html">Validate now →</a>`;
  }
  if ($("#upcomingList"))
    $("#upcomingList").innerHTML =
      bs
        .map(
          (b) =>
            `<p><b>${b.id}</b> · ${b.service} · ${b.date}<br><span class="badge">${b.status}</span></p>`,
        )
        .join("") || '<p class="muted">No bookings.</p>';
  if ($("#wasteForm")) {
    if (!requireJourney()) return;
    initWaste(u);
  }
  if ($("#catalog")) initRewards(u);
  if ($("#feedback")) initFeedback(u);
  if ($("#profile")) initProfile(u);
});
function initWaste(u) {
  let stream = null,
    photoData = "",
    gateTimer = null;
  const takeBtn = $("#takePicture"),
    video = $("#wasteVideo"),
    shot = $("#wasteShot"),
    canvas = $("#wasteCanvas"),
    actions = $("#photoActions"),
    submitBtn = $("#submitWaste"),
    placeholder = $("#imagePlaceholder");
  const cooldownMs = 4 * 60 * 60 * 1000;
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  }
  function showIdle() {
    photoData = "";
    shot.removeAttribute("src");
    stopCamera();
    video.classList.add("hidden");
    shot.classList.add("hidden");
    placeholder.classList.remove("hidden");
    actions.classList.add("hidden");
    takeBtn.classList.remove("hidden");
    submitBtn?.classList.add("hidden");
  }
  function showLive() {
    placeholder.classList.add("hidden");
    shot.classList.add("hidden");
    video.classList.remove("hidden");
    actions.classList.add("hidden");
    takeBtn.classList.remove("hidden");
    submitBtn?.classList.add("hidden");
  }
  function showPreview() {
    placeholder.classList.add("hidden");
    video.classList.add("hidden");
    shot.classList.remove("hidden");
    takeBtn.classList.add("hidden");
    actions.classList.remove("hidden");
    submitBtn?.classList.remove("hidden");
  }
  function formatExact(ts) {
    return new Date(ts).toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  function latestWaste() {
    return (
      get("waste")
        .filter((x) => x.passengerId === u.id)
        .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))[0] || null
    );
  }
  function wasteGate() {
    const last = latestWaste(),
      now = Date.now();
    if (last && last.submittedAt) {
      const until = last.submittedAt + cooldownMs;
      if (now < until) {
        return {
          ok: false,
          until,
          message:
            "The next image can be taken after exactly 4 hours of your latest image. Next capture is available at " +
            formatExact(until) +
            ".",
        };
      }
    }
    return { ok: true };
  }
  function applyGate() {
    const g = wasteGate(),
      wait = $("#wasteWait");
    if (!wait) return g.ok;
    if (g.ok) {
      wait.classList.add("hidden");
      wait.innerHTML = "";
      return true;
    }
    wait.innerHTML =
      "The next image can be taken after exactly 4 hours of your latest image.<br><b>Next capture is available at " +
      formatExact(g.until) +
      ".</b>";
    wait.classList.remove("hidden");
    return false;
  }
  async function openCamera() {
    if (!applyGate()) return toast(wasteGate().message, true);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      return toast("Camera is not supported in this browser.", true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      video.srcObject = stream;
      showLive();
    } catch {
      toast("Allow camera access when asked so you can take a picture.", true);
    }
  }
  function capturePhoto() {
    if (!applyGate()) return toast(wasteGate().message, true);
    if (!video.videoWidth)
      return toast("Camera is not ready yet. Tap Take Picture again.", true);
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    photoData = canvas.toDataURL("image/jpeg", 0.72);
    shot.src = photoData;
    stopCamera();
    showPreview();
  }
  takeBtn.onclick = () => {
    if (!applyGate()) return toast(wasteGate().message, true);
    if (stream) {
      capturePhoto();
      return;
    }
    openCamera();
  };
  $("#retakePicture").onclick = () => {
    if (!applyGate()) return toast(wasteGate().message, true);
    photoData = "";
    shot.removeAttribute("src");
    openCamera();
  };
  $("#cancelPicture").onclick = showIdle;
  window.addEventListener("pagehide", () => {
    stopCamera();
    clearInterval(gateTimer);
  });
  renderWaste(u);
  applyGate();
  gateTimer = setInterval(applyGate, 1000);
  $("#wasteSearch")?.addEventListener("input", () => {
    wasteListPage = 1;
    renderWaste(u);
  });
  $("#wastePager")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-waste-page]");
    if (!b || b.disabled) return;
    const p = +b.dataset.wastePage;
    if (!p || p < 1) return;
    wasteListPage = p;
    renderWaste(u);
  });
  $("#wasteList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view-waste]");
    if (!b) return;
    const item = get("waste").find((x) => x.id === b.dataset.viewWaste);
    if (!item || !item.photo || !String(item.photo).startsWith("data:"))
      return toast("Image is not available.", true);
    $("#wasteImageView").src = item.photo;
    $("#wasteImageModal").classList.remove("hidden");
  });
  $("#closeWasteImage")?.addEventListener("click", () =>
    $("#wasteImageModal").classList.add("hidden"),
  );
  $("#wasteImageModal")?.addEventListener("click", (e) => {
    if (e.target.id === "wasteImageModal")
      $("#wasteImageModal").classList.add("hidden");
  });
  $("#wasteForm").onsubmit = (e) => {
    e.preventDefault();
    if (!applyGate()) return toast(wasteGate().message, true);
    if (!photoData)
      return toast("Take a picture of the waste disposal first.", true);
    let a = get("waste");
    a.push({
      id: id("WD-"),
      passengerId: u.id,
      passenger: u.name,
      status: "pending",
      rewardPoints: 0,
      photo: photoData,
      submittedAt: Date.now(),
    });
    set("waste", a);
    stopCamera();
    photoData = "";
    showIdle();
    renderWaste(u);
    applyGate();
    toast(
      "Submission sent for admin review. Points will be credited after approval.",
    );
  };
}
let wasteListPage = 1;
function renderWaste(u) {
  const q = ($("#wasteSearch")?.value || "").trim().toLowerCase();
  const items = get("waste")
    .filter((x) => x.passengerId === u.id)
    .filter((x) => !q || String(x.id).toLowerCase().includes(q))
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  const pageSize = 5,
    pages = Math.max(1, Math.ceil(items.length / pageSize));
  if (wasteListPage > pages) wasteListPage = pages;
  if (wasteListPage < 1) wasteListPage = 1;
  const slice = items.slice(
    (wasteListPage - 1) * pageSize,
    wasteListPage * pageSize,
  );
  function stamp(t) {
    if (!t) return "—";
    const d = new Date(t);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  }
  $("#wasteList").innerHTML = slice.length
    ? slice
        .map((x) => {
          const st = wasteStatus(x),
            canView = x.photo && String(x.photo).startsWith("data:");
          const remark =
            st === "rejected"
              ? String(x.remark || "—").replace(/[<>]/g, "")
              : "—";
          const pts = st === "accepted" ? "+20" : "0";
          return `<tr><td><b>${x.id}</b></td><td><span class="badge ${st}">${wasteStatusLabel(x)}</span></td><td>${stamp(x.submittedAt)}</td><td><b class="${st === "accepted" ? "done" : ""}">${pts}</b></td><td>${remark}</td><td>${canView ? `<button type="button" class="btn sm outline" data-view-waste="${x.id}">View Image</button>` : '<span class="muted">No image</span>'}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="6" class="muted">No submissions.</td></tr>';
  const pager = $("#wastePager");
  if (pager)
    pager.innerHTML = items.length
      ? `<button type="button" class="btn sm outline" data-waste-page="${wasteListPage - 1}" ${wasteListPage <= 1 ? "disabled" : ""}>Prev</button><span>Page ${wasteListPage} of ${pages}</span><button type="button" class="btn sm outline" data-waste-page="${wasteListPage + 1}" ${wasteListPage >= pages ? "disabled" : ""}>Next</button>`
      : "";
}
function initRewards(u) {
  const minPts = 100;
  let redeemListPage = 1;
  function me() {
    return get("passengers").find((x) => x.id === u.id) || u;
  }
  function stamp(t) {
    if (!t) return "—";
    return new Date(t).toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  function shortStamp(t) {
    if (!t) return "—";
    const d = new Date(t);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  }
  function couponStatus(c) {
    if (c.status === "Used") return "Used";
    if (c.status === "Expired" || couponIsExpired(c)) return "Expired";
    return "Active";
  }
  function renderHistory() {
    const q = ($("#redeemSearch")?.value || "").trim().toLowerCase();
    const items = get("redemptions")
      .filter((x) => x.passengerId === u.id)
      .filter(
        (x) =>
          !q ||
          String(x.id).toLowerCase().includes(q) ||
          String(x.couponCode || "")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const pageSize = 5,
      pages = Math.max(1, Math.ceil(items.length / pageSize));
    if (redeemListPage > pages) redeemListPage = pages;
    if (redeemListPage < 1) redeemListPage = 1;
    const slice = items.slice(
      (redeemListPage - 1) * pageSize,
      redeemListPage * pageSize,
    );
    const coupons = get("coupons", []);
    $("#history").innerHTML = slice.length
      ? slice
          .map((x) => {
            const c = coupons.find((y) => y.code === x.couponCode);
            const st = c ? couponStatus(c) : x.status || "Issued";
            const issued =
              x.createdAt ||
              (c && c.createdAt) ||
              (x.date ? Date.parse(x.date + "T00:00:00") : 0);
            const exp =
              x.expiresAt ||
              (c ? couponExpiry(c) : issued ? issued + couponTtl() : 0);
            return `<tr><td><b>${x.id}</b></td><td>${x.couponCode || "—"}</td><td>${x.points} pts</td><td>₹${x.couponValue ?? couponValueFromPoints(x.points)}</td><td><span class="badge ${st.toLowerCase()}">${st}</span></td><td>${shortStamp(issued)}</td><td>${shortStamp(exp)}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="7" class="muted">No redemptions.</td></tr>';
    const pager = $("#redeemPager");
    if (pager)
      pager.innerHTML = items.length
        ? `<button type="button" class="btn sm outline" data-redeem-page="${redeemListPage - 1}" ${redeemListPage <= 1 ? "disabled" : ""}>Prev</button><span>Page ${redeemListPage} of ${pages}</span><button type="button" class="btn sm outline" data-redeem-page="${redeemListPage + 1}" ${redeemListPage >= pages ? "disabled" : ""}>Next</button>`
        : "";
  }
  function draw() {
    const p = me(),
      pts = p.points || 0,
      val = couponValueFromPoints(pts),
      ready = pts >= minPts;
    const red = get("redemptions").filter((x) => x.passengerId === u.id);
    const coupons = listCoupons(u.id),
      active = usableCoupons(u.id);
    $("#rpoints").textContent = pts;
    if ($("#rcouponPreview"))
      $("#rcouponPreview").textContent = ready ? "₹" + val : "—";
    if ($("#ractive")) $("#ractive").textContent = active.length;
    $("#rcount").textContent = red.length;
    $("#catalog").innerHTML = `<p>Your wallet has <b>${pts} points</b>.</p>
      ${ready ? `<p class="redeem-preview">You will get a <b>₹${val}</b> discount coupon</p>` : ""}
      <p class="muted">${ready ? "Redeem now to generate the coupon. It expires 24 hours after generation. All current points will be converted." : "Redeem will be available once you reach 100 points."}</p>
      <button type="button" class="btn" id="redeemNow" ${ready ? "" : "disabled"}>Redeem</button>`;
    $("#couponList").innerHTML = coupons.length
      ? coupons
          .map((c) => {
            const left = c.remaining ?? c.value,
              st = couponStatus(c),
              exp = couponExpiry(c);
            const use =
              st === "Expired"
                ? "This coupon expired 24 hours after it was generated."
                : c.usedFor === "train"
                  ? `Applied to train fare (PNR ${c.usedOn || "—"})`
                  : c.usedFor === "booking"
                    ? `Applied to booking ${c.usedOn || ""}`
                    : "Use for prebooking resources or train fare";
            return `<article class="coupon-card"><div><small>Coupon code</small><code>${c.code}</code></div>
        <p><b>₹${left}</b> remaining of ₹${c.value} · <span class="badge ${st.toLowerCase()}">${st}</span></p>
        <p class="muted">${use}</p>
        <p><b>Expires:</b> ${stamp(exp)} <span class="muted">(24 hours from generation)</span></p>
        ${st === "Active" && left > 0 ? `<div class="coupon-actions"><a class="btn sm" href="create-booking.html">Use for resource booking</a><button type="button" class="btn sm outline" data-train-coupon="${c.id}">Apply to train fare</button></div>` : ""}
        <small class="muted">Issued ${stamp(c.createdAt)} · ${c.pointsRedeemed} pts × 0.5</small></article>`;
          })
          .join("")
      : '<p class="muted">No coupons yet. Redeem 100+ points to generate one.</p>';
    renderHistory();
  }
  $("#catalog").onclick = (e) => {
    if (e.target.id !== "redeemNow" || e.target.disabled) return;
    const p = me(),
      pts = p.points || 0;
    if (pts < minPts)
      return toast("Redeem will be available once you reach 100 points.", true);
    const value = couponValueFromPoints(pts),
      code = couponCode(value),
      createdAt = Date.now(),
      expiresAt = createdAt + couponTtl();
    p.points = 0;
    const ps = get("passengers");
    ps[ps.findIndex((x) => x.id === p.id)] = p;
    set("passengers", ps);
    const sess = session();
    if (sess) set("session", { ...sess, points: 0 });
    const cs = get("coupons", []);
    cs.push({
      id: id("CPN-"),
      code,
      passengerId: u.id,
      passenger: u.name,
      pointsRedeemed: pts,
      value,
      remaining: value,
      status: "Active",
      createdAt,
      expiresAt,
      usedFor: null,
      usedOn: null,
    });
    set("coupons", cs);
    const a = get("redemptions");
    a.push({
      id: id("RD-"),
      passengerId: u.id,
      passenger: u.name,
      rewardName: "Discount coupon ₹" + value,
      points: pts,
      couponCode: code,
      couponValue: value,
      status: "Issued",
      date: new Date(createdAt).toISOString().slice(0, 10),
      createdAt,
      expiresAt,
    });
    set("redemptions", a);
    fillWallet();
    toast(
      "Coupon " +
        code +
        " generated for ₹" +
        value +
        ". Expires at " +
        stamp(expiresAt) +
        ".",
    );
    draw();
  };
  $("#couponList").onclick = (e) => {
    const b = e.target.closest("[data-train-coupon]");
    if (!b) return;
    const j = journeyValidation();
    if (!j)
      return toast(
        "Validate your journey first to apply this coupon to train fare.",
        true,
      );
    const c = usableCoupons(u.id).find((x) => x.id === b.dataset.trainCoupon);
    if (!c)
      return toast("This coupon is expired or no longer available.", true);
    const take = spendCoupon(c.id, c.remaining ?? c.value, "train", j.pnr);
    if (!take)
      return toast("This coupon is expired or no longer available.", true);
    toast(
      "₹" +
        take +
        " discount applied to train fare for PNR " +
        j.pnr +
        ". Show coupon " +
        c.code +
        " when travelling.",
    );
    draw();
  };
  $("#redeemSearch")?.addEventListener("input", () => {
    redeemListPage = 1;
    renderHistory();
  });
  $("#redeemPager")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-redeem-page]");
    if (!b || b.disabled) return;
    const p = +b.dataset.redeemPage;
    if (!p || p < 1) return;
    redeemListPage = p;
    renderHistory();
  });
  draw();
}
function initFeedback(u) {
  const state = { page: 1 };
  bindAlphaText($("#subject"));
  bindAlphaText($("#description"));
  function viewItem(x) {
    if (!x) return;
    openDetailsModal({
      title: x.id,
      fields: [
        { label: "Subject", value: x.subject },
        { label: "Description", value: x.description },
        { label: "Rating", value: x.rating },
        { label: "Status", value: x.status },
        {
          label: "Submitted",
          value: x.createdAt ? new Date(x.createdAt).toLocaleString() : "—",
        },
      ],
    });
  }
  function draw() {
    const q = listQuery("#listSearch");
    const a = get("complaints").filter(
      (x) =>
        x.passengerId === u.id &&
        textMatch(q, x.id, x.subject, x.status, x.description),
    );
    const pg = paginate(a, state.page);
    state.page = pg.page;
    $("#complaints").innerHTML = pg.slice.length
      ? pg.slice
          .map(
            (x) =>
              `<div class="listrow"><div><b>${x.id}</b> · ${escHtml(x.subject)}<br><span class="badge">${x.status}</span></div><button type="button" class="btn sm outline" data-view-complaint="${x.id}">View</button></div>`,
          )
          .join("")
      : '<p class="muted">No complaints.</p>';
    fillPager("#listPager", pg.page, pg.empty ? 0 : pg.pages);
  }
  $("#complaints")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view-complaint]");
    if (!btn) return;
    viewItem(get("complaints").find((x) => x.id === btn.dataset.viewComplaint));
  });
  $("#feedback").onsubmit = (e) => {
    e.preventDefault();
    setFieldError("#subjectError", "");
    setFieldError("#descriptionError", "");
    const subjectErr = alphaTextError($("#subject").value, "Subject");
    if (subjectErr) return setFieldError("#subjectError", subjectErr);
    const descErr = alphaTextError($("#description").value, "Description");
    if (descErr) return setFieldError("#descriptionError", descErr);
    let a = get("complaints");
    a.push({
      id: id("CP-"),
      passengerId: u.id,
      passenger: u.name,
      rating: +$("#rating").value,
      subject: $("#subject").value.replace(/\s+/g, " ").trim(),
      description: $("#description").value.replace(/\s+/g, " ").trim(),
      status: "Open",
      createdAt: Date.now(),
    });
    set("complaints", a);
    toast("Complaint submitted.");
    e.target.reset();
    draw();
  };
  attachList("#listSearch", "#listPager", state, draw);
  draw();
}
