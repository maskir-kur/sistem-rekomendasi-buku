// backend/server.js
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import booksRoutes from "./routes/books.js";
import studentRoutes from "./routes/students.js";
import statsRoutes from "./routes/stats.js";
import borrowRoutes from "./routes/borrows.js";
import recommendationRoutes from "./routes/recommendations.js";

const app = express();

/* ====== CORS WAJIB DI PALING ATAS ====== */
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sistem-rekomendasi-buku-production.up.railway.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

/* ====== PARSER ====== */
app.use(express.json());

/* ====== ROUTES ====== */
app.use("/api", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

/* ====== ROOT (SUPAYA TIDAK Cannot GET /) ====== */
app.get("/", (req, res) => {
  res.send("Backend API is running 🚀");
});

/* ====== PORT WAJIB ENV ====== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server ready on port ${PORT}`);
});
