from pydantic import BaseModel
from typing import Optional
from datetime import date

# ══════════ Profile Updates ══════════
class PatientProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class DoctorProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class NurseProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

# ══════════ Admin Operations ══════════
class AdminUserCreate(BaseModel):
    email: str
    password: Optional[str] = "CMS@default123"
    role: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    phone: Optional[str] = ""
    specialization_id: Optional[str] = None
    license_number: Optional[str] = ""

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    email: Optional[str] = None

class SpecializationCreate(BaseModel):
    name: str

class AvailabilityCreate(BaseModel):
    doctor_id: str
    day_of_week: str
    start_time: str
    end_time: str
    is_available: Optional[bool] = True

class AvailabilityUpdate(BaseModel):
    is_available: Optional[bool] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
