/* Field validations — change rules here, not across the codebase. */
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
  return d.slice(0, DUMMY.limits.mobileLength);
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
  if (d.length !== DUMMY.limits.mobileLength)
    return "Indian mobile number must be " + DUMMY.limits.mobileLength + " digits.";
  return "";
}
function personNameError(value) {
  const n = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  const max = DUMMY.limits.nameMaxLength;
  if (!n) return "Full name is required.";
  if (n.length > max) return "Full name cannot be more than " + max + " characters.";
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
function passwordError(value) {
  const p = String(value || "");
  if (!p) return "Password is required.";
  if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(p))
    return "Password needs 8+ chars, upper, lower and number.";
  return "";
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
function trainNumberError(value) {
  const d = String(value || "").replace(/\D/g, "");
  const len = DUMMY.limits.trainNumberLength;
  if (!d) return "Train number is required.";
  if (!new RegExp("^\\d{" + len + "}$").test(d))
    return "Train number must be exactly " + len + " digits.";
  return "";
}
function platformError(value, label = "Platform number") {
  const d = String(value || "").replace(/\D/g, "");
  if (!d) return label + " is required.";
  const n = Number(d);
  if (
    !Number.isInteger(n) ||
    n < DUMMY.limits.platformMin ||
    n > DUMMY.limits.platformMax
  )
    return (
      "Enter a platform number from " +
      DUMMY.limits.platformMin +
      " to " +
      DUMMY.limits.platformMax +
      "."
    );
  return "";
}
function findDemoPnr(value) {
  const p = String(value || "").replace(/\D/g, "");
  return DUMMY.pnrs.find((x) => x.pnr === p) || null;
}
function demoPnrError(value) {
  const p = String(value || "").replace(/\D/g, "");
  const len = DUMMY.limits.pnrLength;
  if (!p) return "PNR is required.";
  if (!new RegExp("^\\d{" + len + "}$").test(p))
    return "PNR must contain exactly " + len + " digits.";
  if (!findDemoPnr(p)) return "Invalid PNR. Use one of the demo ticket PNRs.";
  return "";
}
function bookingDateError(value) {
  if (!String(value || "").trim()) return "Service date is required.";
  return "";
}
function bookingTimeError(value) {
  if (!String(value || "").trim()) return "Service time is required.";
  return "";
}
function otpError(value) {
  const otp = String(value || "").trim();
  const len = DUMMY.limits.otpLength;
  if (!new RegExp("^\\d{" + len + "}$").test(otp))
    return "Enter the " + len + "-digit OTP.";
  if (otp !== DUMMY.demoOtp) return "Use demo OTP " + DUMMY.demoOtp + ".";
  return "";
}
