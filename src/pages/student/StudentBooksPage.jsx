// src/pages/student/StudentBooksPage.jsx

import React, { useState, useEffect } from "react";
import api from "../../lib/api";

// Batas buku per halaman
const BOOKS_PER_PAGE = 12;

const StudentBooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State untuk Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // State untuk Search
  const [searchTitle, setSearchTitle] = useState(''); 

  // Fungsi untuk mengambil data buku dari API
  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/books", { 
        params: { 
          limit: BOOKS_PER_PAGE,  
          page: currentPage,      
          title: searchTitle,     
        } 
      });

      const bookData = response.data?.data || [];
      const pagination = response.data?.pagination;

      setBooks(bookData);

      if (pagination && pagination.totalPages) {
        setTotalPages(pagination.totalPages);
      } else {
        setTotalPages(1); 
      }
    } catch (err) {
      setError("Gagal memuat daftar buku atau hasil pencarian.");
      console.error("Error fetching books:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [currentPage, searchTitle]);

  const handleSearchChange = (event) => {
    setSearchTitle(event.target.value);
    setCurrentPage(1); 
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };


  // --- Tampilan Loading / Error ---
  if (loading && books.length === 0 && currentPage === 1) {
    return <div className="p-8 text-center text-gray-600">Memuat buku...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }
  
  // --- Tampilan Utama ---
  return (
    // ✅ PERBAIKAN 1: Hapus overflow-y-auto/h-screen dari container utama
    // Asumsi: Kontainer yang membungkus halaman (layout) sudah diatur tinggi/scroll-nya.
    <div className="p-4 sm:p-8"> 
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Katalog Buku 📚</h1>
      
      {/* Kolom Pencarian */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Cari buku berdasarkan judul..."
          value={searchTitle} 
          onChange={handleSearchChange}
          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition duration-150"
        />
      </div>

      {books.length === 0 && !loading ? (
        <p className="col-span-full text-center text-gray-500 italic">
          {searchTitle ? `Tidak ada buku yang cocok dengan "${searchTitle}".` : "Tidak ada buku yang tersedia."}
        </p>
      ) : (
        <>
          {/* Daftar Buku */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <div 
                key={book.id} 
                className="
                  bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden 
                  transition-transform duration-300 hover:scale-[1.03] hover:shadow-2xl
                  // ✅ PERBAIKAN 3: Tetapkan Tinggi Box secara tegas (Contoh: h-96 atau h-[420px])
                  // Gunakan tinggi spesifik agar semua box sama ukurannya.
                  h-[420px] flex flex-col 
                "
              >
                {/* Container Gambar (Rasio 3:4 dan Object-Contain) */}
                <div className="aspect-w-3 aspect-h-4 w-full bg-gray-100 flex items-center justify-center flex-shrink-0" style={{ height: '55%' }}>
                    <img 
                        src={book.cover_image_url || 'https://via.placeholder.com/300x400?text=No+Cover'} 
                        alt={book.title} 
                        className="w-full h-full object-contain p-4" 
                    />
                </div>
                
                {/* Detail Konten */}
                <div className="p-4 space-y-1 flex-grow overflow-hidden"> 
                  <h2 className="text-lg font-bold text-gray-800 line-clamp-2">{book.title}</h2>
                  <p className="text-sm text-gray-600 italic pb-1 border-b">{book.author}</p>
                  
                  {/* Tampilkan Stok Buku */}
                  <div className="pt-2">
                    <span 
                      className={`
                        text-sm font-semibold px-3 py-1 rounded-full 
                        ${book.stock > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }
                      `}
                    >
                      Stok: {book.stock}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Navigasi Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-10">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition duration-150"
              >
                Sebelumnya
              </button>
              
              <span className="text-gray-700 font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-600 transition duration-150"
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentBooksPage;