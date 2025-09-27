// ──────────────────────────────────────────────
// src/pages/auth/LoginPage.jsx (SATU HALAMAN)
// ──────────────────────────────────────────────
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

import backgroundImage from "../../assets/background.png"; // Pastikan jalur ini sudah benar

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const role = /^\d+$/.test(identifier) ? 'student' : 'admin';
      
      await login(identifier, password, role);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Container utama untuk formulir login */}
      <div 
        className="w-full max-w-md p-8 rounded-xl shadow-lg space-y-6 text-white"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)', // Latar belakang hitam dengan transparansi lebih ringan (40%)
          backdropFilter: 'blur(5px)',
        }}
      >
        <h2 className="text-3xl font-bold text-center mb-6">Login Form</h2>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Username / NISN */}
          <div className="relative">
            <input
              type="text"
              placeholder="Username / NISN"
              className="w-full px-4 py-2 bg-transparent text-white border-b-2 border-gray-400 focus:outline-none focus:border-white"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          {/* Input Password */}
          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 bg-transparent text-white border-b-2 border-gray-400 focus:outline-none focus:border-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Tombol Login */}
          <button
            type="submit"
            className="w-full bg-white text-blue-800 font-bold py-3 rounded-md hover:bg-gray-200 transition duration-300"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}