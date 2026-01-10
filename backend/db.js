import mysql from "mysql2/promise";
import config from "./config.js";

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const pool = mysql.createPool(config.databaseUrl);

export default pool;
