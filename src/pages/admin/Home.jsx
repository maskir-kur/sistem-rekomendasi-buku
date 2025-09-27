// src/pages/admin/Home.jsx
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import CountUp from "react-countup";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get("/stats/summary").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: borrowTrendsData, isLoading: isBorrowTrendsLoading } = useQuery({
    queryKey: ["borrow-trends"],
    queryFn: () => api.get("/borrows/stats/borrow-trends").then((r) => r.data),
  });

  const cards = [
    { title: "Total Buku", value: statsData?.books ?? 0, border: "border-blue-500", icon: "📚" },
    { title: "Total Siswa", value: statsData?.students ?? 0, border: "border-emerald-500", icon: "🧑‍🎓" },
    { title: "Sedang Dipinjam", value: statsData?.borrows ?? 0, border: "border-fuchsia-500", icon: "⏳" },
  ];

  return (
    <div className="space-y-8">
      {/* Tambahkan kembali header h1 di sini */}
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 tracking-tight text-center md:text-left">
        Dashboard Admin Perpustakaan
      </h1>

      {/* Bagian Kartu Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {cards.map((c) => (
          <div
            key={c.title}
            className={`
              relative flex flex-col items-start p-6 rounded-2xl shadow-lg
              bg-white transition-all duration-300 ease-in-out transform
              hover:scale-105 hover:shadow-xl
              border-t-8 ${c.border}
            `}
          >
            <div className="absolute top-4 right-4 text-4xl opacity-20 transform -rotate-12">
              {c.icon}
            </div>
            <p className="text-base text-gray-500 font-medium uppercase tracking-wider mb-2">
              {c.title}
            </p>
            <p className="text-5xl font-bold text-gray-900 mt-1">
              <CountUp end={c.value} duration={0.8} separator="," />
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {isStatsLoading ? "Memuat..." : "Data diperbarui secara otomatis."}
            </p>
          </div>
        ))}
      </div>

      {/* Bagian Grafik Peminjaman */}
      <div className="p-8 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Grafik Tren Peminjaman Buku (30 Hari Terakhir) 📈
        </h2>

        {isBorrowTrendsLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>Memuat grafik...</p>
          </div>
        ) : (
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <BarChart
                data={borrowTrendsData?.borrowTrends}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Jumlah Peminjaman" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}