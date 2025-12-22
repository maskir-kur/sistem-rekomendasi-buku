// backend/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  let user = null;
  let role = null;

  try {
    const [studentRows] = await pool.query(
      "SELECT id, nisn, name, password_hash FROM students WHERE nisn = ? LIMIT 1",
      [identifier]
    );

    if (studentRows.length > 0) {
      user = studentRows[0];
      role = "student";
    }

    if (!user) {
      const [adminRows] = await pool.query(
        "SELECT id, username, password_hash FROM admin WHERE username = ? LIMIT 1",
        [identifier]
      );
      if (adminRows.length > 0) {
        user = adminRows[0];
        role = "admin";
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Username atau NISN salah." });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Password salah." });
    }

    const token = jwt.sign(
      { id: user.id, role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "8h" }
    );

    res.json({
      id: user.id,
      role,
      token,
      username: user.username || user.nisn,
      name: user.name,
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
