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
 * CORS FINAL (AMAN & BENAR)
 */
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sistem-rekomendasi-buku-production-44ab.up.railway.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());
app.use(express.json());

/**
 * ROOT CHECK (PENTING)
 */
app.get("/", (req, res) => {
  res.status(200).send("Backend API running 🚀");
});

/**
 * API ROUTES
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server ready on port ${PORT}`);
});
