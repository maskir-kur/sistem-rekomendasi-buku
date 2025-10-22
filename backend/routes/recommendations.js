// ──────────────────────────────────────────────
// backend/routes/recommendations.js
// ──────────────────────────────────────────────
import express from "express";
import { spawn } from "child_process";
import auth from "../middleware/auth.js";
import pool from "../db.js";

const router = express.Router();

/* ╔═══════════════════════════════════════════════════════════════╗
   ║ GET /api/recommendations - Dapatkan Rekomendasi Batch Aktif ║
   ╚═══════════════════════════════════════════════════════════════╝ */
router.get("/", auth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM recommendation_batches WHERE is_active = TRUE ORDER BY generated_at DESC LIMIT 1"
        );

        if (rows.length === 0) {
            return res.status(200).json({ message: "Tidak ada batch rekomendasi aktif.", recommendations: [] });
        }

        const activeBatch = rows[0];
        const recommendations = {
            id: activeBatch.id,
            generated_at: activeBatch.generated_at,
            // Pastikan data Apriori sudah di-parse
            rules_data: JSON.parse(activeBatch.rules_data), 
            is_active: activeBatch.is_active
        };

        return res.status(200).json({ recommendations });
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        return res.status(500).json({ message: "Gagal mengambil data rekomendasi." });
    }
});

/* ╔═══════════════════════════════════════════════════════════════╗
   ║ POST /api/recommendations/books/details-by-ids – Dapatkan Detail Buku ║
   ╚═══════════════════════════════════════════════════════════════╝ */
router.post("/books/details-by-ids", auth, async (req, res) => {
    const { bookIds } = req.body;

    if (!Array.isArray(bookIds) || bookIds.length === 0) {
        return res.status(400).json({ message: "Parameter 'bookIds' harus berupa array ID buku yang tidak kosong." });
    }

    try {
        const [books] = await pool.query(
            `SELECT id, title, author, cover_image_url, published_year, stock FROM books WHERE id IN (?)`,
            [bookIds]
        );
        res.status(200).json(books);
    } catch (error) {
        console.error("Error fetching book details by IDs in recommendations router:", error);
        res.status(500).json({ message: "Server error saat mengambil detail buku berdasarkan ID." });
    }
});

/* ╔═════════════════════════════════════════════════╗
   ║ POST /api/recommendations/generate – Picu Rekomendasi ML ║
   ╚═════════════════════════════════════════════════╝ */
