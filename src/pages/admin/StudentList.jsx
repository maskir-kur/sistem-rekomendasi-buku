// ──────────────────────────────────────────────
// src/pages/admin/StudentList.jsx - VERSI AKHIR DAN KONSISTEN
// ──────────────────────────────────────────────
import { useState, useEffect, useMemo } from "react"; 
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "../../lib/api";
import { Dialog } from "@headlessui/react";
import Swal from "sweetalert2"; 
import { toast } from "react-hot-toast"; 
import { Search, ChevronUp, ChevronDown } from "lucide-react"; 

const safe = (v) => (v ?? "").toString(); 

/* --------------------------------------------------
    Komponen Halaman Data Siswa
-------------------------------------------------- */
export default function StudentList() {
  const qc = useQueryClient();

  /* state UI */
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState(""); 
  const [searchClass, setSearchClass] = useState(""); 
  // PERUBAHAN NAMA STATE (konsisten): showAll -> showArchivedOnly
  const [showArchivedOnly, setArchivedOnly] = useState(false); 

  // State baru untuk pagination dan sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10); 
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("class"); 
  const [sortOrder, setSortOrder] = useState("asc"); 

  /* --- fetch data siswa (aktif / alumni) dengan filter, sort, dan pagination --- */
  const { data: studentsData, isLoading, isError } = useQuery({
    // UBAH: Gunakan showArchivedOnly di queryKey
    queryKey: ["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q], 
    queryFn: () => {
      const params = {
        page: currentPage,
        limit: limit,
        // Kirim 'all' sebagai true jika ingin melihat arsip. 
        all: showArchivedOnly, 
        sortBy: sortBy,
        sortOrder: sortOrder,
      };

      if (searchClass) {
        params.searchClass = searchClass;
      }
      if (q) {
        params.searchGeneral = q; 
      }

      return api.get("/students", { params }).then((r) => r.data);
    },
    keepPreviousData: true, 
    onSuccess: (data) => {
      // Perhitungan total halaman berdasarkan totalCount yang dikirim backend
      if (data && typeof data.totalCount === 'number') {
        setTotalPages(Math.ceil(data.totalCount / limit));
      } else {
        setTotalPages(1); 
      }
    }
  });

  const rawStudents = studentsData?.students || []; 

  /* --- PENYEDERHANAAN: useMemo hanya perlu mengembalikan data mentah --- */
  const students = useMemo(() => {
      return rawStudents;
  }, [rawStudents]);


  /* --- tambah / edit siswa --- */
  const saveMut = useMutation({
    mutationFn: (body) =>
      edit ? api.put(`/students/${edit.id}`, body)
        : api.post("/students", body),

    onSuccess: (res, vars) => {
      qc.invalidateQueries(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q]); 
      qc.invalidateQueries(["stats"]);

      setOpen(false);
      setEdit(null);
      setTimeout(() =>
        toast.success(edit ? "Data siswa berhasil diperbarui!" : "Siswa berhasil ditambahkan!"),
        300);
    },

    onError: (err) => {
      setOpen(false);
      setEdit(null);
      setTimeout(() =>
        toast.error(err.response?.data?.message || "Gagal menyimpan data siswa. Silakan coba lagi."),
        300);
    },
  });

  /* --- arsip & restore --- */
  const archiveMut = useMutation({
    mutationFn: (studentToArchive) => api.put(`/students/${studentToArchive.id}/deactivate`),
    onMutate: async (studentToArchive) => {
      const toastId = toast.loading(`Mengarsipkan siswa "${studentToArchive.name}"...`);
      await qc.cancelQueries(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q]);
      const previousStudents = qc.getQueryData(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q]);
      
      qc.setQueryData(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q], (oldData) => {
        if (!oldData || !oldData.students) return oldData;
        return {
          ...oldData,
          students: oldData.students.map((s) => (s.id === studentToArchive.id ? { ...s, active: 0 } : s))
        };
      });
      return { previousStudents, toastId };
    },
    onSuccess: (data, studentToArchive, context) => {
      qc.invalidateQueries(["students", "stats"]);
      toast.success(`Siswa "${studentToArchive.name}" berhasil diarsipkan!`, { id: context.toastId });
    },
    onError: (err, studentToArchive, context) => {
      qc.setQueryData(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q], context.previousStudents);
      toast.error(err.response?.data?.message || `Gagal mengarsipkan siswa "${studentToArchive.name}".`, { id: context.toastId });
    },
  });

  const restoreMut = useMutation({
    mutationFn: (studentToRestore) => api.put(`/students/${studentToRestore.id}/activate`),
    onMutate: async (studentToRestore) => {
      const toastId = toast.loading(`Mengaktifkan siswa "${studentToRestore.name}" kembali...`);
      await qc.cancelQueries(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q]);
      const previousStudents = qc.getQueryData(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q]);

      qc.setQueryData(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q], (oldData) => {
        if (!oldData || !oldData.students) return oldData;
        return {
          ...oldData,
          students: oldData.students.map((s) => (s.id === studentToRestore.id ? { ...s, active: 1 } : s))
        };
      });
      return { previousStudents, toastId };
    },
    onSuccess: (data, studentToRestore, context) => {
      qc.invalidateQueries(["students", "stats"]);
      toast.success(`Siswa "${studentToRestore.name}" berhasil diaktifkan kembali!`, { id: context.toastId });
    },
    onError: (err, studentToRestore, context) => {
      qc.setQueryData(["students", showArchivedOnly, currentPage, limit, searchClass, sortBy, sortOrder, q], context.previousStudents);
      toast.error(err.response?.data?.message || `Gagal mengaktifkan siswa "${studentToRestore.name}".`, { id: context.toastId });
    },
  });

  // Handler untuk pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handler untuk limit items per page
  const handleLimitChange = (e) => {
    setLimit(parseInt(e.target.value));
    setCurrentPage(1); 
  };

  // Handler untuk pencarian kelas
  const handleSearchClassChange = (e) => {
    setSearchClass(e.target.value);
    setCurrentPage(1); 
  };
  
  // Handler untuk pencarian umum (NISN/Nama)
  const handleGeneralSearchChange = (e) => {
    setQ(e.target.value);
    setCurrentPage(1); 
  };

  // Handler untuk sorting
  const handleSortChange = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc"); 
    }
    setCurrentPage(1); 
  };

  /* -------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 lg:p-10">
      {/* ───── Header & Toolbar ───── */}
      <div className="flex flex-wrap gap-4 items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Data Siswa</h1>

        {/* Pencarian umum (NISN/Nama) */}
        <div className="relative flex-grow max-w-xs">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            placeholder="Cari NISN / Nama…"
            value={q}
            onChange={handleGeneralSearchChange} 
            className="
              w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
              focus:border-blue-500 transition-colors duration-200
            "
          />
        </div>
        
        {/* Pencarian berdasarkan Kelas */}
        <div className="relative flex-grow max-w-xs">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
                placeholder="Cari Kelas (contoh: 7A)"
                value={searchClass}
                onChange={handleSearchClassChange} 
                className="
                    w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
                    focus:border-blue-500 transition-colors duration-200
                "
            />
        </div>

        {/* Checkbox Tampilkan Alumni (Diarsip Saja) */}
        <label className="flex items-center gap-2 ml-auto text-gray-700 font-medium">
          <input
            type="checkbox"
            checked={showArchivedOnly} 
            onChange={(e) => {
                setArchivedOnly(e.target.checked); 
                setCurrentPage(1); 
            }}
            className="
              form-checkbox h-5 w-5 text-blue-600 rounded
              focus:ring-blue-500 focus:ring-offset-2
            "
          />
          <span>Tampilkan Alumni</span> 
        </label>
        
        {/* Dropdown Items per page */}
        <label className="flex items-center gap-2 text-gray-700 font-medium">
            Items per page:
            <select
                value={limit}
                onChange={handleLimitChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
            </select>
        </label>


        <button
          onClick={() => { setEdit(null); setOpen(true); }}
          className="
            px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors duration-200
          "
        >
          + Tambah Siswa
        </button>
      </div>

      {/* ───── Tabel Siswa ───── */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-xl ring-1 ring-gray-100">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange('nisn')}
              >
                NISN 
                {sortBy === 'nisn' && (
                  sortOrder === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange('name')}
              >
                Nama 
                {sortBy === 'name' && (
                  sortOrder === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange('class')}
              >
                Kelas 
                {sortBy === 'class' && (
                  sortOrder === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange('active')}
              >
                Status 
                {sortBy === 'active' && (
                  sortOrder === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Memuat data siswa...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-red-500">
                  Gagal memuat data siswa.
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Tidak ada data siswa yang ditemukan untuk kriteria ini.
                </td>
              </tr>
            ) : (
              // Gunakan array 'students' yang sudah difilter
              students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{s.nisn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{s.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{s.class}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`
                        px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${s.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      `}
                    >
                      {s.active ? "Aktif" : "Non-aktif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-4"> 
                    {/* Edit */}
                    <button
                      onClick={() => { setEdit(s); setOpen(true); }}
                      className="
                        text-blue-600 hover:text-blue-800 font-medium text-sm
                        transition-colors duration-200
                      "
                      disabled={saveMut.isPending || archiveMut.isPending || restoreMut.isPending}
                    >
                      Edit
                    </button>

                    {/* Arsip / Aktifkan */}
                    {s.active ? (
                      <button
                        className="
                          text-yellow-600 hover:text-yellow-800 font-medium text-sm
                          transition-colors duration-200
                        "
                        onClick={() =>
                          Swal.fire({
                            title: `Arsipkan siswa "${s.name}"?`,
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Ya, Arsipkan",
                            cancelButtonText: "Batal",
                            customClass: {
                                confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors duration-200',
                                cancelButton: 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors duration-200',
                            },
                            buttonsStyling: false,
                          }).then((r) => r.isConfirmed && archiveMut.mutate(s))
                        }
                        disabled={saveMut.isPending || archiveMut.isPending || restoreMut.isPending}
                      >
                        Arsip
                      </button>
                    ) : (
                      <button
                        className="
                          text-green-600 hover:text-green-800 font-medium text-sm
                          transition-colors duration-200
                        "
                        onClick={() => restoreMut.mutate(s)}
                        disabled={saveMut.isPending || archiveMut.isPending || restoreMut.isPending}
                      >
                        Aktifkan
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ───── Pagination Controls ───── */}
      {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
              <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  Previous
              </button>
              {/* Render tombol nomor halaman */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      disabled={isLoading}
                      className={`
                          px-4 py-2 rounded-lg font-semibold
                          ${currentPage === pageNumber ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                          disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                  >
                      {pageNumber}
                  </button>
              ))}
              <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  Next
              </button>
          </div>
      )}


      {/* ───── Modal Tambah / Edit ───── */}
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
              {edit ? "Edit Siswa" : "Tambah Siswa"}
            </Dialog.Title>

            <StudentForm
              defaultValues={edit ?? {}}
              onSubmit={(val) => {
                const payload = { ...val };
                if (edit && !payload.password) delete payload.password;
                saveMut.mutate(payload);
              }}
              isSaving={saveMut.isPending}
            />
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

/* --------------------------------------------------
    Form Tambah / Edit Siswa
-------------------------------------------------- */
function StudentForm({ defaultValues = {}, onSubmit, isSaving }) {
  const [form, setForm] = useState({
    nisn: "", name: "", class: "", password: "",
  });

  useEffect(() => {
    setForm({
      nisn: safe(defaultValues.nisn),
      name: safe(defaultValues.name),
      class: safe(defaultValues.class),
      password: "",
    });
  }, [defaultValues]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "nisn" ? value.replace(/[^0-9]/g, '') : value
    }));
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
    >
      <input
        name="nisn"
        placeholder="NISN"
        value={form.nisn}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        required
        maxLength={10}
      />
      <input
        name="name"
        placeholder="Nama Lengkap"
        value={form.name}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        required
      />
      <input
        name="class"
        placeholder="Kelas (contoh: 12 IPA 1)"
        value={form.class}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        required
      />
      <input
        type="password"
        name="password"
        placeholder={
          defaultValues.id ? "Password (kosongkan jika tidak diubah)" : "Password"
        }
        value={form.password}
        onChange={handle}
        className="
          w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500
          focus:border-blue-500 transition-colors duration-200
        "
        required={!defaultValues.id}
      />
      <button
        className="
          w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md
          hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        disabled={isSaving}
      >
        {isSaving ? "Menyimpan..." : (defaultValues.id ? "Simpan Perubahan" : "Tambah Siswa")}
      </button>
    </form>
  );
}