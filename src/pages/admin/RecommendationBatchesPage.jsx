import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const RecommendationBatchesPage = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
    // State baru untuk menyimpan aturan asosiasi
    const [selectedBatchRules, setSelectedBatchRules] = useState(null);
    // State baru untuk menyimpan detail buku
    const [bookDetailsMap, setBookDetailsMap] = useState({});

    const navigate = useNavigate();
    const API_BASE_URL = 'http://localhost:5000/api';

    const getToken = () => {
        const userString = localStorage.getItem('user');
        let token = null;
        if (userString) {
            try {
                const userObject = JSON.parse(userString);
                token = userObject.token;
            } catch (e) {
                console.error("Failed to parse user object from localStorage:", e);
            }
        }
        return token;
    };

    const fetchBatches = async () => {
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
            setBatches(response.data);
        } catch (err) {
            console.error("Error fetching batches:", err);
            setError(err.response?.data?.message || "Failed to fetch recommendation batches.");
        } finally {
            setLoading(false);
        }
    };

    const fetchBookDetails = async (bookIds) => {
        if (!bookIds || bookIds.length === 0) return [];
        try {
            const token = getToken();
            if (!token) throw new Error("No authentication token found.");
            const response = await axios.post(`${API_BASE_URL}/recommendations/books/details-by-ids`, { bookIds }, {
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

            // Pastikan rules_data adalah objek, bukan string
            const rulesData = typeof batchDetail.rules_data === 'string' ? JSON.parse(batchDetail.rules_data) : batchDetail.rules_data;
            setSelectedBatchRules(rulesData);

            // Kumpulkan semua ID buku unik dari aturan untuk diambil detailnya
            const allBookIds = new Set();
            for (const antecedent in rulesData) {
                if (rulesData.hasOwnProperty(antecedent)) {
                    // Tambahkan ID buku dari "jika"
                    const antecedentIds = antecedent.split(',').map(Number).filter(id => !isNaN(id));
                    antecedentIds.forEach(id => allBookIds.add(id));
                    // Tambahkan ID buku dari "maka"
                    rulesData[antecedent].recommends.forEach(id => allBookIds.add(id));
                }
            }

            const bookDetails = await fetchBookDetails(Array.from(allBookIds));
            const newBookDetailsMap = {};
            bookDetails.forEach(book => {
                newBookDetailsMap[book.id] = book;
            });
            setBookDetailsMap(newBookDetailsMap);

        } catch (err) {
            console.error("Error fetching batch details:", err);
            setError(err.response?.data?.message || "Failed to fetch batch details.");
        } finally {
            setLoading(false);
        }
    };

    const handleSetBatchActive = async (batchId) => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            if (!token) {
                navigate('/admin/login');
                return;
            }
            await axios.post(`${API_BASE_URL}/recommendations/batches/${batchId}/set-active`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Batch ${batchId} set as active successfully!`);
            fetchBatches();
            if (selectedBatchDetails && selectedBatchDetails.id === batchId) {
                setSelectedBatchDetails(prev => ({ ...prev, is_active: true }));
            }
        } catch (err) {
            console.error("Error setting batch as active:", err);
            setError(err.response?.data?.message || "Failed to set batch as active.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBatch = async (batchId) => {
        if (!window.confirm(`Are you sure you want to delete Batch ID ${batchId}? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            if (!token) {
                navigate('/admin/login');
                return;
            }
            await axios.delete(`${API_BASE_URL}/recommendations/batches/${batchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Batch ${batchId} deleted successfully!`);
            fetchBatches();
            if (selectedBatchDetails && selectedBatchDetails.id === batchId) {
                setSelectedBatchDetails(null);
                setSelectedBatchRules(null);
                setBookDetailsMap({});
            }
        } catch (err) {
            console.error("Error deleting batch:", err);
            setError(err.response?.data?.message || "Failed to delete batch.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, []);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h2>Recommendation Batches Management</h2>

            {loading && <p>Loading batches...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            <h3>Available Recommendation Batches:</h3>
            {batches.length === 0 && !loading && <p>No recommendation batches found. Please generate some first.</p>}
            
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {batches.map(batch => (
                    <li key={batch.id} style={{ 
                        border: `1px solid ${batch.is_active ? '#28a745' : '#ccc'}`, 
                        backgroundColor: batch.is_active ? '#e9f8e9' : '#f9f9f9',
                        padding: '15px', 
                        marginBottom: '10px', 
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <strong>ID: {batch.id}</strong> - Generated: {format(new Date(batch.generated_at), 'yyyy-MM-dd HH:mm:ss')} 
                            {batch.is_active && <span style={{ color: 'green', fontWeight: 'bold', marginLeft: '10px' }}> (ACTIVE)</span>}
                        </div>
                        <div>
                            <button 
                                onClick={() => fetchBatchDetails(batch.id)} 
                                style={{ marginRight: '10px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                                View Details
                            </button>
                            {!batch.is_active && (
                                <button 
                                    onClick={() => handleSetBatchActive(batch.id)} 
                                    style={{ marginRight: '10px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}
                                >
                                    Set as Active for Students
                                </button>
                            )}
                            <button 
                                onClick={() => handleDeleteBatch(batch.id)} 
                                style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {selectedBatchDetails && (
                <div style={{ marginTop: '30px', borderTop: '2px solid #007bff', paddingTop: '20px' }}>
                    <h3>Details for Batch ID: {selectedBatchDetails.id}</h3>
                    <p><strong>Generated At:</strong> {format(new Date(selectedBatchDetails.generated_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                    <p><strong>Status:</strong> {selectedBatchDetails.is_active ? 'ACTIVE' : 'INACTIVE'}</p>

                    <h4>Association Rules:</h4>
                    {selectedBatchRules && Object.keys(selectedBatchRules).length > 0 ? (
                        Object.keys(selectedBatchRules).map(antecedent => {
                            const rule = selectedBatchRules[antecedent];
                            const antecedentIds = antecedent.split(',').map(Number);
                            const consequentIds = rule.recommends;

                            // Dapatkan detail buku untuk antecedents (jika)
                            const antecedentBooks = antecedentIds.map(id => bookDetailsMap[id]).filter(Boolean);
                            // Dapatkan detail buku untuk consequents (maka)
                            const consequentBooks = consequentIds.map(id => bookDetailsMap[id]).filter(Boolean);
                            
                            return (
                                <div key={antecedent} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#fdfdfd' }}>
                                    <p>
                                        <strong>Jika siswa meminjam:</strong>
                                        {antecedentBooks.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                                                {antecedentBooks.map(book => (
                                                    <span key={book.id} style={{ padding: '5px 10px', backgroundColor: '#e9f8e9', borderRadius: '5px', fontSize: '12px' }}>
                                                        {book.title}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span> (Satu item)</span>
                                        )}
                                    </p>
                                    <p>
                                        <strong>Maka, kemungkinan akan menyukai:</strong>
                                        {consequentBooks.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                                                {consequentBooks.map(book => (
                                                    <span key={book.id} style={{ padding: '5px 10px', backgroundColor: '#f0f8ff', borderRadius: '5px', fontSize: '12px' }}>
                                                        {book.title}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span> (Tidak ada rekomendasi)</span>
                                        )}
                                    </p>
                                    <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                                        Confidence: {(rule.confidence * 100).toFixed(2)}%, Support: {(rule.support * 100).toFixed(2)}%
                                    </p>
                                </div>
                            );
                        })
                    ) : (
                        <p>No association rules found for this batch.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default RecommendationBatchesPage;