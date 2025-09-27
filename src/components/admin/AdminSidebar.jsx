import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Book,
  Users,
  Sparkles,
  LogOut,
  History as HistoryIcon,
  Folder,
  List,// Gunakan ikon Clock untuk "Kelola Rekomendasi" atau pilih ikon lain
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function AdminSidebar() {
  const { logout } = useAuth();

  // Definisikan array navigasi dengan penambahan item baru
  const navItems = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/books", label: "Data Buku", icon: Book },
    { to: "/admin/students", label: "Data Siswa", icon: Users },
    { to: "/admin/borrows", label: "Transaksi", icon: HistoryIcon },
    { to: "/admin/recommendation", label: "Generate Rekomendasi", icon: Sparkles }, // Ganti label agar lebih spesifik
    { to: "/admin/recommendation-batches", label: "Kelola Rekomendasi", icon: Folder }, // Tambahkan item ini
    { to: "/admin/history", label: "Riwayat Peminjam", icon: List }, // Ikon Clock sudah digunakan di atas, tapi bisa saja sama
  ];

  return (
    <aside className="w-64 bg-white shadow-md h-screen sticky top-0 flex flex-col">
      {/* Header */}
      <h2 className="p-6 text-2xl font-extrabold text-blue-600 border-b">
        Admin
      </h2>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => ( // Gunakan navItems
          <NavLink
            key={to}
            to={to}
            // `end` prop penting untuk NavLink agar tidak aktif jika rute hanya sebagian cocok
            // Misalnya, "/admin" akan aktif jika hanya "/admin" yang dikunjungi, bukan "/admin/books"
            end={to === "/admin"} 
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2 rounded-lg font-medium
                ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`
            }
          >
            <Icon
              size={20}
              className="shrink-0 group-hover:scale-110 transition-transform"
            />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}