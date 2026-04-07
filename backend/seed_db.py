import os
import pandas as pd
from sqlalchemy import text
from app.core.database import engine, Base
from app.core.security import get_password_hash
import app.models

# Use an environment variable for the CSV directory, or default to a local 'data/csv' folder.
# Set CSV_DIR=C:\path\to\your\csv\folder before running if the files are external.
CSV_DIR = os.getenv("CSV_DIR", os.path.join(os.path.dirname(__file__), "..", "data", "csv"))

TABLE_FILES = [
    ("users", "users_data.csv"),
    ("specializations", "specializations_data.csv"),
    ("drugs", "drug_data.csv"),
    ("doctors", "doctors_data.csv"),
    ("nurses", "nurses_data.csv"),
    ("patients", "patients_data.csv"),
    ("availability", "availability_data.csv"),
    ("interactions", "interactions_data.csv"),
    ("appointments", "appointments_data.csv"),
    ("vital_signs", "vital_signs_data.csv"),
    ("medical_records", "medical_records_data.csv"),
    ("prescriptions", "prescriptions_data.csv")
]

def seed():
    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    for table_name, csv_file in TABLE_FILES:
        csv_path = os.path.join(CSV_DIR, csv_file)
        print(f"Reading {csv_file}...")
        
        df = pd.read_csv(csv_path)
        
        # Hash plaintext passwords before inserting users
        if table_name == "users" and "hashed_password" in df.columns:
            print("Hashing user passwords (this may take a moment)...")
            df["hashed_password"] = df["hashed_password"].apply(lambda pw: get_password_hash(str(pw)))
        
        print(f"Inserting into {table_name} ({len(df)} rows)...")
        df.to_sql(name=table_name, con=engine, if_exists='append', index=False, chunksize=50000)
            
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed()
