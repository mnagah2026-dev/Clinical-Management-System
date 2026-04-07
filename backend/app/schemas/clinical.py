from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

class InteractionCheckRequest(BaseModel):
    drug_names: List[str]

class InteractionWarning(BaseModel):
    drug_a: str
    drug_b: str
    severity: str
    description: str
    management: str

class VitalsSubmit(BaseModel):
    patient_id: str
    nurse_id: str
    weight: float
    height: float
    blood_pressure_systolic: int
    blood_pressure_diastolic: int
    blood_sugar: int
    temperature: float
    measured_at: datetime
    notes: Optional[str] = None

class PrescriptionReq(BaseModel):
    treatment: str
    dosage: str

class DiagnosisSubmit(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_id: str
    diagnosis: str
    disease_severity: int
    notes: str
    prescriptions: List[PrescriptionReq] = []