router.post("/generate", auth, async (req, res) => {
    try {
        const pythonScriptPath = '../ml_recommender/scripts/generate_recommendations.py';
        const pythonInterpreterPath = 'D:\\sistem-rekomendasi-buku\\ml_recommender\\venv\\Scripts\\python.exe';

        const pythonProcess = spawn(pythonInterpreterPath, [pythonScriptPath]);

        let data = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        pythonProcess.stderr.on('data', (err) => {
            errorData += err.toString();
            console.error(`Python Stderr: ${err.toString()}`);
        });

        pythonProcess.on('close', async (code) => {
            if (code === 0) {
                try {
                    const cleanedData = data.trim();
                    const recommendationsResult = JSON.parse(cleanedData);

                    const { recommendation_rules } = recommendationsResult;

                    const conn = await pool.getConnection();
                    try {
                        await conn.beginTransaction();

                        await conn.query(
                            "INSERT INTO recommendation_batches (rules_data) VALUES (?)",
                            [JSON.stringify(recommendation_rules)]
                        );

                        await conn.commit();
                        res.json({ message: "Rekomendasi berhasil dibuat & disimpan.", data: recommendationsResult });
                    } catch (dbError) {
                        await conn.rollback();
                        console.error("Error saving recommendations to DB:", dbError);
                        res.status(500).json({ message: "Gagal menyimpan hasil rekomendasi ke database." });
                    } finally {
                        conn.release();
                    }
                } catch (parseError) {
                    console.error("Failed to parse Python output:", parseError);
                    res.status(500).json({ message: "Gagal memproses output rekomendasi dari Python (bukan JSON valid)." });
                }
            } else {
                console.error(`Python script exited with code ${code}. Stderr: ${errorData}`);
                res.status(500).json({ message: `Gagal menjalankan skrip rekomendasi Python. Code: ${code}. Error: ${errorData}` });
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error saat memicu rekomendasi." });
    }
});

/* ╔═════════════════════════════════════════════════╗
   ║ GET /api/recommendations/for-student/:studentId – Rekomendasi Siswa ║
   ║ (Logika Apriori)                                ║
   ╚═════════════════════════════════════════════════╝ */
router.get("/for-student/:studentId", auth, async (req, res) => {
    const { studentId } = req.params;

    try {
        const [activeBatchRows] = await pool.query(
            "SELECT rules_data FROM recommendation_batches WHERE is_active = TRUE ORDER BY generated_at DESC LIMIT 1"
        );

        if (activeBatchRows.length === 0) {
            return res.status(404).json({ message: "Tidak ada batch rekomendasi yang aktif saat ini." });
        }

        // --- PERBAIKAN PENTING DI SINI ---
        // Parse string JSON dari database menjadi objek JavaScript
        let recommendationRules = null;
        try {
            if (activeBatchRows[0].rules_data) {
                recommendationRules = JSON.parse(activeBatchRows[0].rules_data);
            }
        } catch (parseError) {
            console.error("Error parsing rules_data JSON:", parseError);
            return res.status(500).json({ message: "Data rekomendasi aktif rusak (invalid JSON)." });
        }

        // Jika rules_data kosong atau tidak valid
        if (!recommendationRules || Object.keys(recommendationRules).length === 0) {
            return res.status(200).json({ student: {}, recommendations: [], message: "Data aturan rekomendasi kosong." });
        }

        const [borrowedBooksRows] = await pool.query(
            "SELECT book_id FROM borrows WHERE student_id = ?",
            [studentId]
        );
        const borrowedBookIds = borrowedBooksRows.map(row => String(row.book_id));

        let recommendedBookIds = new Set();
        
        for (const borrowedId of borrowedBookIds) {
            const ruleKey = borrowedId;
            if (recommendationRules[ruleKey]) {
                recommendationRules[ruleKey].recommends.forEach(bookId => recommendedBookIds.add(bookId));
            }
        }

        if (borrowedBookIds.length > 1) {
            const sortedBorrowedIds = borrowedBookIds.sort((a, b) => parseInt(a) - parseInt(b)).join(',');
            if (recommendationRules[sortedBorrowedIds]) {
                recommendationRules[sortedBorrowedIds].recommends.forEach(bookId => recommendedBookIds.add(bookId));
            }
        }
        
        const finalRecommendedIds = Array.from(recommendedBookIds).filter(
            bookId => !borrowedBookIds.includes(String(bookId))
        );

        let recommendedBooks = [];
        if (finalRecommendedIds.length > 0) {
            const [books] = await pool.query(
                `SELECT id, title, author, cover_image_url, published_year, stock FROM books WHERE id IN (?)`,
                [finalRecommendedIds]
            );
            recommendedBooks = books;
        }

        const [studentInfo] = await pool.query("SELECT id, nisn, name, class FROM students WHERE id = ?", [studentId]);
        const student = studentInfo[0];

        res.status(200).json({
            student: student,
            recommendations: recommendedBooks
        });

    } catch (error) {
        console.error("Error in /for-student/:studentId endpoint:", error);
        res.status(500).json({ message: "Server error saat mengambil rekomendasi." });
    }
});

/* ╔═════════════════════════════════════════════════════════╗
   ║ GET /api/recommendations/batches – Dapatkan Semua Batch Rekomendasi ║
   ╚═════════════════════════════════════════════════════════╝ */
router.get("/batches", auth, async (req, res) => {
    try {
        const [batches] = await pool.query(
            "SELECT id, generated_at, is_active FROM recommendation_batches ORDER BY generated_at DESC"
        );
        res.status(200).json(batches);
    } catch (error) {
        console.error("Error fetching recommendation batches:", error);
        res.status(500).json({ message: "Server error saat mengambil daftar batch rekomendasi." });
    }
});

/* ╔═════════════════════════════════════════════════════════════════════╗
   ║ GET /api/recommendations/batches/:batchId – Dapatkan Detail Batch Tertentu ║
   ╚═════════════════════════════════════════════════════════════════════╝ */
router.get("/batches/:batchId", auth, async (req, res) => {
    const { batchId } = req.params;
    try {
        const [batchRows] = await pool.query(
            "SELECT id, generated_at, is_active, rules_data FROM recommendation_batches WHERE id = ?",
            [batchId]
        );

        if (batchRows.length === 0) {
            return res.status(404).json({ message: "Batch rekomendasi tidak ditemukan." });
        }
        // Pastikan data Apriori sudah di-parse
        if (batchRows[0].rules_data) {
            batchRows[0].rules_data = JSON.parse(batchRows[0].rules_data);
        }
        res.status(200).json(batchRows[0]);
    } catch (error) {
        console.error("Error fetching recommendation batch details:", error);
        res.status(500).json({ message: "Server error saat mengambil detail batch rekomendasi." });
    }
});


/* ╔═══════════════════════════════════════════════════════════════════╗
   ║ GET /api/recommendations/latest-summary - Dapatkan Ringkasan Batch Terbaru ║
   ╚═══════════════════════════════════════════════════════════════════╝ */
router.get("/latest-summary", auth, async (req, res) => {
    try {
        // Ambil batch rekomendasi terakhir dari database
        // MODIFIKASI: Tambahkan kolom ID untuk digunakan nanti
        const [rows] = await pool.query(
            "SELECT id, rules_data, generated_at FROM recommendation_batches ORDER BY generated_at DESC LIMIT 1"
        );

        if (rows.length === 0) {
            return res.status(200).json({
                summaryId: null, // Tambahkan ID
                recommendationsCount: 0,
                studentsCount: 0,
                status: 'no_data'
            });
        }

        const latestBatch = rows[0];
        let rulesData = {};
        try {
            rulesData = JSON.parse(latestBatch.rules_data);
        } catch (parseError) {
            console.error("Failed to parse rules_data JSON:", parseError);
            return res.status(500).json({ message: "Data aturan rekomendasi rusak (invalid JSON)." });
        }

        // Hitung total rekomendasi dan kumpulkan semua ID buku Antiseden (sebab)
        let recommendationsCount = 0;
        let antecedentBookIds = new Set();
        
        for (const antecedentKey in rulesData) {
            if (rulesData.hasOwnProperty(antecedentKey)) {
                // Antiseden bisa berupa satu ID atau beberapa ID dipisahkan koma
                antecedentKey.split(',').forEach(id => {
                    // Pastikan ID adalah angka valid (trimming whitespace)
                    const bookId = id.trim();
                    if (!isNaN(parseInt(bookId))) {
                        antecedentBookIds.add(bookId);
                    }
                });
                recommendationsCount += rulesData[antecedentKey].recommends.length;
            }
        }

        let studentsCount = 0;
        let allImpactedStudentIds = new Set();
        
        if (antecedentBookIds.size > 0) {
            const antecedentIdsArray = Array.from(antecedentBookIds);
            
            // QUERY BARU: Cari semua siswa yang pernah meminjam buku-buku di antecedent
            const [impactedStudentsRows] = await pool.query(
                "SELECT DISTINCT student_id FROM borrows WHERE book_id IN (?)",
                [antecedentIdsArray]
            );
            
            studentsCount = impactedStudentsRows.length;
            // Simpan ID siswa ke Set (untuk digunakan di endpoint baru nanti)
            impactedStudentsRows.forEach(row => allImpactedStudentIds.add(row.student_id));
        }

        const summary = {
            summaryId: latestBatch.id, // ID batch terbaru
            recommendationsCount: recommendationsCount,
            studentsCount: studentsCount,
            status: 'success',
            generated_at: latestBatch.generated_at
        };

        // NOTE: Kita tidak menyimpan daftar siswa terpengaruh di sini,
        // hanya menghitungnya. Daftar lengkap akan diambil di endpoint baru.
        res.status(200).json(summary);

    } catch (error) {
        console.error("Error fetching latest recommendations summary:", error);
        res.status(500).json({ message: "Gagal mengambil ringkasan rekomendasi terbaru." });
    }
});

/* ╔═════════════════════════════════════════════════════════════════════╗
   ║ GET /api/recommendations/:batchId/students – Dapatkan Daftar Siswa Terpengaruh ║
   ╚═════════════════════════════════════════════════════════════════════╝ */
router.get("/:batchId/students", auth, async (req, res) => {
    const { batchId } = req.params;

    try {
        // 1. Ambil Rules Data dari Batch yang diminta
        const [batchRows] = await pool.query(
            "SELECT rules_data FROM recommendation_batches WHERE id = ?",
            [batchId]
        );

        if (batchRows.length === 0) {
            return res.status(404).json({ message: "Batch rekomendasi tidak ditemukan." });
        }

        let rulesData = {};
        try {
            rulesData = JSON.parse(batchRows[0].rules_data);
        } catch (parseError) {
            console.error("Failed to parse rules_data JSON:", parseError);
            return res.status(500).json({ message: "Data aturan rekomendasi rusak (invalid JSON)." });
        }

        // 2. Kumpulkan semua ID buku Antiseden (buku yang dipinjam yang memicu aturan)
        let antecedentBookIds = new Set();
        for (const antecedentKey in rulesData) {
            if (rulesData.hasOwnProperty(antecedentKey)) {
                antecedentKey.split(',').forEach(id => {
                    const bookId = id.trim();
                    if (!isNaN(parseInt(bookId))) {
                        antecedentBookIds.add(bookId);
                    }
                });
            }
        }

        if (antecedentBookIds.size === 0) {
            return res.status(200).json({ students: [], message: "Tidak ada aturan yang dihasilkan pada batch ini." });
        }

        // 3. Cari ID semua siswa yang meminjam buku-buku Antiseden tersebut
        const antecedentIdsArray = Array.from(antecedentBookIds);
        
        const [impactedStudentIdsRows] = await pool.query(
            "SELECT DISTINCT student_id FROM borrows WHERE book_id IN (?)",
            [antecedentIdsArray]
        );
        
        const impactedStudentIds = impactedStudentIdsRows.map(row => row.student_id);

        if (impactedStudentIds.length === 0) {
            return res.status(200).json({ students: [], message: "Tidak ada siswa yang meminjam buku yang relevan dengan aturan." });
        }

        // 4. Ambil detail siswa berdasarkan ID yang ditemukan
        const [students] = await pool.query(
            `SELECT id AS studentId, nisn, name, class FROM students WHERE id IN (?) ORDER BY name ASC`,
            [impactedStudentIds]
        );
        
        // 5. Kembalikan hasilnya
        res.status(200).json({ students });

    } catch (error) {
        console.error("Error fetching impacted students:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa yang terpengaruh." });
    }
});


/* ╔═════════════════════════════════════════════════════════════════════╗
   ║ POST /api/recommendations/batches/:batchId/set-active – Set Batch Aktif ║
   ╚═════════════════════════════════════════════════════════════════════╝ */
router.post("/batches/:batchId/set-active", auth, async (req, res) => {
    const { batchId } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query("UPDATE recommendation_batches SET is_active = FALSE");

        const [result] = await conn.query(
            "UPDATE recommendation_batches SET is_active = TRUE WHERE id = ?",
            [batchId]
        );

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Batch rekomendasi tidak ditemukan atau sudah aktif." });
        }

        await conn.commit();
        res.status(200).json({ message: `Batch ID ${batchId} berhasil diatur sebagai aktif.` });
    } catch (error) {
        await conn.rollback();
        console.error("Error setting batch as active:", error);
        res.status(500).json({ message: "Server error saat mengatur batch aktif." });
    } finally {
        conn.release();
    }
});

