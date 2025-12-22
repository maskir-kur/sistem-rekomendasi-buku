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
 * ✅ CORS HARUS PERTAMA SEBELUM SEMUA MIDDLEWARE
 */
// Daftar origin yang diizinkan
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://sistem-rekomendasi-buku-production-44ab.up.railway.app"
];

// CORS middleware - SIMPLE dan PASTI WORK
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Jika origin ada di whitelist atau tidak ada origin (Postman/curl)
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * Body Parser - SETELAH CORS
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Logging middleware (opsional, untuk debugging)
 */
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/**
 * ROOT ROUTE
 */
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend API running 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
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
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

/**
 * API ROUTES
 */
app.use("/api/auth", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({ 
    error: "Internal Server Error",
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log('=================================');
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});