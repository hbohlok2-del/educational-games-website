const crypto = require("crypto");

// One shared teacher passcode, set as TEACHER_PASSCODE in the environment
// (Render dashboard in production). Sent by the teacher dashboard in the
// X-Teacher-Passcode header. With no passcode configured, protected routes
// stay locked rather than open.
function passcodeMatches(supplied) {
  const expected = process.env.TEACHER_PASSCODE;
  if (!expected || typeof supplied !== "string" || !supplied) return false;
  const a = crypto.createHash("sha256").update(supplied).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireTeacher(req, res, next) {
  if (!process.env.TEACHER_PASSCODE) {
    return res.status(503).json({ ok: false, error: "passcode-not-configured" });
  }
  if (!passcodeMatches(req.get("X-Teacher-Passcode"))) {
    return res.status(401).json({ ok: false, error: "bad-passcode" });
  }
  next();
}

module.exports = { requireTeacher };
