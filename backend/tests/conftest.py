"""
Shared test fixtures — in-memory SQLite database for fast testing.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base

# Use in-memory SQLite for tests (fast, no setup needed)
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def sample_drugs(db):
    """Insert sample drugs for interaction testing."""
    from app.models.drugs import Drug
    from app.models.interactions import Interaction

    drug_a = Drug(id="10_1", Generic_Name="Warfarin", Pharmacologic_category="Anticoagulant")
    drug_b = Drug(id="10_2", Generic_Name="Aspirin", Pharmacologic_category="NSAID")
    drug_c = Drug(id="10_3", Generic_Name="Paracetamol", Pharmacologic_category="Analgesic")

    db.add_all([drug_a, drug_b, drug_c])
    db.flush()

    # Warfarin + Aspirin = Major interaction
    interaction = Interaction(
        id="11_1", drug_a="10_1", drug_b="10_2",
        severity="Major",
        description="Increased bleeding risk",
        management="Avoid concurrent use"
    )
    db.add(interaction)
    db.commit()

    return {"warfarin": drug_a, "aspirin": drug_b, "paracetamol": drug_c}
