// ──────────────────────────────────────────────
// src/pages/admin/BookList.jsx (FILE LENGKAP)
// ──────────────────────────────────────────────
import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "../../lib/api";
import { Dialog } from "@headlessui/react";
import { toast } from "react-hot-toast";

// Fungsi helper untuk memastikan nilai tidak null/undefined
const safe = (v) => (v ?? "").toString();

/* --------------------------------------------------
   Komponen Halaman Data Buku
-------------------------------------------------- */
export default function BookList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false); // State untuk modal Tambah/Edit
  const [edit, setEdit] = useState(null);

  // State baru untuk modal konfirmasi hapus
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  /* fetch daftar buku */
  const { data: books = [], isLoading, isError } = useQuery({
    queryKey: ["books"],
    queryFn: () => api.get("/books").then((r) => r.data),
  });

  /* tambah / edit buku */
  const saveMut = useMutation({
    mutationFn: (body) =>
      edit ? api.put(`/books/${edit.id}`, body)
        : api.post("/books", body),

    onSuccess: () => {
      qc.invalidateQueries(["books"]); qc.invalidateQueries(["stats"]);
      setOpen(false); setEdit(null);
      toast.success(edit ? "Buku berhasil diperbarui!" : "Buku berhasil ditambahkan!");
    },
    onError: () => toast.error("Gagal menyimpan buku. Silakan coba lagi."),
  });

  /* hapus buku */
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/books/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(["books"]); qc.invalidateQueries(["stats"]);
      toast.success("Buku berhasil dihapus!");
      setConfirmDeleteOpen(false); // Tutup modal konfirmasi
      setBookToDelete(null); // Reset info buku
    },
    onError: () => toast.error("Gagal menghapus buku. Silakan coba lagi."),
  });

  // Fungsi untuk membuka modal konfirmasi
  const handleOpenConfirmDelete = (book) => {
    setBookToDelete(book);
    setConfirmDeleteOpen(true);
  };

  // Fungsi untuk melakukan penghapusan setelah konfirmasi
  const handleConfirmDelete = () => {
    if (bookToDelete) {
      delMut.mutate(bookToDelete.id);
    }
  };

  // Fungsi untuk membatalkan penghapusan
  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setBookToDelete(null);
    toast.info("Penghapusan buku dibatalkan.");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Data Buku</h1>
        <button
          onClick={() => { setEdit(null); setOpen(true); }}
          className="
            px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors duration-200
          "
        >
          + Tambah Buku
        </button>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-xl ring-1 ring-gray-100">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Judul</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Penulis</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tahun</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stok</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Memuat data buku...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-red-500">
                  Gagal memuat data buku.
                </td>
              </tr>
            ) : books.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Belum ada data buku. Silakan tambahkan buku baru.
                </td>
              </tr>
            ) : (
              books.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{b.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.author}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.published_year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{b.stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <button
                      onClick={() => { setEdit(b); setOpen(true); }}
                      className="
                        text-blue-600 hover:text-blue-800 font-medium text-sm
                        transition-colors duration-200
                      "
                      disabled={saveMut.isPending || delMut.isPending}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleOpenConfirmDelete(b)}
                      className="
                        text-red-600 hover:text-red-800 font-medium text-sm
                        transition-colors duration-200
                      "
                      disabled={saveMut.isPending || delMut.isPending}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah / Edit */}
      <Dialog
        open={open}
        onClose={() => { setOpen(false); setEdit(null); }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="
            bg-white p-8 rounded-xl shadow-2xl w-full max-w-md
            transform transition-all ease-out duration-300
            scale-95 opacity-0
            data-[closed]:scale-90 data-[closed]:opacity-0
            data-[open]:scale-100 data-[open]:opacity-100
          ">
            <Dialog.Title className="text-2xl font-bold text-gray-800 mb-6">
              {edit ? "Edit Buku" : "Tambah Buku"}
            </Dialog.Title>
            <BookForm
              defaultValues={edit ?? {}}
              onSubmit={(val) => saveMut.mutate(val)}
              isSaving={saveMut.isPending}
            />
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCancelDelete}
        className="relative z-[100]"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="
            bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm
            transform transition-all ease-out duration-300
            scale-95 opacity-0
            data-[closed]:scale-90 data-[closed]:opacity-0
            data-[open]:scale-100 data-[open]:opacity-100
          ">
            <Dialog.Title className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-red-500 mr-2 text-2xl">⚠️</span>
              Konfirmasi Penghapusan
            </Dialog.Title>
            <Dialog.Description className="text-gray-700 mb-6">
              Apakah Anda yakin ingin menghapus buku "<span className="font-semibold text-gray-900">{bookToDelete?.title}</span>"?
              <br/><br/>
              <span className="text-sm text-red-600 font-medium">Peringatan: Riwayat peminjaman buku ini juga akan dihapus secara permanen!</span>
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="
                  px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold
                  hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                  transition-colors duration-200
                "
                disabled={delMut.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="
                  px-5 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md
                  hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={delMut.isPending}
              >
                {delMut.isPending ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

/* --------------------------------------------------
   Komponen Form Buku (CHILD COMPONENT)
-------------------------------------------------- */
function BookForm({ defaultValues = {}, onSubmit, isSaving }) {
  const [form, setForm] = useState({
    title: "", author: "", published_year: "", stock: 1,
  });

  useEffect(() => {
    setForm({
      title: safe(defaultValues.title),
      author: safe(defaultValues.author),
      published_year: safe(defaultValues.published_year),
      stock: defaultValues.stock ?? 1,
    });
  }, [defaultValues]);

  const handle = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
    >
      <input
        name="title"
        placeholder="Judul Buku"
        value={form.title}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        required
      />
      <input
        name="author"
        placeholder="Penulis"
        value={form.author}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        required
      />
      {/* ⚠️ PERBAIKAN PENTING: nama input harus sama dengan properti state */}
      <input
        type="number" // Menggunakan tipe angka untuk validasi
        name="published_year"
        placeholder="Tahun Terbit"
        value={form.published_year}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        required
      />
      <input
        type="number"
        name="stock"
        placeholder="Stok Tersedia"
        value={form.stock}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        min={0}
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
        {isSaving ? "Menyimpan..." : "Simpan Buku"}
      </button>
    </form>
  );
}
