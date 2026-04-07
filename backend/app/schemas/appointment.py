from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List

class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: date
    start_time: str
    notes: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str

class Slot(BaseModel):
    start_time: str
    end_time: str

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
