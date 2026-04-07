from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings
import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    phash = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
    pwd = plain_password.encode('utf-8') if isinstance(plain_password, str) else plain_password
    try:
        return bcrypt.checkpw(pwd, phash)
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    pwd = password.encode('utf-8') if isinstance(password, str) else password
    return bcrypt.hashpw(pwd, bcrypt.gensalt(rounds=4)).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt
