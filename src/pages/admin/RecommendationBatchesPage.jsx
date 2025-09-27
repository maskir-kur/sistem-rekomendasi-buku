// ──────────────────────────────────────────────
// frontend/src/pages/admin/RecommendationBatchesPage.jsx
// ──────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2, PlayCircle, List, ArrowLeft, Loader2, Info } from 'lucide-react';

// Helper untuk memformat waktu
const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

// Komponen Modal Kustom (Pengganti alert/confirm)
const ConfirmationModal = ({ isVisible, title, message, onConfirm, onCancel, confirmText = 'Konfirmasi', confirmColor = 'bg-red-600' }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-500 mr-2" />
                    {title}
                </h3>
                <p className="text-gray-600">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white ${confirmColor} rounded-lg hover:opacity-90 transition`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RecommendationBatchesPage = () => {
    // ──────────────────────────────
    // STATES
    // ──────────────────────────────
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
    const [selectedBatchRules, setSelectedBatchRules] = useState(null);
    const [bookDetailsMap, setBookDetailsMap] = useState({});
    
    // States untuk Modal & Status Proses
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState({});
    const [isProcessing, setIsProcessing] = useState(false); // Untuk status loading action

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
    // API CALLS
    // ──────────────────────────────
    const fetchBatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            if (!token) {
                navigate('/admin/login');
                return;
            }
            const response = await axios.get(`${API_BASE_URL}/recommendations/batches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Sortir berdasarkan waktu pembuatan terbaru
            setBatches(response.data.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at)));
        } catch (err) {
            console.error("Error fetching batches:", err);
            setError(err.response?.data?.message || "Gagal mengambil daftar batch rekomendasi.");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Mengubah fetchBookDetails agar menggunakan GET dengan query string (Lebih sesuai untuk mendapatkan list data)
    const fetchBookDetails = async (bookIds) => {
        if (!bookIds || bookIds.length === 0) return [];
        try {
            const token = getToken();
            if (!token) throw new Error("No authentication token found.");
            
            // Menggunakan endpoint GET dengan query string untuk daftar ID
            const idString = bookIds.join(',');
            const response = await axios.get(`${API_BASE_URL}/recommendations/books/details-by-ids?ids=${idString}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return response.data;
        } catch (err) {
            console.error("Error fetching book details by IDs in batch page:", err);
            return [];
        }
    };

    const fetchBatchDetails = async (batchId) => {
        setSelectedBatchDetails(null); 
        setSelectedBatchRules(null);
        setBookDetailsMap({});
        setLoading(true);
        setError(null);
        
        try {
            const token = getToken();
            if (!token) {
                navigate('/admin/login');
                return;
            }
            const response = await axios.get(`${API_BASE_URL}/recommendations/batches/${batchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            let batchDetail = response.data;
            setSelectedBatchDetails(batchDetail);

            // Parsing rules_data
            const rulesData = typeof batchDetail.rules_data === 'string' ? JSON.parse(batchDetail.rules_data) : batchDetail.rules_data;
            setSelectedBatchRules(rulesData);

            // Kumpulkan semua ID buku unik
            const allBookIds = new Set();
            for (const antecedent in rulesData) {
                if (rulesData.hasOwnProperty(antecedent)) {
                    const antecedentIds = antecedent.split(',').map(Number).filter(id => !isNaN(id));
                    antecedentIds.forEach(id => allBookIds.add(id));
                    rulesData[antecedent].recommends.forEach(id => allBookIds.add(id));
                }
            }

            // Ambil detail buku
            const bookDetails = await fetchBookDetails(Array.from(allBookIds));
            const newBookDetailsMap = {};
            bookDetails.forEach(book => {
                newBookDetailsMap[book.id] = book;
            });
            setBookDetailsMap(newBookDetailsMap);

        } catch (err) {
            console.error("Error fetching batch details:", err);
            setError(err.response?.data?.message || "Gagal mengambil detail batch.");
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────
    // MODAL HANDLERS (for Active/Delete)
    // ──────────────────────────────
    const handleSetBatchActive = (batchId) => {
        setModalContent({
            title: "Aktifkan Batch Rekomendasi",
            message: `Apakah Anda yakin ingin mengaktifkan Batch ID ${batchId}? Rekomendasi ini akan langsung ditampilkan kepada siswa.`,
            action: () => executeSetBatchActive(batchId),
            confirmText: "Aktifkan",
            confirmColor: "bg-green-600"
        });
        setShowModal(true);
    };

    const handleDeleteBatch = (batchId) => {
        setModalContent({
            title: "Hapus Batch Rekomendasi",
            message: `PERINGATAN! Anda akan menghapus Batch ID ${batchId}. Tindakan ini tidak dapat dibatalkan. Lanjutkan?`,
            action: () => executeDeleteBatch(batchId),
            confirmText: "Hapus Permanen",
            confirmColor: "bg-red-600"
        });
        setShowModal(true);
    };

    // ──────────────────────────────
    // EXECUTION LOGIC
    // ──────────────────────────────
    const executeSetBatchActive = async (batchId) => {
        setIsProcessing(true);
        setShowModal(false);
        setError(null);
        try {
            const token = getToken();
            await axios.post(`${API_BASE_URL}/recommendations/batches/${batchId}/set-active`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Batch ${batchId} berhasil diaktifkan!`); // Tetap menggunakan alert untuk notifikasi sukses
            fetchBatches();
            if (selectedBatchDetails && selectedBatchDetails.id === batchId) {
                setSelectedBatchDetails(prev => ({ ...prev, is_active: true }));
            }
        } catch (err) {
            console.error("Error setting batch as active:", err);
            setError(err.response?.data?.message || "Gagal mengaktifkan batch.");
        } finally {
            setIsProcessing(false);
        }
    };

    const executeDeleteBatch = async (batchId) => {
        setIsProcessing(true);
        setShowModal(false);
        setError(null);
        try {
            const token = getToken();
            await axios.delete(`${API_BASE_URL}/recommendations/batches/${batchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Batch ${batchId} berhasil dihapus.`); // Tetap menggunakan alert untuk notifikasi sukses
            fetchBatches();
            if (selectedBatchDetails && selectedBatchDetails.id === batchId) {
                setSelectedBatchDetails(null);
            }
        } catch (err) {
            console.error("Error deleting batch:", err);
            setError(err.response?.data?.message || "Gagal menghapus batch.");
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    // ──────────────────────────────
    // RENDER LOGIC
    // ──────────────────────────────

    const renderBookPill = (book, type) => (
        <span 
            key={book?.id || `unknown-${Math.random()}`}
            className={`inline-block text-xs font-medium px-3 py-1 rounded-full border 
            ${type === 'antecedent' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-pink-100 text-pink-800 border-pink-300'}`}
        >
            {book?.title || `ID Buku Tidak Ditemukan: ${book?.id}`}
        </span>
    );
    
    // Tampilkan detail batch atau daftar batch
    const displayContent = selectedBatchDetails ? 'details' : 'list';

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4">
                Manajemen Batch Rekomendasi
            </h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            )}
            
            {loading || isProcessing ? (
                <div className="flex items-center justify-center p-10 bg-white rounded-lg shadow-md">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-3" />
                    <p className="text-gray-600">{isProcessing ? 'Memproses Aksi...' : 'Memuat data batch...'}</p>
                </div>
            ) : (
                <>
                    {/* Tampilan Detail Batch */}
                    {displayContent === 'details' && selectedBatchDetails && (
                        <div className="bg-white p-6 rounded-lg shadow-xl space-y-6">
                            <button
                                onClick={() => setSelectedBatchDetails(null)}
                                className="flex items-center text-blue-600 hover:text-blue-800 transition font-medium mb-4"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Kembali ke Daftar Batch
                            </button>

                            <div className="flex justify-between items-start border-b pb-4 mb-4">
                                <h2 className="text-2xl font-semibold text-gray-700">Detail Batch ID: {selectedBatchDetails.id}</h2>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${selectedBatchDetails.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {selectedBatchDetails.is_active ? 'AKTIF' : 'NON-AKTIF'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600 text-sm">
                                <p><strong>Dibuat Pada:</strong> {formatTimestamp(selectedBatchDetails.generated_at)}</p>
                                <p><strong>Status Aktif:</strong> {selectedBatchDetails.is_active ? 'Digunakan untuk Siswa' : 'Siap untuk Diaktifkan'}</p>
                            </div>

                            <h4 className="text-xl font-bold text-gray-700 mt-8 flex items-center">
                                <List className="w-5 h-5 mr-2" />
                                Aturan Asosiasi Ditemukan
                            </h4>
                            <div className="space-y-6 max-h-96 overflow-y-auto p-4 border rounded-lg bg-gray-50">
                                {selectedBatchRules && Object.keys(selectedBatchRules).length > 0 ? (
                                    Object.keys(selectedBatchRules).map(antecedent => {
                                        const rule = selectedBatchRules[antecedent];
                                        const antecedentIds = antecedent.split(',').map(Number).filter(id => !isNaN(id));
                                        const consequentIds = rule.recommends;

                                        const antecedentBooks = antecedentIds.map(id => bookDetailsMap[id]).filter(Boolean);
                                        const consequentBooks = consequentIds.map(id => bookDetailsMap[id]).filter(Boolean);
                                        
                                        return (
                                            <div key={antecedent} className="border border-gray-200 p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition">
                                                <div className="text-sm font-semibold text-gray-800 mb-2">
                                                    JIKA meminjam:
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {antecedentBooks.map(book => renderBookPill(book, 'antecedent'))}
                                                </div>

                                                <div className="text-sm font-semibold text-gray-800 mb-2">
                                                    MAKA rekomendasikan:
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {consequentBooks.map(book => renderBookPill(book, 'consequent'))}
                                                </div>
                                                
                                                <div className="text-xs text-gray-500 mt-3 border-t pt-2">
                                                    <span className="mr-4">Conf: {(rule.confidence * 100).toFixed(2)}%</span>
                                                    <span>Support: {(rule.support * 100).toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-gray-500">Tidak ada aturan asosiasi yang ditemukan di batch ini.</p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Tampilan Daftar Batch */}
                    {displayContent === 'list' && (
                        <div className="bg-white p-6 rounded-lg shadow-xl">
                            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Daftar Batch Tersedia ({batches.length})</h2>
                            {batches.length === 0 && <p className="text-gray-500">Belum ada batch rekomendasi. Silakan generate dari halaman sebelumnya.</p>}
                            
                            <ul className="divide-y divide-gray-200">
                                {batches.map(batch => (
                                    <li key={batch.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                                        <div className="flex items-center space-x-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${batch.is_active ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                {batch.is_active ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                            <div>
                                                <strong className="text-lg text-gray-800">Batch ID: {batch.id}</strong>
                                                <p className="text-sm text-gray-500">Dibuat: {formatTimestamp(batch.generated_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-3 w-full md:w-auto">
                                            <button 
                                                onClick={() => fetchBatchDetails(batch.id)} 
                                                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                                disabled={isProcessing}
                                            >
                                                <Info className="w-4 h-4 mr-2" />
                                                Detail
                                            </button>
                                            {!batch.is_active && (
                                                <button 
                                                    onClick={() => handleSetBatchActive(batch.id)} 
                                                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition"
                                                    disabled={isProcessing}
                                                >
                                                    <PlayCircle className="w-4 h-4 mr-2" />
                                                    Aktifkan
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteBatch(batch.id)} 
                                                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
                                                disabled={isProcessing || batch.is_active}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Hapus
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}

            {/* Modal Kustom */}
            <ConfirmationModal
                isVisible={showModal}
                title={modalContent.title}
                message={modalContent.message}
                onConfirm={() => {
                    modalContent.action && modalContent.action();
                    // Tidak perlu set showModal(false) di sini, karena akan dilakukan di fungsi action
                }}
                onCancel={() => setShowModal(false)}
                confirmText={modalContent.confirmText}
                confirmColor={modalContent.confirmColor}
            />
        </div>
    );
};

export default RecommendationBatchesPage;