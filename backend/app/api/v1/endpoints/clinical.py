from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.user import User
from app.models.vital_signs import VitalSigns
from app.models.medical_records import MedicalRecord
from app.models.prescriptions import Prescription
from app.schemas.clinical import InteractionCheckRequest, InteractionWarning, VitalsSubmit, DiagnosisSubmit
from app.services.clinical import evaluate_interactions
from app.utils.rabbitmq import publish_alert, save_notification

router = APIRouter()

@router.post("/interactions/check", response_model=list[InteractionWarning])
def check_interactions(req: InteractionCheckRequest, db: Session = Depends(get_db)):
    """Check permutations of drugs for critical interaction severities based on drug names."""
    warnings = evaluate_interactions(db, req.drug_names)
    return warnings

@router.post("/vitals")
def submit_vitals(vitals: VitalsSubmit, db: Session = Depends(get_db), current_user: User = Depends(require_role("Nurse"))):
    """Nurses log vitals for a patient."""
    
    from app.utils.id_generator import generate_next_id
    new_id = generate_next_id(db, VitalSigns, "7")
    
    # Compute Visit Number
    visits = db.query(VitalSigns).filter(VitalSigns.patient_id == vitals.patient_id).count()
    visit_number = visits + 1
    
    vs = VitalSigns(
        id=new_id,
        patient_id=vitals.patient_id,
        nurse_id=vitals.nurse_id,
        weight=vitals.weight,
        height=vitals.height,
        systolic=vitals.blood_pressure_systolic,
        diastolic=vitals.blood_pressure_diastolic,
        blood_sugar=vitals.blood_sugar,
        temperature=vitals.temperature,
        visit_number=visit_number,
        measured_at=vitals.measured_at,
        notes=vitals.notes
    )
    db.add(vs)
    db.commit()
    db.refresh(vs)
    
    publish_alert("cms_alerts", {"type": "vitals_logged", "patient_id": vitals.patient_id, "nurse_id": vitals.nurse_id})
    from app.models.appointment import Appointment
    from app.models.doctor import Doctor
    from sqlalchemy import func
    from datetime import date
    appt = db.query(Appointment).filter(Appointment.patient_id == vitals.patient_id, func.date(Appointment.start_time) == date.today()).first()
    if appt:
        doc = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
        if doc:
            save_notification(db, doc.user_id, f"Vitals logged for patient {vitals.patient_id}", "vitals_logged")
            db.commit()
    return vs

@router.post("/diagnosis")
def submit_diagnosis(diag: DiagnosisSubmit, db: Session = Depends(get_db), current_user: User = Depends(require_role("Doctor"))):
    """Doctors finalize diagnosis and issue prescriptions."""
    
    from app.utils.id_generator import generate_next_id
    new_record_id = generate_next_id(db, MedicalRecord, "8")
    
    record = MedicalRecord(
        id=new_record_id,
        patient_id=diag.patient_id,
        appointment_id=diag.appointment_id,
        diagnosis=diag.diagnosis,
        disease_severity=diag.disease_severity,
        notes=diag.notes
    )
    db.add(record)
    db.flush()
    
    # 2. Safety Intercept: Check interactions on prescribed drugs before committing
    drug_names = [p.treatment for p in diag.prescriptions]
    warnings = evaluate_interactions(db, drug_names)
    
    critical_errors = [w for w in warnings if w.severity.lower() == "major" or w.severity.lower() == "severe"]
    if critical_errors:
        db.rollback()
        raise HTTPException(status_code=400, detail={
            "error": "Critical drug interaction detected.", 
            "conflicts": [w.model_dump() for w in critical_errors]
        })
    
    from app.models.drugs import Drug
    from sqlalchemy import func
    from app.utils.id_generator import generate_next_id
    
    for idx, pres in enumerate(diag.prescriptions):
        new_p_id = generate_next_id(db, Prescription, "9")
        
        # Try to find corresponding drug ID by matching treatment name
        matched_drug = db.query(Drug).filter(func.lower(Drug.Generic_Name) == pres.treatment.strip().lower()).first()
        
        if not matched_drug:
            # Drug not found in database — skip this prescription and warn
            import logging
            logging.warning(f"Drug '{pres.treatment}' not found in drugs table — skipping prescription.")
            continue

        prescription = Prescription(
            id=new_p_id,
            medical_records_id=new_record_id,
            drug_id=matched_drug.id,
            dosage=pres.dosage,
            treatment=pres.treatment
        )
        db.add(prescription)
        db.flush()
    db.commit()
    publish_alert("cms_alerts", {"type": "diagnosis_complete", "patient_id": diag.patient_id, "doctor_id": diag.doctor_id, "warnings": len(warnings)})
    from app.models.patient import Patient
    patient = db.query(Patient).filter(Patient.id == diag.patient_id).first()
    if patient:
        save_notification(db, patient.user_id, "Your diagnosis has been recorded.", "diagnosis_complete")
        db.commit()
    
    return {"message": "Diagnosis successfully recorded.", "record_id": new_record_id, "minor_warnings": [w.model_dump() for w in warnings]}
