"""Portal API endpoints — doctors, patients, nurses, admin."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.dependencies import get_current_active_user, require_role
from app.models.user import User
from app.models.doctor import Doctor
from app.models.nurse import Nurse
from app.models.patient import Patient
from app.models.specializations import Specialization
from app.models.availability import Availability
from app.models.appointment import Appointment
from app.models.vital_signs import VitalSigns
from app.models.medical_records import MedicalRecord
from app.models.prescriptions import Prescription
from app.models.drugs import Drug

router = APIRouter()

# ────────── SPECIALIZATIONS ──────────
@router.get("/specializations")
def list_specializations(db: Session = Depends(get_db)):
    specs = db.query(Specialization).all()
    return [{"id": s.id, "name": s.specialization} for s in specs]

# ────────── DOCTORS ──────────
@router.get("/doctors")
def list_doctors(specialty: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Doctor, Specialization.specialization).outerjoin(Specialization, Doctor.specialization_id == Specialization.id)
    if specialty:
        q = q.filter(Doctor.specialization_id == specialty)
    if search:
        q = q.filter(or_(Doctor.first_name.ilike(f"%{search}%"), Doctor.last_name.ilike(f"%{search}%")))
    doctors = q.limit(100).all()
    return [{"id": d.id, "first_name": d.first_name, "last_name": d.last_name,
             "phone": d.phone, "specialization_id": d.specialization_id,
             "specialization_name": sname, "license_number": d.license_number} for d, sname in doctors]

# ────────── DRUGS ──────────
@router.get("/drugs")
def list_drugs(db: Session = Depends(get_db)):
    drugs = db.query(Drug).all()
    return [{"id": d.id, "name": d.Generic_Name, "description": d.Pharmacologic_category} for d in drugs]

# ────────── PATIENT PORTAL ──────────
@router.get("/patients/me")
def get_my_patient_profile(db: Session = Depends(get_db), current_user: User = Depends(require_role("Patient"))):
    p = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return {"id": p.id, "first_name": p.first_name, "last_name": p.last_name,
            "date_of_birth": str(p.date_of_birth), "gender": p.gender,
            "phone": p.phone, "address": p.address, "email": current_user.email}

from app.schemas.portal import PatientProfileUpdate
@router.patch("/patients/me")
def update_my_patient_profile(updates: PatientProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Patient"))):
    p = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    # Rule 27: Patient can change first_name, last_name, date_of_birth, gender, phone, address
    update_data = updates.model_dump(exclude_unset=True)
    for key in ["first_name", "last_name", "date_of_birth", "gender", "phone", "address"]:
        if key in update_data:
            setattr(p, key, update_data[key])
    # Email update on the User record
    if "email" in update_data and update_data["email"]:
        existing = db.query(User).filter(func.lower(User.email) == update_data["email"].lower(), User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = update_data["email"]
    if "password" in update_data and update_data["password"]:
        current_user.hashed_password = get_password_hash(update_data["password"])
    db.commit()
    return {"message": "Profile updated"}

@router.get("/patients/me/appointments")
def my_appointments(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("Patient"))):
    p = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not p:
        return []
    q = db.query(Appointment, Doctor.first_name, Doctor.last_name).outerjoin(Doctor, Appointment.doctor_id == Doctor.id).filter(Appointment.patient_id == p.id)
    if status:
        q = q.filter(Appointment.status == status)
    appts = q.order_by(Appointment.start_time.desc()).limit(50).all()
    return [{"id": a.id, "doctor_id": a.doctor_id, "doctor_name": f"Dr. {fn} {ln}",
             "start_time": str(a.start_time), "end_time": str(a.end_time),
             "status": a.status, "notes": a.notes} for a, fn, ln in appts]

@router.get("/patients/me/records")
def my_records(db: Session = Depends(get_db), current_user: User = Depends(require_role("Patient"))):
    p = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not p:
        return []
    records = db.query(MedicalRecord, Appointment, Doctor.first_name, Doctor.last_name)\
                .outerjoin(Appointment, MedicalRecord.appointment_id == Appointment.id)\
                .outerjoin(Doctor, Appointment.doctor_id == Doctor.id)\
                .filter(MedicalRecord.patient_id == p.id).order_by(MedicalRecord.created_at.desc()).limit(50).all()
    results = []
    for r, a, fn, ln in records:
        prescriptions = db.query(Prescription, Drug.Generic_Name).outerjoin(Drug, Prescription.drug_id == Drug.id).filter(Prescription.medical_records_id == r.id).all()
        results.append({
            "id": r.id, "doctor_name": f"Dr. {fn} {ln}" if fn else "Unknown", 
            "diagnosis": r.diagnosis, "disease_severity": r.disease_severity,
            "treatment_plan": r.notes, "created_at": str(r.created_at),
            "prescriptions": [{"drug_name": dn, "dosage": pr.dosage, "frequency": pr.treatment,
                               "start_date": "", "end_date": ""} for pr, dn in prescriptions]
        })
    return results

@router.get("/patients/me/vitals")
def my_vitals(db: Session = Depends(get_db), current_user: User = Depends(require_role("Patient"))):
    """Patient's own vital signs history for charting."""
    p = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not p:
        return []
    vitals = db.query(VitalSigns).filter(VitalSigns.patient_id == p.id).order_by(VitalSigns.measured_at.desc()).limit(50).all()
    return [{"id": v.id, "weight": v.weight, "height": v.height,
             "blood_pressure_systolic": v.systolic,
             "blood_pressure_diastolic": v.diastolic,
             "blood_sugar": v.blood_sugar, "temperature": v.temperature,
             "visit_number": v.visit_number, "measured_at": str(v.measured_at)} for v in vitals]

