from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
import redis

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.models.patient import Patient
from app.schemas.user import UserLogin, Token, PatientRegister
from app.core.rate_limit import limiter

router = APIRouter()

try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception:
    redis_client = None

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, str(user.hashed_password)):
         raise HTTPException(
             status_code=status.HTTP_401_UNAUTHORIZED,
             detail="Incorrect email or password",
             headers={"WWW-Authenticate": "Bearer"},
         )
    if not user.is_active:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
         
    # Update last login
    user.last_login = func.now()
    db.commit()
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.capitalize()}, expires_delta=access_token_expires
    )
    
    # Optional: store session in Redis
    if redis_client:
        try:
            redis_client.setex(f"session:{user.id}", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, access_token)
        except Exception as e:
            print(f"Redis integration warning: {e}")
            
    return {"access_token": access_token, "token_type": "bearer", "role": user.role.capitalize()}

@router.post("/register", response_model=Token)
@limiter.limit("5/minute")
def register_patient(request: Request, patient_data: PatientRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(func.lower(User.email) == patient_data.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    from app.utils.id_generator import generate_next_id
    
    new_user_id = generate_next_id(db, User, "1")
    new_patient_id = generate_next_id(db, Patient, "4")
    
    new_user = User(
        id=new_user_id,
        email=patient_data.email,
        hashed_password=get_password_hash(patient_data.password),
        role="Patient",
        is_active=True
    )
    db.add(new_user)
    db.flush()
    
    new_patient = Patient(
        id=new_patient_id,
        user_id=new_user_id,
        first_name=patient_data.first_name,
        last_name=patient_data.last_name,
        date_of_birth=patient_data.date_of_birth,
        gender=patient_data.gender,
        phone=patient_data.phone,
        address=patient_data.address
    )
    db.add(new_patient)
    db.commit()
    
    access_token = create_access_token(
        data={"sub": new_user.id, "role": new_user.role}
    )
    return {"access_token": access_token, "token_type": "bearer", "role": new_user.role}
