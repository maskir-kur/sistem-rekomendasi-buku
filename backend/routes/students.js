// ──────────────────────────────────────────────
// backend/routes/students.js - VERSI PERBAIKAN
// ──────────────────────────────────────────────
import express from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";
import { compare, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config.js";

const router = express.Router();

/**
 * @description GET /api/students - Mengambil semua data siswa dengan paginasi, filter, dan sorting.
 * @access Private (Admin/Staff)
 * @param {object} req - Objek request, berisi query string.
 * @param {object} res - Objek response.
 */
/**
 * @description GET /api/students - Mengambil semua data siswa dengan paginasi, filter, dan sorting.
 * @access Private (Admin/Staff)
 * @param {object} req - Objek request, berisi query string.
 * @param {object} res - Objek response.
 */
router.get("/", auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            searchClass = '',
            sortBy = 'class',
            sortOrder = 'asc',
            searchGeneral = '',
            all: showAllQuery,
        } = req.query;

        // Tentukan apakah ini adalah request paginasi/tabel normal,
        // ATAU request pencarian cepat (seperti dari Combobox).
        const isQuickSearch = searchGeneral.length > 0 && parseInt(limit) > 10;
        
        let offset;
        let parsedLimit;
        
        if (isQuickSearch) {
            // Saat QuickSearch (Combobox), kita hanya peduli pada 
            // limit yang kecil dan tidak perlu offset.
            parsedLimit = Math.min(parseInt(limit), 50); // Maksimum hanya 50 hasil untuk Combobox
            offset = 0; 
        } else {
            // Logika Normal untuk halaman tabel
            offset = (parseInt(page) - 1) * parseInt(limit);
            parsedLimit = parseInt(limit);
        }

        const parsedShowAll = showAllQuery === "true";

        let whereClauses = [];
        let queryParams = [];

        // 1. Tambahkan filter status aktif/non-aktif
        // Jika parsedShowAll=true, berarti kita ingin yang DIARSIP (active=0)
        if (parsedShowAll) {
            whereClauses.push("active = 0");
        } else {
            // Jika parsedShowAll=false (default), berarti kita ingin yang AKTIF (active=1)
            whereClauses.push("active = 1");
        }

        // 2. Filter pencarian kelas (hanya berlaku untuk tabel normal)
        if (searchClass && !isQuickSearch) {
            whereClauses.push("`class` LIKE ?");
            queryParams.push(`%${searchClass}%`);
        }

        // 3. Tambahkan filter pencarian umum (NISN atau Nama)
        if (searchGeneral) {
            whereClauses.push("(`nisn` LIKE ? OR `name` LIKE ?)");
            queryParams.push(`%${searchGeneral}%`);
            queryParams.push(`%${searchGeneral}%`);
        }

        let sql = "SELECT id, nisn, name, `class`, active FROM students";
        let countSql = "SELECT COUNT(*) AS totalCount FROM students";
        
        if (whereClauses.length > 0) {
            const whereString = whereClauses.join(" AND ");
            sql += ` WHERE ${whereString}`;
            countSql += ` WHERE ${whereString}`;
        }

        // --- SORTING ---
        let finalSortBy = 'class';
        let finalSortOrder = 'asc';

        if (isQuickSearch) {
            finalSortBy = 'name';
            finalSortOrder = 'asc';
        } else {
            const validSortColumns = ['id', 'nisn', 'name', 'class', 'active'];
            const validSortOrder = ['asc', 'desc'];
            finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'class';
            finalSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';
        }
        
        sql += ` ORDER BY \`${finalSortBy}\` ${finalSortOrder}`;

        // --- PAGINASI/LIMIT ---
        // Jumlah total hanya dihitung jika ini bukan QuickSearch
        const countPromise = isQuickSearch
            ? Promise.resolve([[{ totalCount: parsedLimit }], []]) // PERBAIKAN: Resolve ke format [rows, fields]
            : pool.query(countSql, queryParams);


        sql += ` LIMIT ? OFFSET ?`;
        queryParams.push(parsedLimit, offset);

        const [studentsRows] = await pool.query(sql, queryParams);
        const [countRows] = await countPromise; // Sekarang 'countRows' akan menjadi array di kedua kasus

        res.json({
            students: studentsRows,
            totalCount: countRows[0].totalCount // AMAN: countRows[0] kini selalu objek { totalCount: N }
        });

    } catch (e) {
        console.error("GET /students", e);
        // Tambahkan fallback data kosong untuk QuickSearch saat error
        res.status(500).json({ 
            message: "Gagal mengambil data siswa", 
            students: [], 
            totalCount: 0 
        });
    }
});
/**
 * @description POST /api/students - Menambahkan siswa baru.
 * @access Private (Admin/Staff)
 * @param {object} req - Berisi data siswa (nisn, name, class, password).
 */
