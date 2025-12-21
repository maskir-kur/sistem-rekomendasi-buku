import { useState, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "../../lib/api"; 
import { Dialog, Combobox } from "@headlessui/react";
import dayjs from "dayjs";
import { ArrowUp, ArrowDown, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "react-hot-toast";

// =====================================================================
// 0. CUSTOM HOOK: useDebounce
// =====================================================================

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
// 1. KOMPONEN PEMBANTU: BorrowForm
// =====================================================================

function BorrowForm({ onSubmit, isSaving }) { 
  const [selected, setSel] = useState(null);
  const [query, setQuery] = useState(""); 
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookQuery, setBookQuery] = useState("");
  const [bookId, setBookId] = useState("");
  const [due, setDue] = useState(dayjs().add(7, "day").format("YYYY-MM-DD"));

  const debouncedBookQuery = useDebounce(bookQuery, 500);
  const debouncedQuery = useDebounce(query, 500); 

  const { data: booksData, isLoading: isBooksLoadingRemote } = useQuery({
    queryKey: ["books", "quicksearch", debouncedBookQuery],
    queryFn: () => api.get("/books", { 
      params: { title: debouncedBookQuery, limit: 50 } 
    }).then((r) => r.data),
    enabled: debouncedBookQuery.length >= 2,
    keepPreviousData: true, 
  });

  const { data: studentsData, isLoading: isStudentsLoadingRemote } = useQuery({
    queryKey: ["students", "quicksearch", debouncedQuery],
    queryFn: () => api.get("/students", { 
      params: { searchGeneral: debouncedQuery, limit: 50, all: false } 
    }).then((r) => r.data),
    enabled: debouncedQuery.length >= 2, 
    keepPreviousData: true, 
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["studentHistory", selected?.id], 
    queryFn: () => api.get(`/students/${selected.id}/history-and-recommendations`).then((r) => r.data),
    enabled: !!selected?.id,
    keepPreviousData: true,
  });

  const { data: recsData, isLoading: isRecsLoading } = useQuery({
    queryKey: ["studentRecommendations", selected?.id],
    queryFn: () => api.get(`/recommendations/for-student/${selected.id}`).then((r) => r.data),
    enabled: !!selected?.id,
    keepPreviousData: true,
  });

  const remoteBooks = booksData?.data || [];
  const booksToDisplay = (bookQuery.length < 2) ? [] : remoteBooks;
  const remoteStudents = studentsData?.students || [];
  const studentsToDisplay = (query.length < 2) ? [] : remoteStudents; 
  const studentBorrows = historyData?.borrowedBooks || []; 
  const recommendedBooks = recsData?.recommendations || [];

  useEffect(() => {
    setBookId("");
    setSelectedBook(null);
    setBookQuery("");
    if (selected) setQuery("");
  }, [selected]);

  useEffect(() => {
    if (selectedBook) {
      setBookId(selectedBook.id);
    } else {
      setBookId("");
    }
  }, [selectedBook]);

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
      <Combobox as="div" value={selected} onChange={setSel}>
        <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
          Pilih Siswa
        </Combobox.Label>
        <div className="relative">
          <Combobox.Input
            placeholder="Ketik NISN / Nama Siswa (min. 2 huruf)..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
            displayValue={(s) => (s ? `${s.nisn} • ${s.name}` : "")}
            onChange={(e) => setQuery(e.target.value)} 
            required
            autoComplete="off"
          />
          <Combobox.Options className="absolute z-20 w-full mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
            {isStudentsLoadingRemote && query.length >= 2 ? (
              <div className="px-4 py-2 text-blue-500 italic">Mencari siswa...</div>
            ) : query.length < 2 ? (
              <div className="px-4 py-2 text-gray-500">Ketik minimal 2 huruf...</div>
            ) : studentsToDisplay.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">Tidak ada hasil ditemukan.</div>
            ) : (
              studentsToDisplay.map((s) => (
                <Combobox.Option
                  key={s.id}
                  value={s}
                  className={({ active }) =>
                    `cursor-pointer px-4 py-2 ${active ? "bg-blue-600 text-white" : "text-gray-900"}`
                  }
                >
                  {s.nisn} • {s.name}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>

      {selected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Riwayat Peminjaman</h4>
            {isHistoryLoading ? (
              <p className="text-xs text-gray-500">Loading...</p>
            ) : studentBorrows.length > 0 ? (
              <ul className="space-y-1">
                {studentBorrows.map((b) => (
                  <li key={b.id} className="text-xs text-gray-600 truncate border-b border-gray-100 pb-1">
                    • {b.book_title} <span className="text-gray-400">({dayjs(b.borrow_date).format("DD/MM")})</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-gray-400 italic">Belum ada riwayat.</p>}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 max-h-40 overflow-y-auto">
            <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Rekomendasi</h4>
            {isRecsLoading ? (
              <p className="text-xs text-blue-500">Loading...</p>
            ) : recommendedBooks.length > 0 ? (
              <ul className="space-y-1">
                {recommendedBooks.map((b) => (
                  <li key={b.id} className="text-xs text-blue-800 truncate border-b border-blue-100 pb-1">
                    • {b.title}
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-blue-400 italic">Tidak ada rekomendasi.</p>}
          </div>
        </div>
      )}

      <Combobox as="div" value={selectedBook} onChange={setSelectedBook}>
        <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
          Pilih Buku
        </Combobox.Label>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 outline-none"
              placeholder="Cari Judul Buku (min. 2 huruf)..."
              displayValue={(book) => book ? book.title : ''}
              onChange={(event) => setBookQuery(event.target.value)}
              autoComplete="off"
              required
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
          </div>
          
          <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {isBooksLoadingRemote && bookQuery.length >= 2 ? (
              <div className="px-4 py-2 text-blue-500 italic">Mencari buku...</div>
            ) : bookQuery.length < 2 ? (
              <div className="px-4 py-2 text-gray-500">Ketik minimal 2 huruf...</div>
            ) : booksToDisplay.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">Tidak ada buku ditemukan.</div>
            ) : (
              booksToDisplay.map((book) => (
                <Combobox.Option
                  key={book.id}
                  className={({ active, disabled }) =>
                    `relative cursor-default select-none py-2 pl-4 pr-4 ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-900'
                    } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`
                  }
                  value={book}
                  disabled={book.stock <= 0}
                >
                  {({ selected, active, disabled }) => (
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {book.title}
                        </span>
                        <span className={`text-xs ${active ? 'text-blue-200' : 'text-gray-500'}`}>
                          {book.author}
                        </span>
                      </div>
                      <div className="text-xs font-semibold">
                        {disabled ? (
                          <span className="text-red-500 border border-red-200 bg-red-50 px-2 py-0.5 rounded">Habis</span>
                        ) : (
                          <span className={`${active ? 'text-white' : 'text-green-600'}`}>Stok: {book.stock}</span>
                        )}
                      </div>
                    </div>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jatuh Tempo</label>
        <input
          type="date"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSaving}
      >
        {isSaving ? "Menyimpan..." : "Simpan Peminjaman"}
      </button>
    </form>
  );
}

// =====================================================================
// 2. KOMPONEN UTAMA: BorrowList
// =====================================================================

export default function BorrowList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sortKey, setKey] = useState("borrow_date");
  const [sortDir, setDir] = useState("desc");
  const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);
  const [borrowToReturn, setBorrowToReturn] = useState(null);

  const { data: borrowsData, isLoading, isError } = useQuery({
    queryKey: ["borrows", "active", sortKey, sortDir],
    queryFn: () =>
      api.get("/borrows", {
        params: { status: "active", sortBy: sortKey, sortOrder: sortDir }
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const borrows = borrowsData?.borrows || [];

  // ✅ SAFETY: Filter data dengan ID valid
  const validBorrows = useMemo(() => {
    return borrows.filter(b => {
      const hasValidId = (b.borrow_id && b.borrow_id !== 0) || (b.id && b.id !== 0);
      if (!hasValidId) {
        console.warn("⚠️ Filtered out borrow with invalid ID:", b);
      }
      return hasValidId;
    });
  }, [borrows]);

  // ✅ DEBUG
  useEffect(() => {
    if (validBorrows.length > 0) {
      console.log("📊 Valid Borrows:", validBorrows);
      console.log("🔑 IDs:", validBorrows.map(b => ({ 
        id: b.id, 
        borrow_id: b.borrow_id,
        book_id: b.book_id,
        title: b.title 
      })));
      console.log("📋 Fields:", Object.keys(validBorrows[0]));
    }
    if (borrows.length !== validBorrows.length) {
      console.warn(`⚠️ ${borrows.length - validBorrows.length} borrows filtered due to invalid ID`);
    }
  }, [validBorrows, borrows]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...validBorrows].sort((a, b) =>
      a[sortKey] > b[sortKey] ? dir : -dir
    );
  }, [validBorrows, sortKey, sortDir]);

  const addMut = useMutation({
    mutationFn: (body) => api.post("/borrows", body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries(["borrows", "active"]);
      qc.invalidateQueries(["books"]);
      qc.invalidateQueries(["stats"]);
      qc.invalidateQueries(["students", "quicksearch"]); 
      qc.invalidateQueries(["studentRecommendations", variables.student_id]); 
      qc.invalidateQueries(["studentBorrows", variables.student_id]); 
      toast.success("Peminjaman berhasil dicatat!");
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Gagal mencatat peminjaman.");
    },
  });

  const retMut = useMutation({
    mutationFn: (borrowId) => {
      console.log("🚀 Returning borrow ID:", borrowId);
      if (!borrowId || borrowId === 0) {
        throw new Error("Invalid borrow ID");
      }
      return api.put(`/borrows/${borrowId}/return`);
    },
    onSuccess: () => {
      qc.invalidateQueries(["borrows", "active"]);
      qc.invalidateQueries(["books"]);
      qc.invalidateQueries(["stats"]);
      toast.success("Buku berhasil dikembalikan!");
      setConfirmReturnOpen(false);
      setBorrowToReturn(null);
    },
    onError: (err) => {
      console.error("❌ Return error:", err);
      toast.error(err.response?.data?.message || err.message || "Gagal mengembalikan buku.");
    },
  });

  const handleOpenConfirmReturn = (borrow) => {
    console.log("📖 Selected borrow:", borrow);
    console.log("📖 id:", borrow.id, "borrow_id:", borrow.borrow_id);
    setBorrowToReturn(borrow);
    setConfirmReturnOpen(true);
  };
  
  const handleConfirmReturn = () => {
    const borrowId = borrowToReturn?.borrow_id || borrowToReturn?.id;
    console.log("🎯 Final ID:", borrowId);
    
    if (borrowId && borrowId !== 0) {
      retMut.mutate(borrowId);
    } else {
      console.error("❌ Invalid ID");
      toast.error(`ID tidak valid (id: ${borrowToReturn?.id}, borrow_id: ${borrowToReturn?.borrow_id})`);
    }
  };
  
  const handleCancelReturn = () => {
    setConfirmReturnOpen(false);
    setBorrowToReturn(null);
    toast.info("Pengembalian dibatalkan.");
  };

  const Head = ({ k, label }) => (
    <th
      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
      onClick={() => {
        if (sortKey === k) setDir(sortDir === "asc" ? "desc" : "asc");
        else { setKey(k); setDir("asc"); }
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 lg:p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Transaksi Peminjaman</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          + Catat Peminjaman
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-xl ring-1 ring-gray-100">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NISN</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Siswa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Judul Buku</th>
              <Head k="borrow_date" label="Tanggal Pinjam" />
              <Head k="due_date" label="Jatuh Tempo" />
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Memuat...</td></tr>
            ) : isError ? (
              <tr><td colSpan={7} className="text-center py-8 text-red-500">Gagal memuat data.</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Tidak ada data aktif.</td></tr>
            ) : (
              sorted.map((b, index) => {
                const uniqueKey = b.borrow_id || b.id || `${b.student_id}-${b.book_id}-${index}`;
                const overdue = !b.return_date && dayjs().isAfter(dayjs(b.due_date), "day");
                
                return (
                  <tr key={uniqueKey} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{b.nisn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {dayjs(b.borrow_date).format("DD/MM/YYYY")}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${overdue ? "text-red-600 font-semibold" : "text-gray-700"}`}>
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
                          className="px-4 py-2 bg-green-500 text-white font-medium text-xs rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
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

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white px-8 py-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-2xl font-bold text-gray-800 mb-6">
              Catat Peminjaman
            </Dialog.Title>
            <BorrowForm onSubmit={(val) => addMut.mutate(val)} isSaving={addMut.isPending} />
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={confirmReturnOpen} onClose={handleCancelReturn} className="relative z-[100]">
        <div className="fixed inset-0 bg-black/50" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
            <Dialog.Title className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-green-500 mr-2 text-2xl">✅</span>
              Konfirmasi Pengembalian
            </Dialog.Title>
            <Dialog.Description className="text-gray-700 mb-6">
              Yakin mengembalikan buku "<span className="font-semibold">{borrowToReturn?.title}</span>"
              dari <span className="font-semibold">{borrowToReturn?.name}</span>?
              <br/><br/>
              Pinjam: {borrowToReturn ? dayjs(borrowToReturn.borrow_date).format("DD/MM/YYYY") : ''}
              <br/>
              Jatuh tempo: {borrowToReturn ? dayjs(borrowToReturn.due_date).format("DD/MM/YYYY") : ''}
              {borrowToReturn && !borrowToReturn.return_date && dayjs().isAfter(dayjs(borrowToReturn.due_date), "day") && (
                <span className="block mt-2 text-sm text-red-600 font-semibold">
                  (Sudah melewati jatuh tempo!)
                </span>
              )}
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelReturn}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                disabled={retMut.isPending}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
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