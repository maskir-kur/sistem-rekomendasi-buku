import { useState, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "../../lib/api"; 
import { Dialog, Combobox } from "@headlessui/react";
import dayjs from "dayjs";
import { ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "react-hot-toast";

// =====================================================================
// 0. CUSTOM HOOK: useDebounce
// =====================================================================

/**
 * Hook untuk menunda pembaruan nilai state.
 * @param {any} value - Nilai yang akan ditunda.
 * @param {number} delay - Jeda penundaan dalam ms.
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};


// =====================================================================
// 1. KOMPONEN PEMBANTU: BorrowForm (REVISI FINAL: Riwayat & Rekomendasi Terpisah)
// =====================================================================

// Menghapus prop 'students'
function BorrowForm({ books, onSubmit, isSaving }) { 
  const [selected, setSel] = useState(null);
  const [query, setQuery] = useState(""); 
  const [bookId, setBookId] = useState("");
  const [due, setDue] = useState(
    dayjs().add(7, "day").format("YYYY-MM-DD")
  );

  // --- REMOTE FILTERING / DEBOUNCE ---
  const debouncedQuery = useDebounce(query, 500); 

  // --- QUERY 1: Siswa untuk Combobox (Remote Filtering) ---
  const { 
    data: studentsData, 
    isLoading: isStudentsLoadingRemote // Digunakan untuk indikator loading
  } = useQuery({
    queryKey: ["students", "quicksearch", debouncedQuery],
    queryFn: () => 
        // Panggil endpoint /students dengan searchGeneral dan limit 50
        api.get("/students", { 
            params: { 
              searchGeneral: debouncedQuery, 
              limit: 50, 
              all: false // Hanya siswa aktif
            } 
        }).then((r) => r.data),
    // Query hanya diaktifkan jika input debounced memiliki minimal 2 karakter
    enabled: debouncedQuery.length >= 2, 
    keepPreviousData: true, 
  });

  const remoteStudents = studentsData?.students || [];

  // Data yang ditampilkan di Combobox: hanya tampilkan hasil jika query memenuhi min. length
  const studentsToDisplay = (query.length < 2) 
      ? [] 
      : remoteStudents; 
  
  // ------------------------------------------------------------------
  // REVISI KRITIS: Pisahkan Query History dan Rekomendasi
  // ------------------------------------------------------------------

  // --- QUERY 2: Riwayat Peminjaman Siswa (Menggunakan rute students lama) ---
  const {
    data: historyData, 
    isLoading: isHistoryLoading, // NAMA VARIABEL BARU
    isError: isHistoryError,     // NAMA VARIABEL BARU
  } = useQuery({
    queryKey: ["studentHistory", selected?.id], 
    queryFn: () =>
      // Panggil rute students.js yang sekarang hanya berisi riwayat
      api.get(`/students/${selected.id}/history-and-recommendations`) 
        .then((r) => r.data),
    enabled: !!selected?.id,
    keepPreviousData: true,
  });

  // Ambil 'borrowedBooks' dari respons rute students.js
  const studentBorrows = historyData?.borrowedBooks || []; 


  // --- QUERY 3: Rekomendasi Buku (Memanggil endpoint terpisah yang sudah direvisi) ---
  const {
    data: recsData,
    isLoading: isRecsLoading, // NAMA VARIABEL BARU
    isError: isRecsError,     // NAMA VARIABEL BARU
  } = useQuery({
    queryKey: ["studentRecommendations", selected?.id],
    queryFn: () =>
      // PANGGIL ENDPOINT YANG ANDA REVISI DI recommendations.js
      api.get(`/recommendations/for-student/${selected.id}`)
        .then((r) => r.data),
    enabled: !!selected?.id,
    keepPreviousData: true,
  });

  // Ambil array 'recommendations' dari respons API recommendations.js
  const recommendedBooks = recsData?.recommendations || [];


  // ------------------------------------------------------------------
  // Akhir Revisi API
  // ------------------------------------------------------------------


  useEffect(() => {
    // Reset bookId dan query saat selected berubah
    setBookId("");
    if (selected) {
        // Hapus teks pencarian saat siswa berhasil dipilih
        setQuery("");
    }
  }, [selected]);


  const submit = (e) => {
    e.preventDefault();
    if (!selected || !bookId) {
      toast.error("Mohon lengkapi data siswa dan buku.");
      return;
    }
    onSubmit({
      student_id: selected.id,
      book_id: bookId,
      due_date: due,
    });
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      {/* Combobox Siswa (Remote Filtering) */}
      <Combobox as="div" value={selected} onChange={setSel}>
        <div className="relative">
          <Combobox.Input
            placeholder="Ketik NISN / Nama Siswa (min. 2 huruf)..."
            className="
              w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
              focus:border-blue-500 transition-colors duration-200
            "
            displayValue={(s) => (s ? `${s.nisn} • ${s.name}` : "")}
            onChange={(e) => setQuery(e.target.value)} 
            required
          />
          <Combobox.Options className="
            absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200
            bg-white shadow-lg text-sm
          ">
            {/* Logika tampilan hasil remote query */}
            {isStudentsLoadingRemote && query.length >= 2 ? (
                <div className="px-4 py-2 text-blue-500 italic">
                    Mencari siswa...
                </div>
            ) : query.length < 2 ? (
                <div className="px-4 py-2 text-gray-500">
                    Ketik **minimal 2 huruf** untuk mencari siswa.
                </div>
            ) : studentsToDisplay.length === 0 ? (
                <div className="px-4 py-2 text-gray-500">
                    Tidak ada hasil ditemukan.
                </div>
            ) : (
                studentsToDisplay.map((s) => (
                  <Combobox.Option
                    key={s.id}
                    value={s}
                    className={({ active }) =>
                      `cursor-pointer px-4 py-2 ${
                        active ? "bg-blue-600 text-white" : "text-gray-900"
                      }`
                    }
                  >
                    {s.nisn} • {s.name}
                  </Combobox.Option>
                ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>

      {/* Riwayat Peminjaman */}
      {selected && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Riwayat Peminjaman ({selected.name})</h4>
          {/* MENGGUNAKAN isHistoryLoading & isHistoryError */}
          {isHistoryLoading ? (
            <p className="text-xs text-gray-500 italic">Memuat riwayat...</p>
          ) : isHistoryError ? (
            <p className="text-xs text-red-500">Gagal memuat riwayat.</p>
          ) : studentBorrows.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {studentBorrows.map((borrow) => (
                <li key={borrow.id} className="p-2 bg-white rounded-md border border-gray-100">
                  <p className="font-medium text-gray-800">{borrow.book_title}</p>
                  <p className="text-xs text-gray-600">
                    Dipinjam: {dayjs(borrow.borrow_date).format("DD/MM/YYYY")}
                    {borrow.return_date ? (
                      ` • Dikembalikan: ${dayjs(borrow.return_date).format("DD/MM/YYYY")}`
                    ) : (
                      ` • Status: Aktif`
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 italic">Belum ada riwayat peminjaman.</p>
          )}
        </div>
      )}

      {/* Rekomendasi Buku */}
      {selected && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Rekomendasi Buku untuk ({selected.name})</h4>
          {/* MENGGUNAKAN isRecsLoading & isRecsError */}
          {isRecsLoading ? (
            <p className="text-xs text-gray-500 italic">Memuat rekomendasi...</p>
          ) : isRecsError ? (
            <p className="text-xs text-red-500">Gagal memuat rekomendasi.</p>
          ) : recommendedBooks.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {recommendedBooks.map((book) => (
                <li key={book.id} className="p-2 bg-white rounded-md border border-gray-100">
                  <p className="font-medium text-gray-800">{book.title}</p>
                  <p className="text-xs text-gray-600">
                    Penulis: {book.author}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 italic">Tidak ada rekomendasi buku saat ini.</p>
          )}
        </div>
      )}

      {/* Pilih Buku */}
      <select
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        value={bookId}
        onChange={(e) => setBookId(e.target.value)}
        required
      >
        <option value="">-- Pilih Buku (stok &gt; 0) --</option>
        {books.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title} ({b.stock})
          </option>
        ))}
      </select>

      {/* Due date */}
      <input
        type="date"
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        value={due}
        onChange={(e) => setDue(e.target.value)}
        required
      />

      <button
        type="submit"
        className="
          w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md
          hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        disabled={isSaving}
      >
        {isSaving ? "Menyimpan..." : "Simpan Peminjaman"}
      </button>
    </form>
  );
}

// =====================================================================
// 2. KOMPONEN UTAMA: BorrowList (Tidak ada perubahan signifikan di sini)
// =====================================================================

export default function BorrowList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sortKey, setKey] = useState("borrow_date");
  const [sortDir, setDir] = useState("desc");

  const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);
  const [borrowToReturn, setBorrowToReturn] = useState(null);

  /* Ambil data transaksi aktif */
  const { data: borrowsData, isLoading, isError } = useQuery({
    queryKey: ["borrows", "active", sortKey, sortDir],
    queryFn: () =>
      api.get("/borrows", {
        params: { status: "active", sortBy: sortKey, sortOrder: sortDir }
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const borrows = borrowsData?.borrows || [];

  /* Ambil data buku */
  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: () => api.get("/books").then((r) => r.data),
  });

  /* hasil terurut */
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...borrows].sort((a, b) =>
      a[sortKey] > b[sortKey] ? dir : -dir
    );
  }, [borrows, sortKey, sortDir]);

  /* catat pinjam */
  const addMut = useMutation({
    mutationFn: (body) => api.post("/borrows", body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries(["borrows", "active"]);
      qc.invalidateQueries(["books"]);
      qc.invalidateQueries(["stats"]);
      qc.invalidateQueries(["students", "quicksearch"]); 
      // Invalidate cache rekomendasi siswa dan riwayat yang baru meminjam
      qc.invalidateQueries(["studentRecommendations", variables.student_id]); 
      qc.invalidateQueries(["studentBorrows", variables.student_id]); 
      
      toast.success("Peminjaman berhasil dicatat!");
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Gagal mencatat peminjaman. Silakan coba lagi.");
    },
  });

  /* kembalikan */
  const retMut = useMutation({
    mutationFn: (id) => api.put(`/borrows/${id}/return`),
    onSuccess: () => {
      qc.invalidateQueries(["borrows", "active"]);
      qc.invalidateQueries(["books"]);
      qc.invalidateQueries(["stats"]);
      toast.success("Buku berhasil dikembalikan!");
      setConfirmReturnOpen(false);
      setBorrowToReturn(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Gagal mengembalikan buku. Silakan coba lagi.");
    },
  });

  const handleOpenConfirmReturn = (borrow) => {
    setBorrowToReturn(borrow);
    setConfirmReturnOpen(true);
  };
  const handleConfirmReturn = () => {
    if (borrowToReturn) {
      retMut.mutate(borrowToReturn.id);
    }
  };
  const handleCancelReturn = () => {
    setConfirmReturnOpen(false);
    setBorrowToReturn(null);
    toast.info("Pengembalian buku dibatalkan.");
  };

  /* komponen header sortable */
  const Head = ({ k, label }) => (
    <th
      className="
        px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
        cursor-pointer select-none
      "
      onClick={() => {
        if (sortKey === k) setDir(sortDir === "asc" ? "desc" : "asc");
        else { setKey(k); setDir("asc"); }
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k &&
          (sortDir === "asc"
            ? <ArrowUp size={12} className="text-gray-500" />
            : <ArrowDown size={12} className="text-gray-500" />)}
      </span>
    </th>
  );

  /* ------- render utama ------- */
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 lg:p-10">
      {/* header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Transaksi Peminjaman</h1>
        <button
          onClick={() => setOpen(true)}
          className="
            px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors duration-200
          "
        >
          {"+ Catat Peminjaman"}
        </button>
      </div>

      {/* tabel */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-xl ring-1 ring-gray-100">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NISN</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Siswa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Judul Buku</th>
              <Head k="borrow_date" label="Tanggal Pinjam" />
              <Head k="due_date" label="Jatuh Tempo" />
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status Kembali</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  Memuat data peminjaman...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-red-500">
                  Gagal memuat data peminjaman.
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  Tidak ada transaksi peminjaman aktif.
                </td>
              </tr>
            ) : (
              sorted.map((b) => {
                const overdue = !b.return_date && dayjs().isAfter(dayjs(b.due_date), "day");
                return (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{b.nisn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {dayjs(b.borrow_date).format("DD/MM/YYYY")}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap ${
                        overdue ? "text-red-600 font-semibold" : "text-gray-700"
                      }`}
                    >
                      {dayjs(b.due_date).format("DD/MM/YYYY")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {b.return_date ? (
                        <span className="text-green-600 font-medium">
                          {dayjs(b.return_date).format("DD/MM/YYYY")}
                        </span>
                      ) : (
                        <span className="text-orange-500 font-medium">Belum Kembali</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!b.return_date && (
                        <button
                          onClick={() => handleOpenConfirmReturn(b)}
                          className="
                            px-4 py-2 bg-green-500 text-white font-medium text-xs rounded-md shadow-sm
                            hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                            transition-colors duration-200
                          "
                          disabled={retMut.isPending}
                        >
                          Kembalikan
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* modal Catat Peminjaman */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className={`
              bg-white px-8 py-6 rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto
              transform transition-all ease-out duration-300
              ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            `}
          >
            <Dialog.Title className="text-2xl font-bold text-gray-800 mb-6">
              Catat Peminjaman
            </Dialog.Title>
            <BorrowForm
              books={books.filter((b) => b.stock > 0)}
              onSubmit={(val) => addMut.mutate(val)}
              isSaving={addMut.isPending}
            />
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* MODAL KONFIRMASI PENGEMBALIAN */}
      <Dialog
        open={confirmReturnOpen}
        onClose={handleCancelReturn}
        className="relative z-[100]"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className={`
              bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm
              transform transition-all ease-out duration-300
              ${confirmReturnOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            `}
          >
            <Dialog.Title className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-green-500 mr-2 text-2xl">✅</span>
              Konfirmasi Pengembalian
            </Dialog.Title>
            <Dialog.Description className="text-gray-700 mb-6">
              Apakah Anda yakin ingin mengembalikan buku "<span className="font-semibold text-gray-900">{borrowToReturn?.title}</span>"
              yang dipinjam oleh <span className="font-semibold text-gray-900">{borrowToReturn?.name}</span>?
              <br/><br/>
              Tanggal peminjaman: <span className="font-medium">{borrowToReturn ? dayjs(borrowToReturn.borrow_date).format("DD/MM/YYYY") : ''}</span>
              <br/>
              Tanggal jatuh tempo: <span className="font-medium">{borrowToReturn ? dayjs(borrowToReturn.due_date).format("DD/MM/YYYY") : ''}</span>
              {borrowToReturn && !borrowToReturn.return_date && dayjs().isAfter(dayjs(borrowToReturn.due_date), "day") && (
                <span className="block mt-2 text-sm text-red-600 font-semibold">
                  (Buku ini sudah melewati jatuh tempo!)
                </span>
              )}
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelReturn}
                className="
                  px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold
                  hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                  transition-colors duration-200
                "
                disabled={retMut.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="
                  px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md
                  hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={retMut.isPending}
              >
                {retMut.isPending ? "Mengembalikan..." : "Ya, Kembalikan"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}