router.post("/", auth, async (req, res) => {
    const { nisn, name, class: studentClass, password } = req.body;
    if (!nisn || !name || !studentClass || !password) {
        return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    const conn = await pool.getConnection();
    try {
        const [[existing]] = await conn.query("SELECT id FROM students WHERE nisn = ?", [nisn]);
        if (existing) {
            return res.status(409).json({ message: "NISN sudah terdaftar." });
        }

        const hashedPassword = await hash(password, 10);
        const [result] = await conn.query(
            "INSERT INTO students (nisn, name, `class`, password_hash) VALUES (?, ?, ?, ?)",
            [nisn, name, studentClass, hashedPassword]
        );
        res.status(201).json({ id: result.insertId, nisn, name, class: studentClass, active: 1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal menambahkan siswa." });
    } finally {
        conn.release();
    }
});

/**
 * @description PUT /api/students/:id - Memperbarui data siswa berdasarkan ID.
 * @access Private (Admin/Staff)
 * @param {object} req - Berisi ID siswa di params dan data update di body.
 */
router.put("/:id", auth, async (req, res) => {
    const { id } = req.params;
    // PERBAIKAN: Ambil NISN dari body
    const { nisn, name, class: studentClass, password, active } = req.body; 

    // PERBAIKAN: Pastikan NISN, Name, dan Class ada di body
    if (!nisn || !name || !studentClass) { 
        return res.status(400).json({ message: "NISN, Nama, dan kelas wajib diisi." });
    }

    const updates = {};
    const params = [];

    // PERBAIKAN KRUSIAL: Tambahkan NISN ke updates
    updates.nisn = nisn; 
    params.push(nisn);

    updates.name = name;
    params.push(name);
    updates.class = studentClass;
    params.push(studentClass);

    if (password) {
        updates.password_hash = await hash(password, 10);
        params.push(updates.password_hash);
    }
    if (typeof active === 'boolean') {
        updates.active = active ? 1 : 0;
        params.push(updates.active);
    }

    const setClauses = Object.keys(updates)
        .map((key) => `\`${key}\` = ?`)
        .join(", ");

    params.push(id);

    const conn = await pool.getConnection();
    try {
        // Cek duplikasi NISN BARU, tapi abaikan ID siswa yang sedang diedit
        const [[existing]] = await conn.query(
             "SELECT id FROM students WHERE nisn = ? AND id != ?", 
             [nisn, id]
        );
        if (existing) {
             return res.status(409).json({ message: "NISN baru sudah terdaftar pada siswa lain." });
        }
        
        const [result] = await conn.query(
            `UPDATE students SET ${setClauses} WHERE id = ?`,
            params
        );
        
        if (result.affectedRows === 0) {
            // Ini bisa terjadi jika data tidak berubah (nisn lama = nisn baru)
            // Atau ID tidak ditemukan
            // Kita anggap berhasil jika ID ditemukan (untuk menghindari error
            // saat admin hanya mengklik simpan tanpa mengubah data)
            const [[student]] = await conn.query("SELECT id FROM students WHERE id = ?", [id]);
            if (!student) {
                 return res.status(404).json({ message: "Siswa tidak ditemukan." });
            }
        }
        res.json({ message: "Data siswa berhasil diperbarui." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal memperbarui data siswa." });
    } finally {
        conn.release();
    }
});

/**
 * @description PUT /api/students/:id/deactivate - Mengarsipkan siswa.
 * @access Private (Admin/Staff)
 */
router.put("/:id/deactivate", auth, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query("UPDATE students SET active = 0 WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Siswa tidak ditemukan." });
        }
        res.json({ message: "Siswa berhasil diarsipkan." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengarsipkan siswa." });
    }
});

/**
 * @description PUT /api/students/:id/activate - Mengaktifkan kembali siswa.
 * @access Private (Admin/Staff)
 */
router.put("/:id/activate", auth, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query("UPDATE students SET active = 1 WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Siswa tidak ditemukan." });
        }
        res.json({ message: "Siswa berhasil diaktifkan kembali." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengaktifkan siswa." });
    }
});

/**
 * @description DELETE /api/students/:id - Menghapus siswa.
 * @access Private (Admin/Staff)
 */
router.delete("/:id", auth, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM borrows WHERE student_id = ?", [id]);

        const [result] = await pool.query("DELETE FROM students WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Siswa tidak ditemukan." });
        }
        res.json({ message: "Siswa berhasil dihapus." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal menghapus siswa." });
    }
});

/**
 * @description GET /api/students/:id - Mengambil detail siswa berdasarkan ID.
 * @access Private (Admin/Staff)
 */
router.get("/:id", auth, async (req, res) => {
    const { id } = req.params;
    try {
        const [[student]] = await pool.query("SELECT id, nisn, name, `class`, active FROM students WHERE id = ?", [id]);
        if (!student) {
            return res.status(404).json({ message: "Siswa tidak ditemukan." });
        }
        res.json({ student });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengambil detail siswa." });
    }
});

/**
 * @description POST /api/students/login - Autentikasi dan login siswa.
 * @access Public
 */
router.post("/login", async (req, res) => {
    const { nisn, password } = req.body;
    if (!nisn || !password) {
        return res.status(400).json({ message: "NISN dan password wajib diisi." });
    }
    try {
        const [[student]] = await pool.query("SELECT id, nisn, name, password_hash, active FROM students WHERE nisn = ?", [nisn]);

        if (!student || !(await compare(password, student.password_hash))) {
            return res.status(401).json({ message: "NISN atau password salah." });
        }
        if (!student.active) {
            return res.status(403).json({ message: "Akun siswa tidak aktif." });
        }

        const token = jwt.sign(
            { id: student.id, nisn: student.nisn, name: student.name, role: "student" },
            config.jwtSecret,
            { expiresIn: "1d" }
        );
        res.json({ token, student: { id: student.id, nisn: student.nisn, name: student.name, active: student.active } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal login." });
    }
});

/**
 * @description POST /api/students/details-by-ids - Mengambil detail siswa berdasarkan array ID.
 * @access Private (Admin/Staff)
 */
router.post("/details-by-ids", auth, async (req, res) => {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "Parameter 'studentIds' harus berupa array ID siswa yang tidak kosong." });
    }

    try {
        const [students] = await pool.query(
            `SELECT id, nisn, name, class FROM students WHERE id IN (?)`,
            [studentIds]
        );
        res.status(200).json({ students });
    } catch (error) {
        console.error("Error fetching student details by IDs:", error);
        res.status(500).json({ message: "Server error saat mengambil detail siswa berdasarkan ID." });
    }
});

// ════════════════════════════════════════════════════════════════════
// RUTE EFEKTIF BARU UNTUK MENGGABUNGKAN RIWAYAT & REKOMENDASI (DIBERSIHKAN)
// ════════════════════════════════════════════════════════════════════

/**
 * @description GET /api/students/:id/history-and-recommendations - Mengambil riwayat peminjaman.
 * @access Private (Admin/Staff)
 */
router.get("/:id/history-and-recommendations", auth, async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();

    try {
        // Logika 1: Ambil riwayat peminjaman siswa, gabungkan dengan data buku
        const [borrowedBooks] = await conn.query(
            `SELECT
                b.id,
                b.borrow_date,
                b.return_date,
                books.id AS book_id,
                books.title AS book_title,
                books.author AS book_author
            FROM borrows b
            JOIN books ON b.book_id = books.id
            WHERE b.student_id = ?
            ORDER BY b.borrow_date DESC`,
            [id]
        );
        
        // Logika 2: Kirim respons dengan struktur yang diharapkan oleh frontend
        // Riwayat ada di 'borrowedBooks' dan rekomendasi KOSONG (karena dipisah).
        res.json({
            borrowedBooks,
            recommendations: [], // <--- PENTING: Untuk menjaga struktur API tetap sama
        });

    } catch (error) {
        console.error("Error fetching student history:", error);
        res.status(500).json({ message: "Gagal mengambil data riwayat." });
    } finally {
        conn.release();
    }
});

export default router;