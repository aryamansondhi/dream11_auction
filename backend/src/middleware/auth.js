const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (payload.role !== "admin") throw new Error();
    req.admin = payload;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAdmin };
