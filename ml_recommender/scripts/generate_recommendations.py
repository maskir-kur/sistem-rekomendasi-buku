# ml_recommender/scripts/generate_recommendations_apriori.py

import pandas as pd
import mysql.connector
import json
import os
from dotenv import load_dotenv
import sys
from mlxtend.frequent_patterns import apriori
from mlxtend.frequent_patterns import association_rules

# Memuat variabel lingkungan dari file .env
load_dotenv()

# Konfigurasi Database - SESUAIKAN DENGAN KREDENSIAL DATABASE ANDA
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'sistem_rekomendasi_buku')
}

def fetch_data():
    """
    Mengambil data peminjaman dari database.
    """
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT student_id, book_id, DATE(borrow_date) as borrow_date
            FROM borrows
            WHERE return_date IS NOT NULL
        """)
        data = cursor.fetchall()
        return pd.DataFrame(data)
    except mysql.connector.Error as err:
        print(f"Error fetching data from database: {err}", file=sys.stderr)
        return pd.DataFrame()
    finally:
        if conn:
            conn.close()


def generate_recommendations_apriori(df, min_support=0.4, min_confidence=0.5):
    """
    Menghasilkan rekomendasi buku menggunakan aturan asosiasi (Support-Confidence).
    Output: Dictionary berisi aturan asosiasi.
    """

    # Validasi kolom wajib
    if df.empty or 'student_id' not in df.columns or 'book_id' not in df.columns or 'borrow_date' not in df.columns:
        print("DataFrame is empty or missing required columns (student_id, book_id, borrow_date).", file=sys.stderr)
        return {"recommendation_rules": {}}

    # 1. Buat transaction_id (gabungan student_id + tanggal peminjaman)
    df["transaction_id"] = df["student_id"].astype(str) + "_" + df["borrow_date"].astype(str)

    # 2. Ubah ke format basket (one-hot encoding)
    basket = (df.groupby(['transaction_id', 'book_id'])
              .size()
              .unstack(fill_value=0)
              .applymap(lambda x: 1 if x > 0 else 0))

    if basket.empty:
        print("Basket dataframe is empty. Not enough interaction data.", file=sys.stderr)
        return {"recommendation_rules": {}}

    # 3. Cari frequent itemsets
    frequent_itemsets = apriori(basket, min_support=min_support, use_colnames=True)

    if frequent_itemsets.empty:
        print("No frequent itemsets found with the given min_support.", file=sys.stderr)
        return {"recommendation_rules": {}}

    # 4. Buat association rules
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)

    if rules.empty:
        print("No association rules found with the given min_confidence.", file=sys.stderr)
        return {"recommendation_rules": {}}

    # 5. Simpan hasil aturan ke dictionary
    recommendation_rules = {}
    for index, row in rules.iterrows():
        antecedent_books = [int(book_id) for book_id in row['antecedents']]
        consequent_books = [int(book_id) for book_id in row['consequents']]
        
        key = ",".join(map(str, sorted(antecedent_books)))
        
        if key not in recommendation_rules:
            recommendation_rules[key] = {
                "recommends": consequent_books,
                "confidence": float(row['confidence']),
                "support": float(row['support'])
            }
        else:
            # Gabungkan jika ada aturan dengan antecedents sama
            existing_recs = set(recommendation_rules[key]["recommends"])
            new_recs = set(consequent_books)
            recommendation_rules[key]["recommends"] = list(existing_recs.union(new_recs))

    return {"recommendation_rules": recommendation_rules}

if __name__ == '__main__':
    print("Fetching data and generating recommendations using Apriori...", file=sys.stderr)
    data = fetch_data()
    recs_data = generate_recommendations_apriori(data)
    print(json.dumps(recs_data, indent=2))
    print("Recommendation generation complete.", file=sys.stderr)