# ────────── DOCTOR PORTAL ──────────
@router.get("/doctors/me")
def get_my_doctor_profile(db: Session = Depends(get_db), current_user: User = Depends(require_role("Doctor"))):
    d = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    spec = db.query(Specialization).filter(Specialization.id == d.specialization_id).first()
    return {"id": d.id, "first_name": d.first_name, "last_name": d.last_name,
            "phone": d.phone, "specialization_name": spec.specialization if spec else None,
            "license_number": d.license_number, "email": current_user.email}

from app.schemas.portal import DoctorProfileUpdate
@router.patch("/doctors/me")
def update_my_doctor_profile(updates: DoctorProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Doctor"))):
    """Rule 28: Doctor can update first_name, last_name, phone, email, password."""
    d = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    update_data = updates.model_dump(exclude_unset=True)
    for key in ["first_name", "last_name", "phone"]:
        if key in update_data:
            setattr(d, key, update_data[key])
    if "email" in update_data and update_data["email"]:
        existing = db.query(User).filter(func.lower(User.email) == update_data["email"].lower(), User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = update_data["email"]
    if "password" in update_data and update_data["password"]:
        current_user.hashed_password = get_password_hash(update_data["password"])
    db.commit()
    return {"message": "Profile updated"}

@router.get("/doctors/me/appointments")
def doctor_appointments(target_date: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("Doctor"))):
    d = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not d:
        return []
    q = db.query(Appointment, Patient.first_name, Patient.last_name).outerjoin(Patient, Appointment.patient_id == Patient.id).filter(Appointment.doctor_id == d.id)
    if target_date:
        q = q.filter(func.date(Appointment.start_time) == target_date)
    appts = q.order_by(Appointment.start_time.asc()).limit(100).all()
    results = []
    for a, fn, ln in appts:
        # Rule 8: Include disease_severity for priority sorting
        latest_record = db.query(MedicalRecord.disease_severity).filter(
            MedicalRecord.patient_id == a.patient_id
        ).order_by(MedicalRecord.created_at.desc()).first()
        severity = latest_record[0] if latest_record else None
        results.append({
            "id": a.id, "patient_id": a.patient_id, "patient_name": f"{fn} {ln}",
            "start_time": str(a.start_time), "end_time": str(a.end_time),
            "status": a.status, "notes": a.notes, "disease_severity": severity
        })
    return results

@router.get("/doctors/me/patients/{patient_id}/records")
def doctor_view_patient_records(patient_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("Doctor"))):
    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).order_by(MedicalRecord.created_at.desc()).limit(50).all()
    results = []
    for r in records:
        prescriptions = db.query(Prescription, Drug.Generic_Name).outerjoin(Drug, Prescription.drug_id == Drug.id).filter(Prescription.medical_records_id == r.id).all()
        results.append({
            "id": r.id, "diagnosis": r.diagnosis, "treatment_plan": r.notes,
            "disease_severity": r.disease_severity, "created_at": str(r.created_at),
            "prescriptions": [{"drug_name": dn, "dosage": pr.dosage, "frequency": pr.treatment} for pr, dn in prescriptions]
        })
    return results

