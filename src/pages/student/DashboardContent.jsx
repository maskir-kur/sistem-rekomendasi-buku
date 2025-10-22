// src/pages/student/DashboardContent.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { FaBookOpen, FaUndo, FaStar, FaUserCircle } from "react-icons/fa"; // Pastikan FaUserCircle diimpor

// Komponen StatCard (dipindahkan)
const StatCard = ({ title, value, icon, bgColor, textColor }) => (
    <div className={`p-6 rounded-lg shadow-md flex items-center space-x-4 ${bgColor} ${textColor}`}>
        <div className="text-3xl">{icon}</div>
        <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-4xl font-bold">{value}</p>
        </div>
    </div>
);

// Komponen BookList (dipindahkan)
const BookList = ({ title, books }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        {books.length === 0 ? (
            <p className="text-gray-500 italic">Tidak ada buku untuk ditampilkan.</p>
        ) : (
            <ul className="space-y-4">
                {books.map((book) => (
                    <li key={book.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <img src={book.cover_image_url} alt={book.title} className="w-12 h-16 object-cover rounded" />
                        <div className="flex-1">
                            <h4 className="font-semibold">{book.title}</h4>
                            <p className="text-sm text-gray-500">{book.author}</p>
                        </div>
                        {book.borrow_date && (
                            <p className="text-xs text-gray-400">Dipinjam: {new Date(book.borrow_date).toLocaleDateString()}</p>
                        )}
                        {book.return_date && (
                            <p className="text-xs text-gray-400">Dikembalikan: {new Date(book.return_date).toLocaleDateString()}</p>
                        )}
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const DashboardContent = () => {
    const { user } = useAuth();
    const [data, setData] = useState({
        recommendations: [],
        borrowed: [],
        returned: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [recommendationsRes, borrowedRes, returnedRes] = await Promise.all([
                    api.get(`/recommendations/for-student/${user.id}`),
                    api.get(`/borrows/for-student/${user.id}`),
                    api.get(`/borrows/returned/for-student/${user.id}`),
                ]);

                setData({
                    recommendations: recommendationsRes.data.recommendations || [],
                    borrowed: borrowedRes.data || [],
                    returned: returnedRes.data || [],
                });
            } catch (err) {
                setError("Gagal memuat data dashboard. Silakan coba lagi.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchDashboardData();
        }
    }, [user]);

    if (loading) {
        return <div className="p-8 text-gray-600">Memuat dashboard...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-600">{error}</div>;
    }

    const unreturnedBooks = data.borrowed.filter(book => !book.return_date);

    return (
        <div className="p-8"> 
            {/* Tambahkan kembali elemen teks Selamat Datang di sini */}
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-4">
                    <FaUserCircle className="text-5xl text-gray-700" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Selamat Datang, {user?.name || user?.nisn}</h1>
                        <p className="text-gray-500">Dashboard Siswa</p>
                    </div>
                </div>
            </header>

            {/* Bagian Statistik */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    title="Total Buku Dipinjam" 
                    value={data.borrowed.length + data.returned.length}
                    icon={<FaBookOpen />}
                    bgColor="bg-white" 
                    textColor="text-blue-500" 
                />
                <StatCard 
                    title="Buku Belum Kembali" 
                    value={unreturnedBooks.length} 
                    icon={<FaUndo />}
                    bgColor="bg-white" 
                    textColor="text-orange-500" 
                />
                <StatCard 
                    title="Buku Dikembalikan" 
                    value={data.returned.length} 
                    icon={<FaStar />}
                    bgColor="bg-white" 
                    textColor="text-green-500" 
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rekomendasi Buku */}
                <BookList title="Rekomendasi untuk Anda" books={data.recommendations} />
                
                {/* Buku yang Dipinjam */}
                <BookList title="Buku yang Sedang Anda Pinjam" books={unreturnedBooks} />
            </div>
        </div>
    );
};

export default DashboardContent;