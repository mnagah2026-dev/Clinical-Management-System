from datetime import datetime, timedelta, date, time
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.availability import Availability
from app.models.appointment import Appointment
from app.models.medical_records import MedicalRecord

def is_previous_patient(db: Session, patient_id: str, doctor_id: str) -> bool:
    """Checks if the patient has a completed appointment/record with the doctor."""
    record = db.query(MedicalRecord).join(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.doctor_id == doctor_id,
        Appointment.status == "completed"
    ).first()
    return record is not None

def generate_slots(start: time, end: time, interval_minutes: int = 10):
    slots = []
    # Convert to minutes from midnight
    curr = start.hour * 60 + start.minute
    end_min = end.hour * 60 + end.minute
    while curr + interval_minutes <= end_min:
        s_time = f"{curr // 60:02d}:{curr % 60:02d}"
        e_time = f"{(curr + interval_minutes) // 60:02d}:{(curr + interval_minutes) % 60:02d}"
        slots.append({"start_time": s_time, "end_time": e_time})
        curr += interval_minutes
    return slots

def get_available_slots(db: Session, doctor_id: str, target_date: date, patient_id: str = None) -> list:
    day_mapping = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}
    day_str = day_mapping[target_date.weekday()]
    
    # Needs to match database string matching for day_of_week
    # Assuming the database uses "mon", "tue", etc. Ensure lower-case.
    avails = db.query(Availability).filter(
        Availability.doctor_id == doctor_id,
        func.lower(Availability.day_of_week) == day_str,
        Availability.is_available == True
    ).all()
    
    if not avails:
        return []
        
    booked = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        func.date(Appointment.start_time) == target_date,
        Appointment.status.in_(["scheduled", "in-progress"])
    ).all()
    
    booked_times = [appt.start_time.strftime("%H:%M") for appt in booked]
    
    has_history = False
    if patient_id:
         has_history = is_previous_patient(db, patient_id, doctor_id)
         
    available_slots = []
    for avail in avails:
        all_slots = generate_slots(avail.start_time, avail.end_time, 10)
        
        # Calculate first hour bounds
        shift_start = avail.start_time.hour * 60 + avail.start_time.minute
        shift_first_hour_end = shift_start + 60
        
        for slot in all_slots:
            slot_start_min = int(slot["start_time"].split(":")[0]) * 60 + int(slot["start_time"].split(":")[1])
            is_first_hour = slot_start_min < shift_first_hour_end
            
            # Rule 16 & 41: First hour reserved for patients with history
            if is_first_hour and not has_history:
                continue
                
            if slot["start_time"] not in booked_times:
                available_slots.append(slot)
                
    return available_slots

def get_next_appointment_id(db: Session):
    q = db.query(Appointment.id).filter(Appointment.id.like("6_%")).all()
    max_id = max([int(i[0].split('_')[1]) for i in q]) if q else 0
    return f"6_{max_id + 1}"
