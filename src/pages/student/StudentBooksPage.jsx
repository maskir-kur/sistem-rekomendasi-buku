// src/pages/student/StudentBooksPage.jsx
import React, { useState, useEffect } from "react";
import api from "../../lib/api";

const StudentBooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await api.get("/books");
        setBooks(response.data);
      } catch (err) {
        setError("Gagal memuat daftar buku.");
        console.error("Error fetching books:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Memuat buku...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Katalog Buku</h1>
      <div className="max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 italic">Tidak ada buku yang tersedia.</p>
          ) : (
            books.map((book) => (
              <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105">
                <img src={book.cover_image_url} alt={book.title} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-800 truncate">{book.title}</h2>
                  <p className="text-sm text-gray-500">{book.author}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default StudentBooksPage;