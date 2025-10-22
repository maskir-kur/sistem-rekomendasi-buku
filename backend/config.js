// backend/config.js
import dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  },
  jwtSecret: process.env.JWT_SECRET,
};

export default config;
