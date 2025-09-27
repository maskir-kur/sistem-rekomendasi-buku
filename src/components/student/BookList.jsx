// src/components/student/BookList.jsx
import React from 'react';

const BookList = ({ title, books }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        {books.length === 0 ? (
            <p className="text-gray-500 italic">Tidak ada buku untuk ditampilkan.</p>
        ) : (
            <ul className="space-y-4">
                {books.map((book) => (
                    <li key={book.id} className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-lg">
                        <img src={book.cover_image_url} alt={book.title} className="w-12 h-16 object-cover rounded" />
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold">{book.title}</h4>
                            <p className="text-sm text-gray-500">{book.author}</p>
                        </div>
                        
                        {/* Kontainer baru untuk tanggal yang responsif */}
                        <div className="flex flex-col items-start md:items-end text-left md:text-right text-xs text-gray-400 mt-2 md:mt-0">
                            {book.borrow_date && (
                                <p className="whitespace-nowrap">Dipinjam: {new Date(book.borrow_date).toLocaleDateString()}</p>
                            )}
                            {book.return_date && (
                                <p className="whitespace-nowrap">Dikembalikan: {new Date(book.return_date).toLocaleDateString()}</p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export default BookList;