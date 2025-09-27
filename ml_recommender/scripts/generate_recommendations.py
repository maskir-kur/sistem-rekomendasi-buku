import pandas as pd
import mysql.connector
import json
import os
import sys
import numpy as np
from dotenv import load_dotenv
from mlxtend.frequent_patterns import apriori
from mlxtend.frequent_patterns import association_rules
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize 

# --- KONFIGURASI DAN KONEKSI DATABASE ---
load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'sistem_rekomendasi_buku')
}

def get_db_connection():
    """Membuat koneksi ke database."""
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}", file=sys.stderr)
        sys.exit(1)

def fetch_raw_data():
    """Mengambil data peminjaman mentah untuk Klasterisasi."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        # Hanya ambil data yang diperlukan untuk klasterisasi
        cursor.execute("""
            SELECT student_id, book_id, DATE(borrow_date) as borrow_date
            FROM borrows
            WHERE return_date IS NOT NULL
        """)
        data = cursor.fetchall()
        return pd.DataFrame(data)
    finally:
        if conn: conn.close()

def fetch_data_with_clusters():
    """Mengambil data peminjaman digabung dengan hasil klasterisasi."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                b.student_id, 
                b.book_id, 
                DATE(b.borrow_date) as borrow_date,
                cr.cluster_id
            FROM borrows b
            JOIN cluster_recommendations cr ON b.student_id = cr.student_id
            WHERE b.return_date IS NOT NULL
        """)
        data = cursor.fetchall()
        return pd.DataFrame(data)
    finally:
        if conn: conn.close()

# --- FUNGSI K-MEANS CLUSTERING ---

def perform_kmeans_clustering(df_borrows, n_clusters=5):
    """
    Melakukan klasterisasi K-Means pada siswa berdasarkan pola peminjaman biner.
    """
    if df_borrows.empty:
        return pd.DataFrame()

    print(f"Preparing data for K-Means with {len(df_borrows['student_id'].unique())} students...", file=sys.stderr)

    # 1. Pivot Data menjadi Matriks Siswa-Buku (Binary)
    student_book_matrix = (df_borrows.groupby(['student_id', 'book_id'])
                             .size()
                             .unstack(fill_value=0)
                             .applymap(lambda x: 1 if x > 0 else 0))
    
    student_ids = student_book_matrix.index.values

    # 2. Scaling/Normalisasi L2
    data_normalized = normalize(student_book_matrix, norm='l2', axis=1)

    # 3. K-Means
    try:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
        kmeans.fit(data_normalized)
        
        # 4. Simpan Hasil Klaster
        cluster_df = pd.DataFrame({
            'student_id': student_ids,
            'cluster_id': kmeans.labels_
        })
        
        return cluster_df
    except ValueError as e:
        print(f"Error during K-Means: {e}. Check if n_clusters is too high or data is insufficient.", file=sys.stderr)
        return pd.DataFrame()

def save_cluster_data(cluster_df):
    """
    Menyimpan hasil klasterisasi siswa ke tabel 'cluster_recommendations'.
    """
    if cluster_df.empty:
        print("Cluster DataFrame is empty, skipping save.", file=sys.stderr)
        return

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute("TRUNCATE TABLE cluster_recommendations")
        
        sql = "INSERT INTO cluster_recommendations (student_id, cluster_id) VALUES (%s, %s)"
        
        data_to_insert = [
            (int(row[0]), int(row[1])) 
            for row in cluster_df[['student_id', 'cluster_id']].values
        ]
        
        cursor.executemany(sql, data_to_insert)
        conn.commit()
        print(f"Successfully saved {len(cluster_df)} student cluster assignments.", file=sys.stderr)

    except mysql.connector.Error as err:
        print(f"Error saving cluster data: {err}", file=sys.stderr)
    finally:
        if conn: conn.close()

# --- FUNGSI APRIORI BERULANG PER KLASTER (REVISI FORMAT JSON) ---

def generate_segmented_apriori(df, min_support=0.01, min_confidence=0.5):
    """
    Menghasilkan aturan asosiasi menggunakan Apriori secara berulang untuk setiap klaster.
    """
    if df.empty or 'cluster_id' not in df.columns:
        return pd.DataFrame()

    all_recommendation_rules = []
    unique_clusters = df['cluster_id'].unique()
    print(f"Processing {len(unique_clusters)} unique clusters for Apriori...", file=sys.stderr)

    for cluster_id in unique_clusters:
        print(f"\n--- Running Apriori for Cluster ID: {cluster_id} ---", file=sys.stderr)
        
        # 1. Filter data untuk cluster saat ini
        df_cluster = df[df['cluster_id'] == cluster_id].copy()

        # 2. Buat transaction_id: student_id + tanggal
        df_cluster["transaction_id"] = df_cluster["student_id"].astype(str) + "_" + df_cluster["borrow_date"].astype(str)

        # 3. Ubah ke format basket (one-hot encoding)
        basket = (df_cluster.groupby(['transaction_id', 'book_id'])
                              .size()
                              .unstack(fill_value=0)
                              .applymap(lambda x: 1 if x > 0 else 0))
        basket = basket.astype(bool)
        if basket.empty:
            print(f"Basket empty for Cluster {cluster_id}.", file=sys.stderr)
            continue
            
        # 4. Cari frequent itemsets
        frequent_itemsets = apriori(basket, min_support=min_support, use_colnames=True)
        
        if frequent_itemsets.empty:
            print(f"No frequent itemsets found for Cluster {cluster_id}. Try lowering min_support.", file=sys.stderr)
            continue
        
        # 5. Buat association rules
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
        
        if rules.empty:
            print(f"No association rules found for Cluster {cluster_id}. Try lowering min_confidence.", file=sys.stderr)
            continue
            
        # 6. Tambahkan cluster_id ke setiap aturan
        rules['cluster_id'] = int(cluster_id)
        
        # 7. Format kolom untuk penyimpanan database
        # --- PERBAIKAN KRITIS DI SINI: SORT dan SEPARATORS untuk konsistensi JSON string ---
        rules['antecedent'] = rules['antecedents'].apply(
            lambda x: json.dumps(sorted([int(i) for i in x]), separators=(',', ':'))
        )
        rules['consequent'] = rules['consequents'].apply(
            lambda x: json.dumps(sorted([int(i) for i in x]), separators=(',', ':'))
        )
        
        # Pilih kolom yang relevan dan gabungkan
        all_recommendation_rules.append(
            rules[['cluster_id', 'antecedent', 'consequent', 'confidence', 'support']]
        )

    if not all_recommendation_rules:
        return pd.DataFrame()
        
    return pd.concat(all_recommendation_rules)

def save_recommendation_rules(rules_df):
    """Menyimpan aturan asosiasi per klaster ke tabel 'recommendation_batches'."""
    if rules_df.empty:
        print("Rules DataFrame is empty, skipping save.", file=sys.stderr)
        return

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Hapus data lama
        cursor.execute("TRUNCATE TABLE recommendation_batches")
        
        # Siapkan SQL
        sql = """
        INSERT INTO recommendation_batches (cluster_id, antecedent, consequent, confidence, support) 
        VALUES (%s, %s, %s, %s, %s)
        """
        
        # Data untuk disisipkan
        data_to_insert = [
            (
                row['cluster_id'],
                row['antecedent'], 
                row['consequent'], 
                row['confidence'],
                row['support']
            )
            for index, row in rules_df.iterrows()
        ]
        
        cursor.executemany(sql, data_to_insert)
        conn.commit()
        print(f"Successfully saved {len(rules_df)} segmented recommendation rules.", file=sys.stderr)

    finally:
        if conn: conn.close()

# --- MAIN EXECUTION ---

if __name__ == '__main__':
    # Tentukan jumlah cluster (K) yang optimal. Bisa berdasarkan Elbow/Silhouette Score.
    N_CLUSTERS = 5 
    # Sesuaikan nilai ini jika Anda masih mendapatkan 'No frequent itemsets found'
    MIN_SUPPORT = 0.01 
    # Sesuaikan nilai ini jika Anda masih mendapatkan 'No association rules found'
    MIN_CONFIDENCE = 0.5 
    
    # 1. FASE K-MEANS: KLasterisasi Siswa
    print("--- FASE 1: K-MEANS CLUSTERING ---", file=sys.stderr)
    raw_data = fetch_raw_data()
    
    if raw_data.empty:
        print("No raw data to process. Exiting.", file=sys.stderr)
        sys.exit(1)
        
    cluster_data = perform_kmeans_clustering(raw_data, n_clusters=N_CLUSTERS)
    save_cluster_data(cluster_data)
    
    # 2. FASE APRIORI: Generasi Aturan Per Klaster
    print("\n--- FASE 2: SEGMENTED APRIORI ---", file=sys.stderr)
    data_for_apriori = fetch_data_with_clusters()

    if data_for_apriori.empty:
        print("No clustered data found. Check the cluster_recommendations table.", file=sys.stderr)
        sys.exit(1)
        
    rules_df = generate_segmented_apriori(
        data_for_apriori, 
        min_support=MIN_SUPPORT, 
        min_confidence=MIN_CONFIDENCE
    )
    
    # 3. FASE PENYIMPANAN
    print("\n--- FASE 3: SAVING RESULTS ---", file=sys.stderr)
    save_recommendation_rules(rules_df)
    
    print("\n[SUCCESS] Hybrid Recommendation Generation Complete.", file=sys.stderr)