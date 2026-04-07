from sqlalchemy import Column, String, Time, Boolean, ForeignKey
from app.core.database import Base

class Availability(Base):
    __tablename__ = "availability"
    id = Column(String(255), primary_key=True, index=True)
    doctor_id = Column(String(255), ForeignKey("doctors.id"), index=True)
    day_of_week = Column(String(50))
    start_time = Column(Time)
    end_time = Column(Time)
    is_available = Column(Boolean, default=True)
