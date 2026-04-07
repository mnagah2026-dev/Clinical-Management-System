"""
Standalone migration script to add missing indexes to existing database tables.
Run this once against a database that was seeded before indexes were added to models.
"""
from sqlalchemy import text
from app.core.database import engine

INDEXES = [
    ("idx_appointments_doctor_id", "appointments", "doctor_id"),
    ("idx_appointments_patient_id", "appointments", "patient_id"),
    ("idx_appointments_status", "appointments", "status"),
    ("idx_vital_signs_patient_id", "vital_signs", "patient_id"),
    ("idx_vital_signs_nurse_id", "vital_signs", "nurse_id"),
    ("idx_medical_records_patient_id", "medical_records", "patient_id"),
    ("idx_medical_records_appointment_id", "medical_records", "appointment_id"),
    ("idx_prescriptions_drug_id", "prescriptions", "drug_id"),
    ("idx_prescriptions_medical_records_id", "prescriptions", "medical_records_id"),
    ("idx_availability_doctor_id", "availability", "doctor_id"),
    ("idx_interactions_drug_a", "interactions", "drug_a"),
    ("idx_interactions_drug_b", "interactions", "drug_b"),
    ("idx_doctors_user_id", "doctors", "user_id"),
    ("idx_doctors_specialization_id", "doctors", "specialization_id"),
    ("idx_nurses_user_id", "nurses", "user_id"),
    ("idx_patients_user_id", "patients", "user_id"),
]

def create_indexes():
    with engine.connect() as conn:
        for idx_name, table, column in INDEXES:
            stmt = text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})")
            try:
                conn.execute(stmt)
                print(f"  ✓ {idx_name} on {table}.{column}")
            except Exception as e:
                print(f"  ✗ {idx_name}: {e}")
        conn.commit()
    print("\nIndex migration complete.")

if __name__ == "__main__":
    create_indexes()
