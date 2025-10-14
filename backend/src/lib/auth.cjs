// backend/src/lib/auth.cjs
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d"; // token lifetime

function signUserToken(user) {
  // user can be mongoose doc or plain object
  const payload = { id: user._id || user.id, phone: user.phone, role: user.role || "user" };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authMiddleware(req, res, next) {
  try {
    // look in HttpOnly cookie first, then Authorization header
    const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = jwt.verify(token, JWT_SECRET);
    // attach user info (id, phone, role)
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { signUserToken, authMiddleware };
