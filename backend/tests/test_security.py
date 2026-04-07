"""
Tests for authentication and security functions.
"""
from app.core.security import verify_password, get_password_hash, create_access_token
from jose import jwt
from app.core.config import settings

class TestPasswordHashing:
    def test_hash_and_verify(self):
        """Hashed password should verify correctly."""
        hashed = get_password_hash("MySecureP@ss123")
        assert verify_password("MySecureP@ss123", hashed) is True

    def test_wrong_password_fails(self):
        """Wrong password should not verify."""
        hashed = get_password_hash("CorrectPassword")
        assert verify_password("WrongPassword", hashed) is False

    def test_hash_is_different_each_time(self):
        """Two hashes of same password should differ (random salt)."""
        h1 = get_password_hash("same")
        h2 = get_password_hash("same")
        assert h1 != h2

class TestJWT:
    def test_token_contains_subject(self):
        """Token should contain the 'sub' claim."""
        token = create_access_token(data={"sub": "1_1", "role": "Patient"})
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == "1_1"
        assert payload["role"] == "Patient"

    def test_token_has_expiration(self):
        """Token should have an 'exp' claim."""
        token = create_access_token(data={"sub": "1_1"})
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert "exp" in payload
