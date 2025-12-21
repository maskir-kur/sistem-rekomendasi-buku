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
 * CORS FINAL (JANGAN PAKAI URL DI PATH)
 */
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sistem-rekomendasi-buku-production-44ab.up.railway.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/**
 * ROOT ROUTE
 */
app.get("/", (req, res) => {
  res.send("Backend API running 🚀");
});

/**
 * API ROUTES (PATH SAJA!)
 */
app.use("/api", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

/**
 * PORT
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
