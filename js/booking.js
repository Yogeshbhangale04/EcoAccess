/* Passenger booking steps and My Bookings tracking */
document.addEventListener("DOMContentLoaded", () => {
  let u = requireJourney();
  if (!u) return;
  if ($("#next1") && typeof initBooking === "function") initBooking();
  if ($("#track")) initTracking();
});
function show(n) {
  for (let i = 1; i <= 5; i++)
    $("#step" + i)?.classList.toggle("hidden", i !== n);
  $$(".steps [data-step]").forEach((el) => {
    const step = +el.dataset.step;
    el.classList.toggle("active", step === n);
    el.classList.toggle("done", step < n);
  });
  $(".steps")?.classList.toggle("hidden", false);
}
window.show = show;
function initTracking() {
  const state = { page: 1 };
  const order = [
    "Booked",
    "Assigned",
    "Accepted",
    "Reached Passenger",
    "Service Started",
    "Completed",
  ];
  function showBooking(b) {
    $("#result").classList.remove("hidden");
    if (b.status === "Rejected") {
      $("#timeline").innerHTML =
        `<p class="done"><b>✓ Booked</b></p><p class="done reject-step"><b>✕ Rejected</b></p>`;
    } else {
      const ci = order.indexOf(b.status);
      $("#timeline").innerHTML = order
        .map(
          (s, i) =>
            `<p class="${i <= ci ? "done" : ""}"><b>${i <= ci ? "✓" : "○"} ${s}</b></p>`,
        )
        .join("");
    }
    $("#details").innerHTML =
      `<p><b>Booking:</b> ${b.id}</p><p><b>Passenger:</b> ${b.passenger}</p><p><b>Number of Passenger:</b> ${b.passengerCount || 1}</p><p><b>Service:</b> ${b.service}</p><p><b>Date & Time:</b> ${bookingWhen(b)}</p><p><b>Train:</b> ${b.train}</p><p><b>Station:</b> ${b.station}</p><p><b>Pickup point:</b> ${bookingPick(b) || "—"}</p><p><b>Drop platform:</b> ${bookingDrop(b) || "—"}</p><p><b>Status:</b> ${b.status}</p><p><b>Fare:</b> ₹${b.fare}${b.discount ? ` (₹${b.discount} off with ${b.couponCode})` : ""}</p>`;
  }
  function draw() {
    const u = session(),
      q = listQuery("#search");
    const a = get("bookings").filter(
      (x) =>
        x.passengerId === u.id &&
        textMatch(
          q,
          x.id,
          x.service,
          x.status,
          x.station,
          x.date,
          x.time,
          bookingPick(x),
          bookingDrop(x),
        ),
    );
    const pg = paginate(a, state.page);
    state.page = pg.page;
    $("#bookingList").innerHTML = pg.slice.length
      ? pg.slice
          .map(
            (b) =>
              `<div class="listrow"><div><b>${b.id}</b> · ${b.service} · ${bookingWhen(b)}<br><span class="muted">${bookingRoute(b)}</span><br><span class="badge">${b.status}</span></div><button type="button" class="btn sm" data-track="${b.id}">View</button></div>`,
          )
          .join("")
      : '<p class="muted">No bookings.</p>';
    fillPager("#listPager", pg.page, pg.empty ? 0 : pg.pages);
  }
  $("#track").onclick = () => {
    const u = session(),
      q = $("#search").value.trim().toLowerCase(),
      b = get("bookings").find(
        (x) => x.id.toLowerCase() === q && x.passengerId === u.id,
      );
    if (!b) return toast("Booking not found.");
    showBooking(b);
  };
  $("#bookingList")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-track]");
    if (!btn) return;
    const b = get("bookings").find((x) => x.id === btn.dataset.track);
    if (b) showBooking(b);
  });
  attachList("#search", "#listPager", state, draw);
  draw();
}
