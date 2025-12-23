import pandas as pd
import mysql.connector
import os
from dotenv import load_dotenv
from mlxtend.frequent_patterns import apriori, association_rules

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

def fetch_data():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT student_id, book_id, DATE(borrow_date) AS borrow_date
        FROM borrows
        WHERE return_date IS NOT NULL
    """)

    data = cursor.fetchall()
    conn.close()
    return pd.DataFrame(data)

def generate_recommendations_apriori(
    min_support=0.4,
    min_confidence=0.5
):
    df = fetch_data()

    if df.empty:
        return {}

    df["transaction_id"] = (
        df["student_id"].astype(str) + "_" + df["borrow_date"].astype(str)
    )

    basket = (
        df.groupby(["transaction_id", "book_id"])
        .size()
        .unstack(fill_value=0)
        .applymap(lambda x: 1 if x > 0 else 0)
    )

    frequent_itemsets = apriori(
        basket, min_support=min_support, use_colnames=True
    )

    if frequent_itemsets.empty:
        return {}

    rules = association_rules(
        frequent_itemsets,
        metric="confidence",
        min_threshold=min_confidence
    )

    recommendations = {}

    for _, row in rules.iterrows():
        antecedents = sorted(map(int, row["antecedents"]))
        consequents = list(map(int, row["consequents"]))

        key = ",".join(map(str, antecedents))
        recommendations[key] = {
            "recommends": consequents,
            "confidence": float(row["confidence"]),
            "support": float(row["support"])
        }

    return recommendations
