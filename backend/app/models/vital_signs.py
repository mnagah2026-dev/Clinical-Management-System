from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, func
from app.core.database import Base

class VitalSigns(Base):
    __tablename__ = "vital_signs"
    id = Column(String(255), primary_key=True, index=True)
    patient_id = Column(String(255), ForeignKey("patients.id"), index=True)
    nurse_id = Column(String(255), ForeignKey("nurses.id"), index=True)
    systolic = Column(Integer, nullable=True)
    diastolic = Column(Integer, nullable=True)
    blood_sugar = Column(Integer, nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    notes = Column(String(1000), nullable=True)
    visit_number = Column(Integer)
    measured_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
