// ──────────────────────────────────────────────
// src/pages/admin/BorrowHistory.jsx
// Diperbarui: Sesuai dengan NISN siswa dari database baru
// Perbaikan Whitespace: Menghilangkan whitespace di <thead> dan <tbody> secara menyeluruh
// Implementasi Pagination, Search, Sorting di Backend
// ──────────────────────────────────────────────
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import dayjs from "dayjs";
import { ArrowUp, ArrowDown, Search } from "lucide-react";

export default function BorrowHistory() {
  /* ── pagination, search & sorting state ───────────────── */
  const [q, setQ] = useState(""); // searchGeneral
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10); // Jumlah item per halaman
  const [sortKey, setSortKey] = useState("return_date");
  const [sortDir, setSortDir] = useState("desc");

  /* ── ambil riwayat (return_date IS NOT NULL) ─ */
  const { data: historyData, isLoading, isError } = useQuery({
    queryKey: ["borrows", "history", page, limit, q, sortKey, sortDir], // Tambahkan dependensi query
    queryFn: () =>
      api
        .get("/borrows", {
          params: {
            status: "history",
            page: page,
            limit: limit,
            searchGeneral: q, // Kirim query pencarian
            sortBy: sortKey,  // Kirim kolom pengurutan
            sortOrder: sortDir, // Kirim arah pengurutan
          },
        })
        .then((r) => r.data),
    keepPreviousData: true, // Opsional: menjaga data sebelumnya saat loading halaman baru
  });

  // Pastikan `history` selalu array, dan ambil dari properti `borrows` jika respons adalah objek
  const history = historyData?.borrows || [];
  const totalCount = historyData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  /* ── helper header sortable ────────────────── */
  const Head = ({ k, label }) => (
    <th
      className="
        px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
        cursor-pointer select-none
      "
      onClick={() => {
        if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else {
          setSortKey(k);
          setSortDir("asc");
        }
        setPage(1); // Reset ke halaman 1 saat sorting berubah
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k &&
          (sortDir === "asc" ? (
            <ArrowUp size={12} className="text-gray-500" />
          ) : (
            <ArrowDown size={12} className="text-gray-500" />
          ))}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 lg:p-10">
      <div className="flex flex-wrap gap-4 items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Riwayat Peminjaman</h1>
        <div className="relative flex-grow max-w-xs">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Cari NISN / Nama / Judul Buku…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1); // Reset ke halaman 1 saat pencarian berubah
            }}
            className="
              w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
              focus:border-blue-500 transition-colors duration-200
            "
          />
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg shadow-xl ring-1 ring-gray-100">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Head k="nisn" label="NISN" />
              <Head k="name" label="Nama Siswa" />
              <Head k="title" label="Judul Buku" />
              <Head k="borrow_date" label="Tgl. Pinjam" />
              <Head k="due_date" label="Jatuh Tempo" />
              <Head k="return_date" label="Tgl. Dikembalikan" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Memuat riwayat peminjaman...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-red-500">
                  Gagal memuat riwayat peminjaman.
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Tidak ada riwayat peminjaman yang ditemukan.
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr
                  key={h.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                    {h.nisn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {h.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {h.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {dayjs(h.borrow_date).format("DD/MM/YYYY")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {dayjs(h.due_date).format("DD/MM/YYYY")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">
                    {dayjs(h.return_date).format("DD/MM/YYYY")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setPage((old) => Math.max(old - 1, 1))}
            disabled={page === 1 || isLoading}
            className="
              px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold
              hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Sebelumnya
          </button>
          <span className="text-gray-700">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((old) => old + 1)}
            disabled={page === totalPages || isLoading}
            className="
              px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}