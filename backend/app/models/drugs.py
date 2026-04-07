from sqlalchemy import Column, String
from app.core.database import Base

class Drug(Base):
    __tablename__ = "drugs"
    id = Column(String(255), primary_key=True, index=True)
    Generic_Name = Column(String(500))
    Pharmacologic_category = Column(String(500), nullable=True)
    WHO_AWaRe = Column(String(255), nullable=True)
