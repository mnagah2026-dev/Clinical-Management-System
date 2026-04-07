"""
Integration tests for the auth API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.rate_limit import limiter

TEST_DATABASE_URL = "sqlite:///./test_api.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

class TestRegistration:
    def test_register_new_patient(self):
        response = client.post("/api/v1/auth/register", json={
            "email": "newpatient@test.com",
            "password": "Test1234!",
            "first_name": "John",
            "last_name": "Doe",
            "date_of_birth": "1990-05-15",
            "gender": "Male",
            "phone": "+201234567890",
            "address": "Cairo, Egypt"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "Patient"

    def test_duplicate_email_rejected(self):
        # Register first time
        client.post("/api/v1/auth/register", json={
            "email": "duplicate@test.com", "password": "Test1234!",
            "first_name": "A", "last_name": "B",
            "date_of_birth": "1990-01-01", "gender": "Male"
        })
        # Try same email again
        response = client.post("/api/v1/auth/register", json={
            "email": "duplicate@test.com", "password": "Test1234!",
            "first_name": "C", "last_name": "D",
            "date_of_birth": "1990-01-01", "gender": "Male"
        })
        assert response.status_code == 400

    def test_password_validation_length(self):
        response = client.post("/api/v1/auth/register", json={
            "email": "shortpass@test.com",
            "password": "short",
            "first_name": "A",
            "last_name": "B",
            "date_of_birth": "1990-01-01",
            "gender": "Male"
        })
        assert response.status_code == 422

class TestLogin:
    def test_login_wrong_password(self):
        # Register
        client.post("/api/v1/auth/register", json={
            "email": "login@test.com", "password": "CorrectPass!",
            "first_name": "A", "last_name": "B",
            "date_of_birth": "1990-01-01", "gender": "Male"
        })
        # Login with wrong password
        response = client.post("/api/v1/auth/login", json={
            "email": "login@test.com", "password": "WrongPass!"
        })
        assert response.status_code == 401

    def test_rate_limit_login(self):
        email = "rate_limit@test.com"
        
        # Reset limiter storage so previous tests don't count against bucket
        if hasattr(limiter, "_storage"):
             limiter._storage.reset()
        
        # 5 allowed requests
        for _ in range(5):
            response = client.post("/api/v1/auth/login", json={
                "email": email, "password": "WrongPassword!"
            })
            assert response.status_code == 401
            
        # 6th should be blocked by rate limit
        response = client.post("/api/v1/auth/login", json={
            "email": email, "password": "WrongPassword!"
        })
        assert response.status_code == 429
