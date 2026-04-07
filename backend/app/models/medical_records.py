from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func
from app.core.database import Base

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(String(255), primary_key=True, index=True)
    patient_id = Column(String(255), ForeignKey("patients.id"), index=True)
    appointment_id = Column(String(255), ForeignKey("appointments.id"), index=True)
    diagnosis = Column(String(2000), nullable=True)
    disease_severity = Column(Integer, nullable=True)
    notes = Column(String(2000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