# ────────── DOCTOR DIRECTORY ──────────
@router.get("/doctors/{doctor_id}")
def get_doctor(doctor_id: str, db: Session = Depends(get_db)):
    d = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found")
    spec = db.query(Specialization).filter(Specialization.id == d.specialization_id).first()
    avails = db.query(Availability).filter(Availability.doctor_id == d.id, Availability.is_available == True).all()
    return {
        "id": d.id, "first_name": d.first_name, "last_name": d.last_name,
        "phone": d.phone, "specialization_name": spec.specialization if spec else None,
        "license_number": d.license_number,
        "availability": [{"day": a.day_of_week, "start": str(a.start_time), "end": str(a.end_time)} for a in avails]
    }

# ────────── NURSE PORTAL ──────────
@router.get("/nurses/me")
def get_my_nurse_profile(db: Session = Depends(get_db), current_user: User = Depends(require_role("Nurse"))):
    n = db.query(Nurse).filter(Nurse.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nurse profile not found")
    return {"id": n.id, "first_name": n.first_name, "last_name": n.last_name,
            "phone": n.phone, "license_number": n.license_number, "email": current_user.email}

from app.schemas.portal import NurseProfileUpdate
@router.patch("/nurses/me")
def update_my_nurse_profile(updates: NurseProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Nurse"))):
    """Rule 28: Nurse can update first_name, last_name, phone, email, password."""
    n = db.query(Nurse).filter(Nurse.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nurse profile not found")
    update_data = updates.model_dump(exclude_unset=True)
    for key in ["first_name", "last_name", "phone"]:
        if key in update_data:
            setattr(n, key, update_data[key])
    if "email" in update_data and update_data["email"]:
        existing = db.query(User).filter(func.lower(User.email) == update_data["email"].lower(), User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = update_data["email"]
    if "password" in update_data and update_data["password"]:
        current_user.hashed_password = get_password_hash(update_data["password"])
    db.commit()
    return {"message": "Profile updated"}

@router.get("/nurses/me/schedule")
def nurse_schedule(target_date: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("Nurse"))):
    td = target_date or str(date.today())
    appts = db.query(Appointment, Patient.first_name, Patient.last_name, Doctor.first_name, Doctor.last_name).outerjoin(Patient, Appointment.patient_id == Patient.id).outerjoin(Doctor, Appointment.doctor_id == Doctor.id).filter(func.date(Appointment.start_time) == td).order_by(Appointment.start_time.asc()).limit(200).all()
    return [{"id": a.id, "patient_name": f"{pfn} {pln}", "doctor_name": f"Dr. {dfn} {dln}",
             "start_time": str(a.start_time), "status": a.status} for a, pfn, pln, dfn, dln in appts]

# ────────── NOTIFICATIONS ──────────
@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.models.notification import Notification
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return [{"id": n.id, "message": n.message, "type": n.type,
             "is_read": n.is_read, "created_at": str(n.created_at)} for n in notifs]

@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.models.notification import Notification
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}

# ────────── PATIENT SEARCH (Doctor/Nurse) ──────────
@router.get("/patients/search")
def search_patients(q: str = "", db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if not current_user.role or current_user.role.lower() not in ["doctor", "nurse", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    patients = db.query(Patient).filter(or_(Patient.first_name.ilike(f"%{q}%"), Patient.last_name.ilike(f"%{q}%"), Patient.id.ilike(f"%{q}%"))).limit(20).all()
    return [{"id": p.id, "first_name": p.first_name, "last_name": p.last_name,
             "date_of_birth": str(p.date_of_birth), "gender": p.gender} for p in patients]

@router.get("/patients/{patient_id}/vitals")
def patient_vitals(patient_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if not current_user.role or current_user.role.lower() not in ["doctor", "nurse", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    vitals = db.query(VitalSigns).filter(VitalSigns.patient_id == patient_id).order_by(VitalSigns.measured_at.desc()).limit(20).all()
    return [{"id": v.id, "weight": v.weight, "height": v.height,
             "blood_pressure_systolic": v.systolic,
             "blood_pressure_diastolic": v.diastolic,
             "blood_sugar": v.blood_sugar, "temperature": v.temperature,
             "visit_number": v.visit_number, "measured_at": str(v.measured_at)} for v in vitals]

# ────────── ADMIN PORTAL ──────────
@router.get("/admin/users")
def admin_list_users(role: Optional[str] = None, is_active: Optional[bool] = None, search: Optional[str] = None, page: int = 1, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    if search:
        q = q.filter(or_(User.email.ilike(f"%{search}%"), User.id.ilike(f"%{search}%")))
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * 25).limit(25).all()
    return {"total": total, "page": page, "users": [
        {"id": u.id, "email": u.email, "role": u.role, "is_active": u.is_active,
         "created_at": str(u.created_at), "last_login": str(u.last_login) if u.last_login else None} for u in users
    ]}

from app.schemas.portal import AdminUserUpdate
@router.patch("/admin/users/{user_id}")
def admin_update_user(user_id: str, updates: AdminUserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = updates.model_dump(exclude_unset=True)
    if user_id == current_user.id and "is_active" in update_data and not update_data["is_active"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    for key in ["role", "is_active", "email"]:
        if key in update_data:
            setattr(user, key, update_data[key])
    db.commit()
    return {"message": "User updated"}

from app.schemas.portal import AdminUserCreate
@router.post("/admin/users")
def admin_create_user(payload: AdminUserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    data = payload.model_dump()
    existing = db.query(User).filter(func.lower(User.email) == data["email"].lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    from app.utils.id_generator import generate_next_id
    new_id = generate_next_id(db, User, "1")
    new_user = User(id=new_id, email=data["email"], hashed_password=get_password_hash(data.get("password", "CMS@default123")),
                    role=data["role"], is_active=True)
    db.add(new_user)
    if data["role"].lower() == "doctor":
        from app.utils.id_generator import generate_next_id
        d_id = generate_next_id(db, Doctor, "2")
        doc = Doctor(id=d_id, user_id=new_id, first_name=data.get("first_name",""), last_name=data.get("last_name",""),
                     specialization_id=data.get("specialization_id"), license_number=data.get("license_number",""))
        db.add(doc)
    elif data["role"].lower() == "nurse":
        from app.utils.id_generator import generate_next_id
        n_id = generate_next_id(db, Nurse, "3")
        nurse = Nurse(id=n_id, user_id=new_id, first_name=data.get("first_name",""), last_name=data.get("last_name",""),
                      phone=data.get("phone",""), license_number=data.get("license_number",""))
        db.add(nurse)
    db.flush()
    db.commit()
    return {"message": "User created", "id": new_id}

@router.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    today = date.today()
    # Enhanced with specialty distribution and weekly breakdown
    spec_counts = db.query(Specialization.specialization, func.count(Doctor.id))\
        .outerjoin(Doctor, Doctor.specialization_id == Specialization.id)\
        .group_by(Specialization.specialization).all()
    return {
        "total_doctors": db.query(Doctor).count(),
        "total_nurses": db.query(Nurse).count(),
        "total_patients": db.query(Patient).count(),
        "total_users": db.query(User).filter(User.is_active == True).count(),
        "appointments_today": db.query(Appointment).filter(func.date(Appointment.start_time) == today).count(),
        "scheduled_today": db.query(Appointment).filter(func.date(Appointment.start_time) == today, Appointment.status == "scheduled").count(),
        "completed_today": db.query(Appointment).filter(func.date(Appointment.start_time) == today, Appointment.status == "completed").count(),
        "cancelled_today": db.query(Appointment).filter(func.date(Appointment.start_time) == today, Appointment.status == "cancelled").count(),
        "specialty_distribution": [{"name": name, "count": cnt} for name, cnt in spec_counts],
    }

@router.get("/admin/health")
def admin_health_check(current_user: User = Depends(require_role("Admin"))):
    """Real health check for Redis and RabbitMQ services."""
    redis_ok = False
    rabbitmq_ok = False
    try:
        import redis
        r = redis.Redis(host="localhost", port=6379, socket_connect_timeout=2)
        r.ping()
        redis_ok = True
    except Exception:
        pass
    try:
        import pika
        conn = pika.BlockingConnection(pika.ConnectionParameters(host="localhost", connection_attempts=1, retry_delay=0, socket_timeout=2))
        conn.close()
        rabbitmq_ok = True
    except Exception:
        pass
    return {"redis": "online" if redis_ok else "offline", "rabbitmq": "online" if rabbitmq_ok else "offline"}

# ────────── ADMIN: SPECIALIZATION CRUD (Rule 32) ──────────
from app.schemas.portal import SpecializationCreate
@router.post("/admin/specializations")
def admin_create_specialization(payload: SpecializationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    data = payload.model_dump()
    from app.utils.id_generator import generate_next_id
    new_id = generate_next_id(db, Specialization, "12")
    new_spec = Specialization(id=new_id, specialization=data["name"])
    db.add(new_spec)
    db.commit()
    return {"message": "Specialization created", "id": new_spec.id, "name": new_spec.specialization}

@router.delete("/admin/specializations/{spec_id}")
def admin_delete_specialization(spec_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    spec = db.query(Specialization).filter(Specialization.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Specialization not found")
    # Safety check — don't delete if doctors use it
    linked = db.query(Doctor).filter(Doctor.specialization_id == spec_id).count()
    if linked > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {linked} doctors use this specialization")
    db.delete(spec)
    db.commit()
    return {"message": "Specialization deleted"}

# ────────── ADMIN: SCHEDULE MANAGEMENT (Rules 13+17) ──────────
@router.get("/admin/availability/{doctor_id}")
def admin_get_availability(doctor_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    avails = db.query(Availability).filter(Availability.doctor_id == doctor_id).all()
    return [{"id": a.id, "day_of_week": a.day_of_week, "start_time": str(a.start_time),
             "end_time": str(a.end_time), "is_available": a.is_available} for a in avails]

from app.schemas.portal import AvailabilityCreate
@router.post("/admin/availability")
def admin_create_availability(payload: AvailabilityCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    data = payload.model_dump()
    from app.utils.id_generator import generate_next_id
    new_id = generate_next_id(db, Availability, "5")
    from datetime import time as dt_time
    new_avail = Availability(
        id=new_id,
        doctor_id=data["doctor_id"],
        day_of_week=data["day_of_week"].lower(),
        start_time=dt_time.fromisoformat(data["start_time"]),
        end_time=dt_time.fromisoformat(data["end_time"]),
        is_available=data.get("is_available", True)
    )
    db.add(new_avail)
    db.commit()
    return {"message": "Availability created", "id": new_avail.id}

from app.schemas.portal import AvailabilityUpdate
@router.patch("/admin/availability/{avail_id}")
def admin_update_availability(avail_id: str, updates: AvailabilityUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role("Admin"))):
    avail = db.query(Availability).filter(Availability.id == avail_id).first()
    if not avail:
        raise HTTPException(status_code=404, detail="Availability not found")
    update_data = updates.model_dump(exclude_unset=True)
    if "is_available" in update_data:
        avail.is_available = update_data["is_available"]
    if "start_time" in update_data:
        from datetime import time as dt_time
        avail.start_time = dt_time.fromisoformat(update_data["start_time"])
    if "end_time" in update_data:
        from datetime import time as dt_time
        avail.end_time = dt_time.fromisoformat(update_data["end_time"])
    db.commit()
    return {"message": "Availability updated"}
