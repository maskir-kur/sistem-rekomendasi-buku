// ──────────────────────────────────────────────
// backend/db.js
// ──────────────────────────────────────────────
import mysql from "mysql2/promise";
import config from "./config.js"; // <--- IMPORT CONFIGURASI DARI config.js

const pool = mysql.createPool({
  host: config.db.host,       // <--- GUNAKAN DARI CONFIG
  user: config.db.user,       // <--- GUNAKAN DARI CONFIG
  password: config.db.password, // <--- GUNAKAN DARI CONFIG
  database: config.db.database, // <--- GUNAKAN DARI CONFIG
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;