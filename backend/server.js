// server.js / app.js
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
 * =====================================
 * ✅ CORS CONFIG (WAJIB PALING ATAS)
 * =====================================
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://sistem-rekomendasi-buku-production.up.railway.app"
];

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa Origin (Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// WAJIB untuk preflight request
app.options("*", cors());

/**
 * =====================================
 * BODY PARSER
 * =====================================
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * =====================================
 * LOGGING (DEBUG)
 * =====================================
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * =====================================
 * ROOT ROUTE
 * =====================================
 */
app.get("/", (req, res) => {
  res.json({
    message: "Backend API running 🚀",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

/**
 * =====================================
 * HEALTH CHECK
 * =====================================
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

/**
 * =====================================
 * API ROUTES
 * =====================================
 */
app.use("/api/auth", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

/**
 * =====================================
 * 404 HANDLER
 * =====================================
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

/**
 * =====================================
 * GLOBAL ERROR HANDLER
 * =====================================
 */
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.message);

  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

/**
 * =====================================
 * START SERVER (RAILWAY FRIENDLY)
 * =====================================
 */
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("=================================");
});
