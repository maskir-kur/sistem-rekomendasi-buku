// ──────────────────────────────────────────────
// backend/routes/recommendations.js (HYBRID IMPLEMENTATION)
// ──────────────────────────────────────────────
import express from "express";
import { spawn } from "child_process";
import auth from "../middleware/auth.js";
import pool from "../db.js"; // Asumsi pool adalah koneksi database Anda

const router = express.Router();

// Helper function untuk mengambil nilai konfigurasi
async function getActiveTimestamp() {
    const [configRows] = await pool.query(
        "SELECT config_value FROM system_config WHERE config_key = 'active_reco_batch_timestamp'"
    );
    return configRows.length > 0 ? configRows[0].config_value : null;
}

/* ╔═════════════════════════════════════════════════╗
   ║ POST /api/recommendations/generate – Picu Rekomendasi ML & Set Aktif ║
   ║ (Menjalankan Python K-Means & Apriori)                                ║
   ╚═════════════════════════════════════════════════╝ */
router.post("/generate", auth, async (req, res) => {
    try {
        // Path ke skrip Python
        const pythonScriptPath = '../ml_recommender/scripts/generate_recommendations.py';
        const pythonInterpreterPath = 'D:\\sistem-rekomendasi-buku\\ml_recommender\\venv\\Scripts\\python.exe';

        // Dapatkan timestamp saat proses dimulai, untuk referensi log
        const startTime = new Date().toISOString();
        console.log(`[ML TRIGGER] Starting Python script at ${startTime}`);
        
        // Spawn proses Python
        const pythonProcess = spawn(pythonInterpreterPath, [pythonScriptPath]);

        let errorData = '';
        
        // Tangani Error (stderr)
        pythonProcess.stderr.on('data', (err) => {
            errorData += err.toString();
            // console.error(`Python Stderr: ${err.toString()}`); // Matikan ini jika terlalu berisik
        });
        
        // Tangani output standar (stdout) - hanya untuk debugging jika perlu
        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python Stdout: ${data.toString()}`);
        });


        pythonProcess.on('close', async (code) => {
            if (code === 0) {
                const conn = await pool.getConnection();
                try {
                    await conn.beginTransaction();
                    
                    // 1. Ambil TIMESTAMP dari batch yang baru saja dibuat oleh Python
                    // Kita ambil yang terbaru, yang menandakan batch yang baru saja disimpan
                    const [latestBatchRow] = await conn.query(
                        "SELECT generated_at FROM recommendation_batches ORDER BY generated_at DESC LIMIT 1"
                    );
                    
                    if (latestBatchRow.length === 0) {
                         await conn.rollback();
                         return res.status(500).json({ message: "Skrip Python berhasil, tetapi tidak ada data yang disimpan di DB." });
                    }
                    
                    const newBatchTimestamp = latestBatchRow[0].generated_at;
                    
                    // 2. SET ACTIVE menggunakan tabel system_config
                    // Menggunakan ON DUPLICATE KEY UPDATE untuk memastikan config_key selalu unik
                    const updateQuery = `
                        INSERT INTO system_config (config_key, config_value) 
                        VALUES (?, ?) 
                        ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
                    `;
                    await conn.query(
                        updateQuery,
                        ['active_reco_batch_timestamp', newBatchTimestamp]
                    );

                    await conn.commit();
                    res.json({ message: `Rekomendasi berhasil dibuat & Batch ${newBatchTimestamp} diatur sebagai aktif.`, timestamp: newBatchTimestamp });
                } catch (dbError) {
                    await conn.rollback();
                    console.error("Error setting active timestamp after ML run:", dbError);
                    res.status(500).json({ message: "Gagal mengaktifkan hasil rekomendasi terbaru di database." });
                } finally {
                    conn.release();
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

const generateJsonString = (arr) => {
    // 1. Ubah ke integer, pastikan arr adalah array of strings/numbers
    const intArr = arr.map(id => parseInt(id));
    // 2. Sort array
    intArr.sort((a, b) => a - b);
    
    // 3. Stringify: Hapus spasi setelah koma jika ada.
    let jsonString = JSON.stringify(intArr);
    
    // PERBAIKAN KRITIS: Ganti ", " menjadi "," jika Node.js menambahkan spasi
    return jsonString.replace(/, /g, ','); 
};

/* ╔═════════════════════════════════════════════════╗
   ║ GET /api/recommendations/for-student/:studentId – REVISI FULL & FIX ERROR SINTAKS SQL ║
   ╚═════════════════════════════════════════════════╝ */
router.get("/for-student/:studentId", auth, async (req, res) => {
    const { studentId } = req.params;
    let studentClusterId = null;
    let activeTimestamp = null;
    let borrowedBookIds = [];
    let finalRecommendedIds = [];
    const RECOMMENDED_LIMIT = 5; // Target rekomendasi yang ingin dicapai

    // --- DEBUG LOG: Mulai Pemrosesan ---
    console.log(`[RECO_DEBUG] START: Processing recommendation for Student ID ${studentId}`);

    try {
        // 1. Dapatkan CLUSTER ID siswa
        const [clusterRows] = await pool.query(
            "SELECT cluster_id FROM cluster_recommendations WHERE student_id = ?",
            [studentId]
        );

        if (clusterRows.length > 0) {
            studentClusterId = clusterRows[0].cluster_id;
        }
        console.log(`[RECO_DEBUG] Cluster ID found: ${studentClusterId}`);

        // 2. Dapatkan TIMESTAMP batch aktif (Hanya diperlukan jika kolom 'generated_at' ada di tabel)
        // const activeTimestamp = await getActiveTimestamp(); 
        
        // 3. Dapatkan buku yang baru dipinjam siswa (MAKSIMAL 3 TERBARU)
        const [borrowedBooksRows] = await pool.query(
            "SELECT book_id FROM borrows WHERE student_id = ? ORDER BY borrow_date DESC LIMIT 3",
            [studentId]
        );
        borrowedBookIds = borrowedBooksRows.map(row => String(row.book_id));
        console.log(`[RECO_DEBUG] Borrowed Book IDs (for Antecedent): ${borrowedBookIds.join(',')}`);

        // 4. Tentukan Kandidat Antecedent (pemicu aturan)
        let allAntecedentCandidates = [];
        
        // Pemicu Single-Item (Ambil 3 buku terbaru)
        borrowedBookIds.forEach(id => {
            allAntecedentCandidates.push(generateJsonString([id]));
        });

        // Pemicu Multi-Item (2 buku terbaru)
        if (borrowedBookIds.length >= 2) {
            const latestTwo = [borrowedBookIds[0], borrowedBookIds[1]];
            allAntecedentCandidates.push(generateJsonString(latestTwo));
        }
        
        // Catatan: Jika Anda ingin menambahkan kombinasi 3 item, gunakan kombinasi: 
        // if (borrowedBookIds.length >= 3) { ... generateJsonString(borrowedBookIds.slice(0, 3)) }

        // Filter duplikat dan pastikan tidak ada pemicu kosong
        allAntecedentCandidates = [...new Set(allAntecedentCandidates)].filter(s => s !== '[]');
        
        console.log(`[RECO_DEBUG] Final Antecedent Candidates (JSON Strings): ${allAntecedentCandidates.join(', ')}`);


        // --- Logika Hybrid (Apriori) ---
        // PENTING: Hapus activeTimestamp dari kondisi jika Anda tidak menggunakannya di query
        if (studentClusterId !== null && allAntecedentCandidates.length > 0) {
            
            // **PERBAIKAN SINTAKS SQL KRITIS:** Gunakan SATU '?' untuk klausa IN
            
            const [recoRules] = await pool.query(
                `
                SELECT consequent, confidence 
                FROM recommendation_batches 
                WHERE 
                    cluster_id = ? 
                    AND antecedent IN (?) -- Menggunakan satu placeholder untuk array
                ORDER BY confidence DESC
                LIMIT 20
                `,
                // Array parameter: [clusterId, array_of_antecedent_strings]
                [studentClusterId, allAntecedentCandidates] 
            );
            
            console.log(`[RECO_DEBUG] Raw Apriori Rules Found: ${recoRules.length}`);

            let recommendedBookIds = new Set();
            recoRules.forEach(rule => {
                try {
                    // Pastikan consequent di DB adalah string JSON yang valid
                    const consequents = JSON.parse(rule.consequent); 
                    consequents.forEach(id => recommendedBookIds.add(id));
                } catch (e) {
                    console.error("!!! CRITICAL PARSING ERROR !!! Error parsing consequent JSON:", e);
                }
            });
            
            // Filter buku yang sudah dipinjam
            finalRecommendedIds = Array.from(recommendedBookIds).filter(
                bookId => !borrowedBookIds.includes(String(bookId))
            );
            console.log(`[RECO_DEBUG] Hybrid Reco Count after filter: ${finalRecommendedIds.length}`);
        } else {
             console.log(`[RECO_DEBUG] Hybrid condition skipped. Cluster ID: ${studentClusterId}, Antecedents: ${allAntecedentCandidates.length}`);
        }


        // 5. LOGIKA FALLBACK (Buku Populer)
        if (finalRecommendedIds.length < RECOMMENDED_LIMIT) {
             const fallbackLimit = 10;
             const needed = RECOMMENDED_LIMIT - finalRecommendedIds.length;
             
             console.log(`[RECO_DEBUG] FALLBACK MODE: Running popular books query (Needed: ${needed} more).`);
             
             const [popularBooks] = await pool.query(
                 `SELECT book_id FROM borrows 
                  GROUP BY book_id 
                  ORDER BY COUNT(book_id) DESC 
                  LIMIT ?`,
                 [fallbackLimit]
             );
             
             popularBooks.forEach(row => {
                 const bookId = row.book_id;
                 if (!finalRecommendedIds.includes(bookId) && !borrowedBookIds.includes(String(bookId))) {
                     finalRecommendedIds.push(bookId);
                 }
             });
             console.log(`[RECO_DEBUG] Total Reco Count after fallback: ${finalRecommendedIds.length}`);
        }
        
        // 6. Ambil detail buku & siswa
        let recommendedBooks = [];
        const booksToFetch = finalRecommendedIds.slice(0, RECOMMENDED_LIMIT);

        if (booksToFetch.length > 0) {
            const [books] = await pool.query(
                `SELECT id, title, author, cover_image_url, published_year, stock FROM books WHERE id IN (?)`,
                [booksToFetch]
            );
            // Sort by the order in booksToFetch to preserve recommendation ranking
            const bookMap = new Map(books.map(book => [book.id, book]));
            recommendedBooks = booksToFetch.map(id => bookMap.get(id)).filter(book => book);
        }

        const [studentInfo] = await pool.query("SELECT id, nisn, name, class FROM students WHERE id = ?", [studentId]);
        const student = studentInfo[0];
        
        // --- DEBUG LOG: Selesai & Kirim Respon ---
        console.log(`[RECO_DEBUG] END: Sending ${recommendedBooks.length} recommendations to frontend.`);
        
        res.status(200).json({
            student: student,
            cluster_id: studentClusterId, 
            recommendations: recommendedBooks
        });

    } catch (error) {
        console.error("[CRITICAL FATAL ERROR] Error in /for-student/:studentId HYBRID endpoint:", error);
        res.status(500).json({ message: "Server error saat mengambil rekomendasi personal." });
    }
});
// ──────────────────────────────────────────────
// Hapus atau Sederhanakan Endpoint Lain
// ──────────────────────────────────────────────

// Hapus/Modifikasi: GET /api/recommendations (Tidak relevan lagi)
router.get("/", auth, (req, res) => {
    return res.status(200).json({ message: "Gunakan /for-student/:studentId untuk mendapatkan rekomendasi personal." });
});

// GET /api/recommendations/batches (Sederhanakan)
router.get("/batches", auth, async (req, res) => {
    try {
        const [batches] = await pool.query(
            // Ambil semua generated_at unik untuk daftar batch
            "SELECT DISTINCT generated_at FROM recommendation_batches ORDER BY generated_at DESC"
        );
        const activeTimestamp = await getActiveTimestamp();

        // Format hasil
        const formattedBatches = batches.map(b => ({ 
            generated_at: b.generated_at,
            is_active: b.generated_at === activeTimestamp // Tentukan status aktif
        }));
        
        res.status(200).json(formattedBatches);
    } catch (error) {
        console.error("Error fetching recommendation batches:", error);
        res.status(500).json({ message: "Server error saat mengambil daftar batch rekomendasi." });
    }
});

// GET /api/recommendations/batches/:batchId (Tidak relevan/kompleks untuk dipertahankan)
router.get("/batches/:batchId", auth, (req, res) => {
    return res.status(501).json({ message: "Endpoint tidak diimplementasikan pada skema baru." });
});

// POST /api/recommendations/batches/:batchId/set-active (Tidak relevan, diganti oleh /generate)
router.post("/batches/:batchId/set-active", auth, (req, res) => {
    return res.status(501).json({ message: "Aktivasi batch sekarang otomatis setelah /generate." });
});

// GET /api/recommendations/latest-summary (Tidak relevan, karena rules_data dihapus)
router.get("/latest-summary", auth, (req, res) => {
    return res.status(501).json({ message: "Summary harus dihitung secara terpisah dari data baru." });
});


// ──────────────────────────────────────────────
// Endpoint yang Tidak Berubah (Detail Buku/Hapus Batch)
// ──────────────────────────────────────────────

router.post("/books/details-by-ids", auth, async (req, res) => {
    // ... (Logika sama seperti sebelumnya) ...
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

router.delete("/batches/:batchId", auth, async (req, res) => {
    // ... (Logika sama seperti sebelumnya, tapi sekarang menghapus berdasarkan generated_at) ...
    const { batchId } = req.params; // Di sini batchId harus berupa generated_at timestamp

    try {
        // Hapus semua aturan yang termasuk dalam timestamp batch ini
        const [result] = await pool.query(
            "DELETE FROM recommendation_batches WHERE generated_at = ?",
            [batchId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Batch rekomendasi tidak ditemukan." });
        }
        // Tambahkan logika untuk membersihkan system_config jika batch yang dihapus adalah yang aktif
        
        res.status(200).json({ message: `Batch ID ${batchId} berhasil dihapus.` });
    } catch (error) {
        console.error("Error deleting recommendation batch:", error);
        res.status(500).json({ message: "Server error saat menghapus batch rekomendasi." });
    }
});

router.post("/students/details-by-ids", auth, async (req, res) => {
    // ... (Logika sama seperti sebelumnya) ...
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