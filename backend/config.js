// backend/config.js
const config = {
  db: {
    host: "localhost",
    user: "root",
    password: "", // Ganti dengan password database Anda
    database: "sistem_rekomendasi_buku", // Ganti dengan nama database Anda
    // ... properti db lainnya jika ada
  },
  jwtSecret: "super_secret_key",
};
export default config;