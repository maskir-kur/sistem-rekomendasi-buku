// backend/server.js
import app from "./api/index.js";
import express from "express";

const server = express();
const PORT = process.env.PORT || 5000;

server.use("/", app);
server.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
