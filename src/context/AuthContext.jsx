// ──────────────────────────────────────────────
// src/context/AuthContext.jsx (FINAL)
// ──────────────────────────────────────────────
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { setAuth } from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* ── RESTORE SESSION ─────────────────────── */
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (stored?.token) {
      setAuth(stored.token);
      setUser(stored);
    }
    setLoading(false);
  }, []);

  /* ── LOGIN ───────────────────────────────── */
  // Fungsi login sekarang hanya menerima identifier (username/NISN) dan password
  const login = async (identifier, password) => {
    try {
      // Panggil satu endpoint login di backend
      const res = await api.post("/login", { identifier, password });

      // Atur header otorisasi untuk permintaan API berikutnya
      setAuth(res.data.token);
      // Simpan data pengguna di state dan localStorage
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));

      // Arahkan pengguna berdasarkan role yang diterima dari backend
      if (res.data.role === 'admin') {
        navigate("/admin");
      } else if (res.data.role === 'student') {
        navigate("/student");
      } else {
        // Arahkan ke halaman default jika role tidak dikenali
        navigate("/");
      }
    } catch (err) {
      // Re-throw error agar bisa ditangani di komponen LoginPage
      throw err;
    }
  };

  /* ── LOGOUT ──────────────────────────────── */
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setAuth(null);
    navigate("/");
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/* custom hook */
export const useAuth = () => useContext(AuthContext);