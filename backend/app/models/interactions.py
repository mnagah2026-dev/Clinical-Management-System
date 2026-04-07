from sqlalchemy import Column, String, ForeignKey
from app.core.database import Base

class Interaction(Base):
    __tablename__ = "interactions"
    id = Column(String(255), primary_key=True, index=True)
    drug_a = Column(String(255), ForeignKey("drugs.id"), index=True)
    drug_b = Column(String(255), ForeignKey("drugs.id"), index=True)
    severity = Column(String(255))
    description = Column(String(2000), nullable=True)
    management = Column(String(2000), nullable=True)
