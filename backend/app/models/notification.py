from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(255), primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey("users.id"), index=True)
    message = Column(String(2000))
    type = Column(String(100))  # appointment_cancelled, assistance_requested, vitals_logged
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
