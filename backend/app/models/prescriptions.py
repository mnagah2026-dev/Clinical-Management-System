from sqlalchemy import Column, String, DateTime, ForeignKey, func
from app.core.database import Base

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(String(255), primary_key=True, index=True)
    drug_id = Column(String(255), ForeignKey("drugs.id"), index=True)
    medical_records_id = Column(String(255), ForeignKey("medical_records.id"), index=True)
    treatment = Column(String(1000), nullable=True)
    dosage = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
