import dotenv from "dotenv";
dotenv.config();

const config = {
  db: {
    databaseUrl: process.env.DATABASE_URL,
  },
  jwtSecret: process.env.JWT_SECRET,
};

export default config;
