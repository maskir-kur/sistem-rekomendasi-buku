// ──────────────────────────────────────────────
// frontend/src/pages/admin/RecommendationPage.jsx (KODE REVISI FINAL DENGAN createPortal)
// ──────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// WAJIB: Import createPortal untuk mengatasi masalah Z-Index
import { createPortal } from 'react-dom'; 
import { FaBookReader, FaUsers, FaChartLine, FaTimes } from 'react-icons/fa';

// 1. StatCard Component (Tidak Berubah)
const StatCard = ({ title, value, icon, color, onClick, isClickable = false }) => (
    <div 
        className={`flex flex-col items-center p-6 bg-white rounded-lg shadow-md transition-shadow duration-300 
            ${isClickable ? 'cursor-pointer hover:shadow-xl ring-2 ring-transparent hover:ring-blue-400' : 'hover:shadow-lg'}`
        }
        onClick={isClickable ? onClick : undefined}
    >
        <div className={`text-4xl mb-3 ${color}`}>
            {icon}
        </div>
        <div className="text-xl font-bold text-gray-800">{value}</div>
        <p className="text-sm text-gray-500 text-center">{title}</p>
    </div>
);

// 2. StudentListModal Component (Perbaikan Z-Index dengan createPortal)
const StudentListModal = ({ students, onClose, loading }) => {
    if (!students) return null;

    // Konten Modal yang akan di-portal-kan
    const modalContent = (
        // Menggunakan Z-INDEX yang sangat tinggi (z-max) untuk keamanan,
        // meskipun createPortal seharusnya sudah menyelesaikan masalah.
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-[999999] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col transform transition-all duration-300 animate-fadeIn">
                
                {/* Header Modal */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xl font-extrabold text-gray-800">Daftar Siswa Terpengaruh ({students.length})</h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-red-600 transition p-1 rounded-full hover:bg-red-50"
                        aria-label="Tutup Modal"
                    >
                        <FaTimes className="text-2xl" />
                    </button>
                </div>

                {/* Body Modal */}
                <div className="p-5 flex-grow overflow-y-auto">
                    {loading ? (
                        <p className="text-center text-blue-500 p-8">Memuat data siswa...</p>
                    ) : students.length > 0 ? (
                        <ul className="space-y-3">
                            {students.map((student) => (
                                <li 
                                    key={student.studentId || student.nisn}
                                    className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className='flex flex-col'>
                                        <span className="font-semibold text-lg text-gray-800">{student.name}</span>
                                        {/* Pastikan NISN tersedia di data yang dikembalikan backend */}
                                        <span className='text-xs text-gray-400'>NISN: {student.nisn || 'N/A'}</span>
                                    </div>
                                    <span className="text-md font-bold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                        {student.class}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className='text-center p-8 bg-yellow-50 rounded-lg'>
                             <p className="text-gray-600">
                                Tidak ada siswa yang terpengaruh dalam batch rekomendasi ini.
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                (Atau proses *generate* tidak menghasilkan aturan).
                            </p>
                        </div>
                       
                    )}
                </div>

                {/* Footer Modal */}
                <div className="p-4 border-t border-gray-200 text-right bg-gray-50">
                    <button 
                        onClick={onClose} 
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-5 rounded-lg transition-colors shadow-lg"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );

    // KUNCI PERBAIKAN: Render modal di luar hirarki AdminLayout
    return createPortal(modalContent, document.body);
};


const RecommendationPage = () => {
    // ──────────────────────────────
    // STATES
    // ──────────────────────────────
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generationMessage, setGenerationMessage] = useState('');
    const [latestSummary, setLatestSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [studentsData, setStudentsData] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentsError, setStudentsError] = useState(null); 

    // ──────────────────────────────
    // CONSTANTS & HOOKS
    // ──────────────────────────────
    const navigate = useNavigate();
    const API_BASE_URL = 'http://localhost:5000/api';

    // ──────────────────────────────
    // AUTHENTICATION HELPER (TIDAK BERUBAH)
    // ──────────────────────────────
    const getToken = () => {
        const userString = localStorage.getItem('user');
        if (!userString) return null;
        try {
            const userObject = JSON.parse(userString);
            return userObject.token;
        } catch (e) {
            console.error("Failed to parse user object from localStorage:", e);
            return null;
        }
    };
    
    // ──────────────────────────────
    // API HELPERS (TIDAK BERUBAH LOGIKA)
    // ──────────────────────────────
    const fetchLatestSummary = async () => {
        setLoadingSummary(true);
        try {
            const token = getToken();
            if (!token) {
                navigate('/admin/login');
                return;
            }
            const response = await axios.get(`${API_BASE_URL}/recommendations/latest-summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLatestSummary(response.data);
        } catch (err) {
            console.error("Failed to fetch latest summary:", err);
            setLatestSummary(null);
        } finally {
            setLoadingSummary(false);
        }
    };

    const fetchImpactedStudents = async () => {
        const summaryId = latestSummary?.summaryId; 
        if (!summaryId) return; 
        
        setIsModalOpen(true);
        setLoadingStudents(true);
        setStudentsData([]);
        setStudentsError(null);
        
        try {
            const token = getToken();
            if (!token) {
                navigate('/admin/login');
                return;
            }
            
            const response = await axios.get(`${API_BASE_URL}/recommendations/${summaryId}/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setStudentsData(response.data.students || []); 
        } catch (err) {
            console.error("Failed to fetch impacted students:", err);
            setStudentsError(err.response?.data?.message || "Gagal mengambil daftar siswa.");
            setStudentsData([]);
        } finally {
            setLoadingStudents(false);
        }
    };

    // ──────────────────────────────
    // EVENT HANDLERS (TIDAK BERUBAH LOGIKA)
    // ──────────────────────────────
    const handleGenerateRecommendations = async () => {
        setLoading(true);
        setError(null);
        setGenerationMessage('');
        setIsModalOpen(false);
        setStudentsData([]);

        try {
            const token = getToken();
            if (!token) {
                setError("No authentication token found. Please log in as admin.");
                navigate('/admin/login');
                return;
            }

            const response = await axios.post(`${API_BASE_URL}/recommendations/generate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setGenerationMessage(response.data.message || 'Rekomendasi berhasil dibuat!');
            setTimeout(fetchLatestSummary, 2000); 
            
        } catch (err) {
            console.error("Error caught in handleGenerateRecommendations:", err);
            setError(err.response?.data?.message || "Gagal menjalankan skrip rekomendasi.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenStudentsModal = () => {
        if (latestSummary?.summaryId && latestSummary.studentsCount > 0) {
            fetchImpactedStudents();
        } else {
            setIsModalOpen(true);
            setStudentsData([]);
            setLoadingStudents(false);
        }
    };

    const handleCloseStudentsModal = () => {
        setIsModalOpen(false);
        setStudentsData([]);
        setStudentsError(null);
    };

    useEffect(() => {
        fetchLatestSummary();
    }, []);

    // ──────────────────────────────
    // JSX RENDERING
    // ──────────────────────────────
    return (
        <div className="space-y-8 p-8">
            {/* Panel Utama: Tombol Generate */}
            <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-700 text-center sm:text-left">
                    Picu Proses Rekomendasi
                </h2>
                <button
                    onClick={handleGenerateRecommendations}
                    disabled={loading}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                >
                    {loading ? 'Memulai Proses...' : 'Generate/Refresh'}
                </button>
            </div>
            
            {/* Notifikasi */}
            {generationMessage && (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg shadow-sm" role="alert">
                    {generationMessage}
                </div>
            )}
            {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-sm" role="alert">
                    Error: {error}
                </div>
            )}
            
            <hr className='border-gray-300' />

            {/* Bagian Statistik dan Informasi */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-2xl font-bold text-gray-700">Ringkasan Proses Terakhir</h3>
                    {loadingSummary ? (
                        <p className="p-6 text-gray-500 bg-white rounded-lg shadow-md">Memuat data statistik...</p>
                    ) : latestSummary && latestSummary.status !== 'no_data' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <StatCard
                                title="Total Aturan Rekomendasi"
                                value={latestSummary.recommendationsCount}
                                icon={<FaBookReader />}
                                color="text-blue-600"
                            />
                            
                            <StatCard
                                title="Siswa Terpengaruh"
                                value={latestSummary.studentsCount}
                                icon={<FaUsers />}
                                color="text-green-600"
                                onClick={handleOpenStudentsModal}
                                isClickable={latestSummary.studentsCount > 0} 
                            />
                            
                            <StatCard
                                title={`Terakhir ${latestSummary.generated_at ? new Date(latestSummary.generated_at).toLocaleDateString('id-ID') : '—'}`}
                                value={latestSummary.status.toUpperCase()}
                                icon={<FaChartLine />}
                                color={latestSummary.status === 'success' ? 'text-green-600' : 'text-red-600'}
                            />
                        </div>
                    ) : (
                        <p className="p-6 text-gray-500 bg-white rounded-lg shadow-md border border-gray-100">
                            Belum ada proses rekomendasi yang pernah dijalankan. Silahkan **Generate/Refresh** di atas.
                        </p>
                    )}
                </div>

                {/* Panel Informasi */}
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-4 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700">Tentang Sistem Rekomendasi</h3>
                    <p className="text-gray-600 text-sm">
                        Sistem ini menggunakan algoritma **Apriori dan *association rule*** untuk menganalisis pola peminjaman buku.
                        Algoritma ini mengidentifikasi aturan "Jika siswa meminjam buku X, maka kemungkinan besar mereka akan menyukai buku Y."
                    </p>
                    <hr className='border-gray-200' />
                    <h3 className="text-lg font-bold text-gray-700">Tips Admin</h3>
                    <ul className="text-gray-600 text-sm list-disc list-inside space-y-1">
                        <li>Jalankan proses rekomendasi secara berkala (misalnya, setiap bulan) untuk memastikan rekomendasi tetap relevan.</li>
                        <li>Pastikan data peminjaman buku sudah cukup banyak untuk menghasilkan pola yang akurat.</li>
                    </ul>
                </div>
            </div>
            
            {/* 3. PANGGIL KOMPONEN MODAL - Kini dirender menggunakan Portal */}
            {isModalOpen && (
                <StudentListModal 
                    students={studentsData}
                    onClose={handleCloseStudentsModal}
                    loading={loadingStudents}
                />
            )}
        </div>
    );
};

export default RecommendationPage;