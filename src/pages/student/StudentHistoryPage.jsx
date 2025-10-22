// src/pages/student/RiwayatPeminjaman.jsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import BookList from "../../components/student/BookList";

const StudentHistoryPage = () => {
    const { user } = useAuth();
    const [borrowedHistory, setBorrowedHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchBorrowedData = async () => {
            try {
                const [unreturnedRes, returnedRes] = await Promise.all([
                    api.get(`/borrows/for-student/${user.id}`),
                    api.get(`/borrows/returned/for-student/${user.id}`),
                ]);

                const combinedHistory = [
                    ...(unreturnedRes.data || []),
                    ...(returnedRes.data || []),
                ];

                combinedHistory.sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));

                setBorrowedHistory(combinedHistory);
            } catch (err) {
                setError("Gagal memuat riwayat peminjaman. Silakan coba lagi.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchBorrowedData();
        }
    }, [user]);

    if (loading) {
        return <div className="p-8 text-gray-600">Memuat riwayat peminjaman...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-600">{error}</div>;
    }
    
    return (
        // ✅ PERBAIKAN: Tambahkan kelas padding 'p-8' di container terluar
        <div className="p-8"> 
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Riwayat Peminjaman Buku</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <BookList title="Riwayat Peminjaman Lengkap" books={borrowedHistory} />
            </div>
        </div>
    );
};

export default StudentHistoryPage;