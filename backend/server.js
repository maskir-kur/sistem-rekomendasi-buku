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
 * ✅ MIDDLEWARE DALAM URUTAN YANG BENAR
 */

// 1️⃣ Parse JSON body HARUS PERTAMA
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2️⃣ CORS - DIPERBAIKI untuk menangani preflight dengan benar
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://sistem-rekomendasi-buku-production-44ab.up.railway.app"
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Tetap izinkan untuk testing
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// 3️⃣ Handle preflight globally
app.options('*', cors());

/**
 * ROOT ROUTE
 */
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend API running 🚀",
    endpoints: {
      auth: "/api/auth/login",
      books: "/api/books",
      students: "/api/students",
      stats: "/api/stats",
      borrows: "/api/borrows",
      recommendations: "/api/recommendations"
    }
  });
});

/**
 * 4️⃣ API ROUTES
 */
app.use("/api/auth", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

/**
 * ERROR HANDLER untuk endpoint yang tidak ditemukan
 */
app.use((req, res) => {
  res.status(404).json({ 
    message: "Endpoint not found",
    path: req.path,
    method: req.method
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * PORT
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});