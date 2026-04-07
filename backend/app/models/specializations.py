from sqlalchemy import Column, String
from app.core.database import Base

class Specialization(Base):
    __tablename__ = "specializations"
    id = Column(String(255), primary_key=True, index=True)
    specialization = Column(String(255))
