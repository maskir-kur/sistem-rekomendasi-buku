// ──────────────────────────────────────────────
// backend/routes/borrows.js (FINAL)
// ──────────────────────────────────────────────
import express from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";
import dayjs from "dayjs";

const router = express.Router();

/* ╔════════════════════════════════════════════╗
   ║ GET /api/borrows – daftar peminjaman (Admin) ║
   ╚════════════════════════════════════════════╝ */
router.get("/", auth, async (req, res) => {
  try {
    const {
      status = "active",
      student_id,
      page = 1,
      limit = 10,
      searchGeneral = "",
      sortBy = "borrow_date",
      sortOrder = "desc",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    let whereClauses = [];
    let queryParams = [];

    if (student_id) {
      whereClauses.push("b.student_id = ?");
      queryParams.push(student_id);
    }

    if (!student_id) {
      if (status === "active") {
        whereClauses.push("b.return_date IS NULL");
      } else if (status === "history") {
        whereClauses.push("b.return_date IS NOT NULL");
      }
    }

    if (searchGeneral) {
      whereClauses.push("(s.nisn LIKE ? OR s.name LIKE ? OR bk.title LIKE ?)");
      queryParams.push(`%${searchGeneral}%`, `%${searchGeneral}%`, `%${searchGeneral}%`);
    }

    let sql = `
      SELECT
        b.id, b.borrow_date, b.due_date, b.return_date,
        s.id AS student_id, s.nisn, s.name,
        bk.id AS book_id, bk.title, bk.author
      FROM borrows b
      JOIN students s ON b.student_id = s.id
      JOIN books bk ON b.book_id = bk.id
    `;

    let countSql = `
      SELECT COUNT(*) AS totalCount
      FROM borrows b
      JOIN students s ON b.student_id = s.id
      JOIN books bk ON b.book_id = bk.id
    `;

    if (whereClauses.length > 0) {
      const whereString = whereClauses.join(" AND ");
      sql += ` WHERE ${whereString}`;
      countSql += ` WHERE ${whereString}`;
    }

    const validSortColumns = ['borrow_date', 'due_date', 'return_date', 'nisn', 'name', 'title'];
    const validSortOrder = ['asc', 'desc'];

    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'borrow_date';
    const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'desc';

    let actualSortBy = safeSortBy;
    if (safeSortBy === 'nisn' || safeSortBy === 'name') {
      actualSortBy = `s.${safeSortBy}`;
    } else if (safeSortBy === 'title') {
      actualSortBy = `bk.${safeSortBy}`;
    } else {
      actualSortBy = `b.${safeSortBy}`;
    }

    sql += ` ORDER BY ${actualSortBy} ${safeSortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;
    queryParams.push(parsedLimit, offset);

    const [borrowsRows] = await pool.query(sql.trim(), queryParams);
    const [countRows] = await pool.query(countSql.trim(), queryParams.slice(0, queryParams.length - 2));

    res.json({
      borrows: borrowsRows,
      totalCount: countRows[0].totalCount,
    });
  } catch (e) {
    console.error("GET /borrows", e);
    res.status(500).json({ message: "Gagal mengambil data peminjaman" });
  }
});

/* ╔══════════════════════════════════════════════╗
   ║ GET /api/borrows/for-student/:id - Dipinjam  ║
   ╚══════════════════════════════════════════════╝ */
router.get("/for-student/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    // Pastikan siswa yang login hanya bisa melihat data mereka sendiri
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
        return res.status(403).json({ message: "Akses ditolak." });
    }

    const [rows] = await pool.query(`
      SELECT
        b.id AS borrow_id, b.borrow_date, b.due_date,
        bk.id, bk.title, bk.author, bk.cover_image_url
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.student_id = ? AND b.return_date IS NULL
      ORDER BY b.borrow_date DESC
    `, [studentId]);

    res.json(rows);
  } catch (e) {
    console.error("GET /for-student/:id", e);
    res.status(500).json({ message: "Gagal mengambil data buku yang dipinjam." });
  }
});

/* ╔══════════════════════════════════════════════════╗
   ║ GET /api/borrows/returned/for-student/:id - Kembali ║
   ╚══════════════════════════════════════════════════╝ */
router.get("/returned/for-student/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    // Pastikan siswa yang login hanya bisa melihat data mereka sendiri
    if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({ message: "Akses ditolak." });
    }
    const [rows] = await pool.query(`
      SELECT
        b.id AS borrow_id, b.borrow_date, b.return_date,
        bk.id, bk.title, bk.author, bk.cover_image_url
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.student_id = ? AND b.return_date IS NOT NULL
      ORDER BY b.return_date DESC
    `, [studentId]);

    res.json(rows);
  } catch (e) {
    console.error("GET /returned/for-student/:id", e);
    res.status(500).json({ message: "Gagal mengambil data riwayat pengembalian." });
  }
});

/* ╔════════════════════════════════════════════╗
   ║ POST /api/borrows – catat peminjaman baru  ║
   ╚════════════════════════════════════════════╝ */
router.post("/", auth, async (req, res) => {
  const { student_id, book_id, due_date } = req.body;
  if (!student_id || !book_id || !due_date) {
    return res.status(400).json({ message: "Semua field wajib diisi." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[book]] = await conn.query("SELECT id, stock FROM books WHERE id = ?", [book_id]);
    if (!book || book.stock <= 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Buku tidak tersedia atau stok habis." });
    }

    const [[existingBorrow]] = await conn.query(
      "SELECT id FROM borrows WHERE student_id = ? AND book_id = ? AND return_date IS NULL",
      [student_id, book_id]
    );
    if (existingBorrow) {
      await conn.rollback();
      return res.status(409).json({ message: "Siswa sudah meminjam buku ini dan belum mengembalikannya." });
    }

    const [result] = await conn.query(
      "INSERT INTO borrows (student_id, book_id, borrow_date, due_date) VALUES (?, ?, CURDATE(), ?)",
      [student_id, book_id, due_date]
    );

    await conn.query("UPDATE books SET stock = stock - 1 WHERE id = ?", [book_id]);

    await conn.commit();
    res.status(201).json({ id: result.insertId, message: "Peminjaman berhasil dicatat." });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: "Gagal mencatat peminjaman." });
  } finally {
    conn.release();
  }
});

/* ╔════════════════════════════════════════════╗
   ║ PUT /api/borrows/:id/return – kembalikan buku ║
   ╚════════════════════════════════════════════╝ */
router.put("/:id/return", auth, async (req, res) => {
  const { id } = req.params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[borrow]] = await conn.query("SELECT id, book_id, return_date FROM borrows WHERE id = ?", [id]);
    if (!borrow) {
      await conn.rollback();
      return res.status(404).json({ message: "Peminjaman tidak ditemukan." });
    }
    if (borrow.return_date) {
      await conn.rollback();
      return res.status(400).json({ message: "Buku sudah dikembalikan." });
    }

    const [result] = await conn.query("UPDATE borrows SET return_date = CURDATE() WHERE id = ?", [id]);
    await conn.query("UPDATE books SET stock = stock + 1 WHERE id = ?", [borrow.book_id]);

    await conn.commit();
    res.json({ message: "Buku berhasil dikembalikan." });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: "Gagal mengembalikan buku." });
  } finally {
    conn.release();
  }
});

/* ╔════════════════════════════════════════════╗
   ║ GET /api/borrows/stats/borrow-trends – Grafik ║
   ╚════════════════════════════════════════════╝ */
router.get("/stats/borrow-trends", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATE(borrow_date) AS date,
        COUNT(*) AS count
      FROM borrows
      WHERE borrow_date >= CURDATE() - INTERVAL 30 DAY
      GROUP BY date
      ORDER BY date ASC
    `);

    const today = dayjs();
    const last30Days = Array.from({ length: 30 }, (_, i) =>
      today.subtract(29 - i, 'day').format('YYYY-MM-DD')
    );

    const borrowMap = new Map();
    rows.forEach(row => {
      borrowMap.set(dayjs(row.date).format('YYYY-MM-DD'), row.count);
    });

    const borrowTrends = last30Days.map(date => ({
      _id: date,
      count: borrowMap.get(date) || 0,
    }));

    res.json({ borrowTrends });
  } catch (error) {
    console.error("Error fetching borrow trends:", error);
    res.status(500).json({ message: "Error fetching borrow trends" });
  }
});

export default router;