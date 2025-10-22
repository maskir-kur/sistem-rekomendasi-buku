import serverless from "serverless-http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import booksRoutes from "./routes/books.js";
import studentRoutes from "./routes/students.js";
import statsRoutes from "./routes/stats.js";
import borrowRoutes from "./routes/borrows.js";
import recommendationRoutes from "./routes/recommendations.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://sistem-rekomendasi-buku.vercel.app", // ganti dengan URL frontend kamu
  credentials: true
}));

app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

// default route
app.get("/", (req, res) => {
  res.send("Backend API running on Vercel");
});

export const handler = serverless(app);
