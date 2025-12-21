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

/* =================================================
   1️⃣ CORS HARUS PALING ATAS (SEBELUM APAPUN)
   ================================================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


/* =================================================
   3️⃣ BODY PARSER
   ================================================= */
app.use(express.json());

/* =================================================
   4️⃣ ROUTES (SETELAH CORS)
   ================================================= */
app.use("/api", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

/* =================================================
   5️⃣ ROOT
   ================================================= */
app.get("/", (req, res) => {
  res.send("Backend API running 🚀");
});

/* =================================================
   6️⃣ PORT
   ================================================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server ready on port ${PORT}`);
});
