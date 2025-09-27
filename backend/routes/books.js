// ──────────────────────────────────────────────
// backend/routes/books.js
// ──────────────────────────────────────────────
import express from "express";
import pool from "../db.js";        // koneksi MySQL (mysql2/promise)
import auth from "../middleware/auth.js"; // middleware JWT

const router = express.Router();

/* ╔════════════════════════════════════════════╗
   ║   GET /api/books – ambil semua buku         ║
   ╚════════════════════════════════════════════╝ */
router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM books");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data buku" });
  }
});

/* ╔════════════════════════════════════════════╗
   ║   POST /api/books – tambah buku baru        ║
   ╚════════════════════════════════════════════╝ */
router.post("/", auth, async (req, res) => {
  try {
    const { title, author, published_year, stock } = req.body;

    // validasi sederhana
    if (!title || !author || !published_year || !stock) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // simpan ke DB
    const [result] = await pool.query(
      "INSERT INTO books (title, author, published_year, stock) VALUES (?, ?, ?, ?)",
      [title, author, published_year, stock]
    );

    res.status(201).json({ id: result.insertId, message: "Buku berhasil ditambahkan" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menambahkan buku" });
  }
});

/* ╔════════════════════════════════════════════╗
   ║   PUT /api/books/:id – edit buku            ║
   ╚════════════════════════════════════════════╝ */
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, published_year, stock } = req.body;

    // validasi sederhana untuk update
    if (!title || !author || !published_year || !stock) {
      return res.status(400).json({ message: "Data tidak lengkap untuk pembaruan" });
    }

    const [result] = await pool.query( // Tambahkan [result] untuk mengecek affectedRows
      "UPDATE books SET title=?, author=?, published_year=?, stock=? WHERE id=?",
      [title, author, published_year, stock, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Buku tidak ditemukan untuk diperbarui" });
    }

    res.json({ message: "Buku berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengedit buku" });
  }
});

/* ╔════════════════════════════════════════════╗
   ║   DELETE /api/books/:id – hapus buku        ║
   ╚════════════════════════════════════════════╝ */
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  let connection; // Deklarasikan variabel koneksi di luar try block

  try {
    // 1. Dapatkan koneksi dari pool dan mulai transaksi
    connection = await pool.getConnection(); // Menggunakan pool.getConnection() untuk mysql2/promise
    await connection.beginTransaction();     // Mulai transaksi

    // 2. Hapus catatan peminjaman (borrows) yang terkait dengan buku ini terlebih dahulu
    // Ini akan menghapus baris-baris di tabel `borrows` di mana `book_id` cocok
    // dengan ID buku yang akan dihapus.
    const [delBorrowsResult] = await connection.query("DELETE FROM borrows WHERE book_id = ?", [id]);
    console.log(`Deleted ${delBorrowsResult.affectedRows} borrows entries linked to book_id: ${id}`);

    // 3. Kemudian, hapus buku itu sendiri dari tabel `books`
    const [delBookResult] = await connection.query("DELETE FROM books WHERE id = ?", [id]);
    console.log(`Deleted book with id: ${id}, affected rows: ${delBookResult.affectedRows}`);

    // 4. Commit transaksi jika kedua operasi berhasil
    await connection.commit();

    if (delBookResult.affectedRows === 0) {
      // Jika buku tidak ditemukan, mungkin sudah terhapus atau ID salah
      return res.status(404).json({ message: "Buku tidak ditemukan atau sudah dihapus." });
    }

    res.json({ message: "Buku berhasil dihapus." });

  } catch (err) {
    // Jika terjadi error, rollback transaksi
    if (connection) {
      await connection.rollback();
      console.log("Transaction rolled back due to error.");
    }
    console.error("Error deleting book:", err);
    // Lebih detail error message untuk debugging
    res.status(500).json({
      message: "Gagal menghapus buku. Terjadi kesalahan pada server.",
      error: err.sqlMessage || err.message, // err.message lebih umum, err.sqlMessage untuk error SQL spesifik
      code: err.code, // Tambahkan kode error database jika ada
    });
  } finally {
    // Pastikan koneksi dikembalikan ke pool
    if (connection) {
      connection.release();
      console.log("Database connection released.");
    }
  }
});

export default router;