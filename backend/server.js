import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import booksRoutes from "./routes/books.js";
import studentRoutes from "./routes/students.js";
import statsRoutes from "./routes/stats.js";
import borrowRoutes from "./routes/borrows.js";
import recommendationRoutes from "./routes/recommendations.js";

const app = express();

/**
 * ✅ MIDDLEWARE HARUS DALAM URUTAN INI:
 * 1. express.json() PERTAMA
 * 2. CORS KEDUA
 * 3. Routes TERAKHIR
 */

// 1️⃣ Parse JSON body HARUS PERTAMA
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2️⃣ CORS setelah body parser
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sistem-rekomendasi-buku-production-44ab.up.railway.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

/**
 * ROOT ROUTE
 */
app.get("/", (req, res) => {
  res.send("Backend API running 🚀");
});

/**
 * 3️⃣ API ROUTES - PATH DIPERBAIKI
 */
app.use("/api/auth", authRoutes);  // ✅ PERBAIKAN: /api/auth bukan /api
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

/**
 * ERROR HANDLER untuk endpoint yang tidak ditemukan
 */
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

/**
 * PORT
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});