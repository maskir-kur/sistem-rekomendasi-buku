// utils/setDefaultStudentPassword.js
import bcrypt from "bcrypt";
import pool from "../backend/db.js";          // sesuaikan path

const rows = (
  await pool.query("SELECT id, nim FROM students WHERE password_hash IS NULL")
)[0];

for (const s of rows) {
  const hash = await bcrypt.hash(s.nim, 10); // password = nim
  await pool.query("UPDATE students SET password_hash=? WHERE id=?", [
    hash,
    s.id,
  ]);
  console.log(`Set password siswa ID ${s.id}`);
}
process.exit();
