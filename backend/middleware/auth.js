// backend/middleware/auth.js
import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.sendStatus(401);
  }

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "secret");
    next();
  } catch {
    res.sendStatus(403);
  }
}
