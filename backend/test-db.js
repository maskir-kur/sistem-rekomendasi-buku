import mysql from "mysql2/promise";

const testConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: "containers-us-west-198.railway.app",
      user: "root",
      password: "paFJpXGWbAbLvyNseWDyiOxsFbQrmHYp",
      database: "railway",
      port: 7854,
    });

    console.log("✅ Connected to Railway MySQL!");
    const [rows] = await connection.query("SELECT NOW() AS time");
    console.log("Server time:", rows[0].time);
    await connection.end();
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
};

testConnection();
