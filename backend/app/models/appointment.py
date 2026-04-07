from sqlalchemy import Column, String, DateTime, ForeignKey, func
from app.core.database import Base

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(String(255), primary_key=True, index=True)
    patient_id = Column(String(255), ForeignKey("patients.id"), index=True)
    doctor_id = Column(String(255), ForeignKey("doctors.id"), index=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String(50), index=True)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
