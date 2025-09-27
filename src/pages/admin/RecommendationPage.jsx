// ──────────────────────────────────────────────
// frontend/src/pages/admin/RecommendationPage.jsx (MODIFIED for Hybrid System)
// ──────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaBookReader, FaUsers, FaChartLine } from 'react-icons/fa'; 

// Helper untuk memformat waktu
const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    // Format tanggal dan waktu yang lebih lengkap
    return date.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

// Komponen untuk menampilkan kartu statistik
const StatCard = ({ title, value, icon, color, onClick = () => {} }) => (
    <div 
        className={`flex flex-col items-center p-6 bg-white rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg ${onClick !== StatCard.defaultProps.onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={onClick}
    >
        <div className={`text-4xl mb-3 ${color}`}>
            {icon}
        </div>
        <div className="text-xl font-bold text-gray-800 text-center">{value}</div>
        <p className="text-sm text-gray-500 text-center">{title}</p>
    </div>
);
StatCard.defaultProps = {
    onClick: () => {}
};

const RecommendationPage = () => {
    // ──────────────────────────────
    // STATES
    // ──────────────────────────────
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generationMessage, setGenerationMessage] = useState('');
    // Mengubah latestSummary menjadi activeBatch (hanya menyimpan info batch aktif/terbaru)
    const [activeBatch, setActiveBatch] = useState(null); 
    const [loadingSummary, setLoadingSummary] = useState(true);

    // ──────────────────────────────
    // CONSTANTS & HOOKS
    // ──────────────────────────────
    const navigate = useNavigate();
    const API_BASE_URL = 'http://localhost:5000/api';

    // ──────────────────────────────
    // AUTHENTICATION HELPER
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
    // API HELPERS
    // ──────────────────────────────
    // FUNGSI BARU: Mengambil data ringkasan batch aktif dari backend
    const fetchActiveBatchInfo = async () => {
        setLoadingSummary(true);
        setActiveBatch(null);
        try {
            const token = getToken();
            if (!token) {
                navigate('/admin/login');
                return;
            }
            
            // Panggil endpoint yang sekarang berfungsi: /batches
            const response = await axios.get(`${API_BASE_URL}/recommendations/batches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const batches = response.data;
            
            if (batches.length === 0) {
                setActiveBatch(null);
                return;
            }

            // Cari batch yang aktif
            let active = batches.find(b => b.is_active);
            
            // Jika tidak ada yang aktif, ambil yang paling baru untuk ditampilkan
            if (!active) {
                active = batches[0];
                active.is_active = false; // Pastikan statusnya non-aktif jika tidak ditemukan yang aktif
            }

            setActiveBatch(active);

        } catch (err) {
            console.error("Failed to fetch active batch info:", err);
            setError("Gagal memuat informasi batch. Server mungkin belum siap atau error.");
            setActiveBatch(null);
        } finally {
            setLoadingSummary(false);
        }
    };

    // ──────────────────────────────
    // EVENT HANDLERS
    // ──────────────────────────────
    const handleGenerateRecommendations = async () => {
        setLoading(true);
        setError(null);
        setGenerationMessage('');

        try {
            const token = getToken();
            if (!token) {
                setError("No authentication token found. Please log in as admin.");
                navigate('/admin/login');
                return;
            }

            // POST ke /generate (URL ini sudah benar dan memicu ML + Set Active Timestamp)
            const response = await axios.post(`${API_BASE_URL}/recommendations/generate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Set pesan dari backend (yang berisi timestamp batch baru)
            setGenerationMessage(response.data.message || 'Rekomendasi berhasil dibuat!');
            
            // Muat ulang data status batch setelah proses generate selesai
            setTimeout(fetchActiveBatchInfo, 3000); 
            
        } catch (err) {
            console.error("Error caught in handleGenerateRecommendations:", err);
            setError(err.response?.data?.message || "Gagal membuat rekomendasi. Cek log server Python/Node.");
        } finally {
            setLoading(false);
        }
    };

    // Ambil data status batch saat komponen pertama kali dimuat
    useEffect(() => {
        fetchActiveBatchInfo();
    }, []);

    // ──────────────────────────────
    // JSX RENDERING
    // ──────────────────────────────
    return (
        <div className="space-y-8 p-8">
            {/* Panel Utama: Tombol Generate */}
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-700 text-center sm:text-left">
                    Generate/Refresh Semua Rekomendasi
                </h2>
                <button
                    onClick={handleGenerateRecommendations}
                    disabled={loading}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Memulai Proses ML...' : 'Generate/Refresh'}
                </button>
            </div>
            {generationMessage && (
                <p className="text-green-600 text-sm font-medium mt-2">
                    ✅ {generationMessage}
                </p>
            )}
            {error && (
                <p className="text-red-600 text-sm font-medium mt-2">
                    ❌ Error: {error}
                </p>
            )}

            {/* Bagian Statistik dan Informasi */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Panel Statistik */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-700">Status Kontrol Batch Rekomendasi</h3>
                    {loadingSummary ? (
                        <p className="p-6 text-gray-500 bg-white rounded-lg shadow-md">Memuat data status batch...</p>
                    ) : activeBatch ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Stat Card 1: Waktu Generate Terakhir */}
                            <StatCard
                                title="Waktu Generate Terakhir"
                                value={formatTimestamp(activeBatch.generated_at)}
                                icon={<FaBookReader />}
                                color="text-gray-600"
                            />
                            {/* Stat Card 2: Status Aktif */}
                            <StatCard
                                title="Status Batch Aktif"
                                value={activeBatch.is_active ? "AKTIF" : "NON-AKTIF"}
                                icon={<FaUsers />}
                                color={activeBatch.is_active ? "text-green-500" : "text-red-500"}
                            />
                            {/* Stat Card 3: Navigasi ke Batch */}
                            <StatCard
                                title="Pengaturan Batch"
                                value="Lihat Detail Batch"
                                icon={<FaChartLine />}
                                color="text-blue-500"
                                onClick={() => navigate('/admin/recommendation/batches')}
                            />
                        </div>
                    ) : (
                        <p className="p-6 text-gray-500 bg-white rounded-lg shadow-md">Belum ada proses rekomendasi yang pernah dijalankan. Silakan klik 'Generate'.</p>
                    )}
                </div>

                {/* Panel Informasi */}
                <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                    <h3 className="text-lg font-bold text-gray-700">Tentang Sistem Rekomendasi Hybrid</h3>
                    <p className="text-gray-600 text-sm">
                        Sistem ini menggunakan pendekatan **Hybrid** (K-Means Clustering + Segmented Apriori) untuk personalisasi:
                    </p>
                    <ul className="text-gray-600 text-sm list-disc list-inside">
                        <li>**K-Means:** Mengelompokkan siswa berdasarkan profil pinjaman mereka.</li>
                        <li>**Apriori:** Menerapkan aturan asosiasi dalam setiap klaster untuk menghasilkan rekomendasi yang sangat relevan.</li>
                        <li>**Kontrol Batch:** Rekomendasi disajikan dari *batch* yang terakhir diaktifkan (timestamp).</li>
                    </ul>
                </div>
            </div>
            
        </div>
    );
};

export default RecommendationPage;
