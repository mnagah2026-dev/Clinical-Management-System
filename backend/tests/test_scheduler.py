"""
Tests for the appointment scheduler logic.
"""
from datetime import time, date
from app.services.scheduler import generate_slots, is_previous_patient
from app.models.availability import Availability
from app.models.appointment import Appointment
from app.models.medical_records import MedicalRecord

class TestSlotGeneration:
    """Test generate_slots() from services/scheduler.py"""

    def test_10min_intervals(self):
        """09:00-10:00 should produce 6 slots of 10 minutes each."""
        slots = generate_slots(time(9, 0), time(10, 0), 10)
        assert len(slots) == 6
        assert slots[0]["start_time"] == "09:00"
        assert slots[5]["start_time"] == "09:50"

    def test_empty_when_equal(self):
        """Same start and end should produce 0 slots."""
        slots = generate_slots(time(9, 0), time(9, 0), 10)
        assert len(slots) == 0

    def test_partial_interval(self):
        """09:00-09:15 with 10min intervals = 1 slot only."""
        slots = generate_slots(time(9, 0), time(9, 15), 10)
        assert len(slots) == 1

class TestPreviousPatient:
    """Test is_previous_patient() from services/scheduler.py"""

    def test_returns_false_for_new_patient(self, db):
        """New patient with no records should return False."""
        result = is_previous_patient(db, "4_999", "2_1")
        assert result is False

    def test_returns_true_for_existing_patient(self, db):
        """Patient with completed appointment + record should return True."""
        from app.models.patient import Patient
        from app.models.doctor import Doctor
        from app.models.user import User
        from datetime import datetime

        # Setup: create user, patient, doctor, appointment, record
        user = User(id="1_100", email="test@test.com", hashed_password="x", role="Patient", is_active=True)
        doc_user = User(id="1_101", email="doc@test.com", hashed_password="x", role="Doctor", is_active=True)
        db.add_all([user, doc_user])
        db.flush()

        patient = Patient(id="4_100", user_id="1_100", first_name="Test", last_name="Patient",
                          date_of_birth=date(1990, 1, 1), gender="Male")
        doctor = Doctor(id="2_100", user_id="1_101", first_name="Dr", last_name="Smith",
                        license_number="LIC001")
        db.add_all([patient, doctor])
        db.flush()

        appt = Appointment(id="6_100", patient_id="4_100", doctor_id="2_100",
                           start_time=datetime(2025, 1, 1, 9, 0),
                           end_time=datetime(2025, 1, 1, 9, 10), status="completed")
        db.add(appt)
        db.flush()

        record = MedicalRecord(id="8_100", patient_id="4_100", appointment_id="6_100",
                               diagnosis="Test diagnosis")
        db.add(record)
        db.commit()

        result = is_previous_patient(db, "4_100", "2_100")
        assert result is True
