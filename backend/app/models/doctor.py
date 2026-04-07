from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(String(255), primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey("users.id"), index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    phone = Column(String(50), nullable=True)
    specialization_id = Column(String(255), ForeignKey("specializations.id"), index=True)
    license_number = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
