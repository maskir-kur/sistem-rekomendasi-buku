// backend/routes/stats.js
import express from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET /api/stats/summary
router.get("/summary", auth, async (_, res) => {
  const [[{ totalBooks }]]    = await pool.query("SELECT COUNT(*) AS totalBooks    FROM books");
  const [[{ totalStudents }]] = await pool.query("SELECT COUNT(*) AS totalStudents FROM students");
  const [[{ totalBorrows }]]  = await pool.query(
    "SELECT COUNT(*) AS totalBorrows FROM borrows WHERE return_date IS NULL"
  );
  res.json({
    books: totalBooks,
    students: totalStudents,
    borrows: totalBorrows,
  });
});

export default router;