/* ╔═════════════════════════════════════════════════════════════╗
   ║ DELETE /api/recommendations/batches/:batchId – Hapus Batch Rekomendasi ║
   ╚═════════════════════════════════════════════════════════════╝ */
router.delete("/batches/:batchId", auth, async (req, res) => {
    const { batchId } = req.params;
    try {
        const [result] = await pool.query(
            "DELETE FROM recommendation_batches WHERE id = ?",
            [batchId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Batch rekomendasi tidak ditemukan." });
        }
        res.status(200).json({ message: `Batch ID ${batchId} berhasil dihapus.` });
    } catch (error) {
        console.error("Error deleting recommendation batch:", error);
        res.status(500).json({ message: "Server error saat menghapus batch rekomendasi." });
    }
});

/* ╔═══════════════════════════════════════════════════════════════╗
   ║ POST /api/students/details-by-ids – Dapatkan Detail Siswa Berdasarkan ID ║
   ╚═══════════════════════════════════════════════════════════════╝ */
router.post("/students/details-by-ids", auth, async (req, res) => {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "Parameter 'studentIds' harus berupa array ID siswa yang tidak kosong." });
    }

    try {
        const [students] = await pool.query(
            `SELECT id, nisn, name, class FROM students WHERE id IN (?)`,
            [studentIds]
        );
        res.status(200).json(students);
    } catch (error) {
        console.error("Error fetching student details by IDs:", error);
        res.status(500).json({ message: "Server error saat mengambil detail siswa berdasarkan ID." });
    }
});

export default router;