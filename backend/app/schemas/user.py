from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class PatientRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    date_of_birth: date
    gender: str
    phone: Optional[str] = None
    address: Optional[str] = None
