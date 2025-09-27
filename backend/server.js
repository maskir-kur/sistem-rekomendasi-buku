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
app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowRoutes);
app.use("/api/recommendations", recommendationRoutes);

app.listen(5000, "0.0.0.0", () => {
  console.log("Server ready on http://0.0.0.0:5000");
});

