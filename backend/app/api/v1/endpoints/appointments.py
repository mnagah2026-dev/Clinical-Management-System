from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.user import User
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentResponse, AppointmentCreate, AppointmentStatusUpdate, Slot
from app.services.scheduler import get_available_slots, get_next_appointment_id

router = APIRouter()

@router.get("/slots", response_model=list[Slot])
def calculate_slots(doctor_id: str, target_date: date, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    patient_id = None
    if current_user.role == "Patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient: patient_id = patient.id
    
    slots = get_available_slots(db, doctor_id, target_date, patient_id)
    return slots

@router.post("/book", response_model=AppointmentResponse)
def book_appointment(appt_data: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments directly")
        
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient: raise HTTPException(status_code=404, detail="Patient profile not found")
        
    slots = get_available_slots(db, appt_data.doctor_id, appt_data.appointment_date, patient.id)
    slot_starts = [s["start_time"] for s in slots]
    
    if appt_data.start_time not in slot_starts:
        raise HTTPException(status_code=400, detail="Time slot is not available or you are restricted from booking the first hour.")
        
    start_dt = datetime.strptime(f"{appt_data.appointment_date} {appt_data.start_time}", "%Y-%m-%d %H:%M")
    end_dt = start_dt + __import__('datetime').timedelta(minutes=10)
    
    new_id = get_next_appointment_id(db)
    appt = Appointment(
        id=new_id,
        patient_id=patient.id,
        doctor_id=appt_data.doctor_id,
        start_time=start_dt,
        end_time=end_dt,
        status="scheduled",
        notes=appt_data.notes
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt

@router.patch("/{appt_id}/status")
def change_status(appt_id: str, status_data: AppointmentStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt: raise HTTPException(status_code=404, detail="Appointment not found")
        
    new_status = status_data.status
    
    if current_user.role == "Patient":
        # Rule 38 limits patient to 'cancelled' only
        if new_status != "cancelled":
             raise HTTPException(status_code=403, detail="Patients can only cancel appointments.")
    else:
        # Rule 38 limits nurse/doctor to change to in-progress or completed or missed 
        valid = ["in-progress", "completed", "missed", "cancelled"]
        if new_status not in valid:
             raise HTTPException(status_code=400, detail="Invalid status transition for staff.")
             
    appt.status = new_status
    db.commit()
    db.refresh(appt)
    return appt
