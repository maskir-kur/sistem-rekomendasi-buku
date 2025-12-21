// ──────────────────────────────────────────────
// backend/routes/auth.js (FINAL + CORS SAFE)
// ──────────────────────────────────────────────
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

/* =================================================
   ✅ WAJIB: HANDLE PREFLIGHT REQUEST (CORS)
   ================================================= */
router.options("*", (req, res) => {
  res.sendStatus(204);
});

/* =================================================
   LOGIN (TANPA AUTH MIDDLEWARE)
   ================================================= */
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  let user = null;
  let role = null;

  try {
    // 1. Cari di tabel students (NISN)
    const [studentRows] = await pool.query(
      "SELECT id, nisn, name, password_hash FROM students WHERE nisn = ? LIMIT 1",
      [identifier]
    );

    if (studentRows.length > 0) {
      user = studentRows[0];
      role = "student";
    }

    // 2. Jika tidak ada, cari di admin
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

    // 3. Jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({ message: "Username atau NISN salah." });
    }

    // 4. Verifikasi password
    const isPasswordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Password salah." });
    }

    // 5. Generate JWT
    const payload = {
      id: user.id,
      role: role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "secret",
      { expiresIn: "8h" }
    );

    // 6. Response sukses
    res.json({
      id: user.id,
      role: role,
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
