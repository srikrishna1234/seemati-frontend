// backend/src/middleware/adminAuth.cjs
// CommonJS admin/user auth middleware (works with your .cjs routes)
const jwt = require("jsonwebtoken");

module.exports = function adminAuth(req, res, next) {
  const JWT_SECRET = process.env.JWT_SECRET || null;

  // If no JWT_SECRET configured, fall back to permissive behavior (dev)
  if (!JWT_SECRET) {
    return next();
  }

  // Expect Authorization: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized (missing Bearer token)" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized (empty token)" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Attach minimal user info. We sign tokens with { sub: normalizedPhone } earlier.
    req.user = {
      id: payload.sub || null,
      raw: payload,
    };
    return next();
  } catch (err) {
    console.error("adminAuth: token verify failed:", err && err.message ? err.message : err);
    return res.status(401).json({ error: "Unauthorized (invalid or expired token)" });
  }
};
