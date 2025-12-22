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
 * ✅ CORS - ALLOW ALL (untuk development)
 * GANTI ini dengan whitelist specific origins saat production
 */
app.use((req, res, next) => {
  // ALLOW ALL origins (untuk testing)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight 24 jam
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * Body Parser
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request logging
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
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
    environment: process.env.NODE_ENV || 'development',
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
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Test endpoint untuk cek CORS
 */
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "CORS is working!",
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
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
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "Not Found",
    message: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "GET /",
      "GET /health",
      "GET /api/test",
      "POST /api/auth/login",
      "GET /api/books",
      "GET /api/students",
      "GET /api/stats",
      "GET /api/borrows",
      "GET /api/recommendations"
    ]
  });
});

/**
 * Error Handler
 */
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  res.status(err.status || 500).json({ 
    error: "Internal Server Error",
    message: err.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('=================================');
  console.log(`✅ Server started successfully`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Listening on: http://${HOST}:${PORT}`);
  console.log(`🔗 API Base: /api`);
  console.log('=================================');
}).on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});