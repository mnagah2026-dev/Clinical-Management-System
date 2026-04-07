"""
Tests for the drug interaction safety engine.
"""
from app.services.clinical import evaluate_interactions

class TestDrugInteractions:
    """Test evaluate_interactions() from services/clinical.py"""

    def test_detects_major_interaction(self, db, sample_drugs):
        """Warfarin + Aspirin should trigger a Major warning."""
        warnings = evaluate_interactions(db, ["Warfarin", "Aspirin"])
        assert len(warnings) == 1
        assert warnings[0].severity == "Major"

    def test_no_interaction_for_safe_drugs(self, db, sample_drugs):
        """Warfarin + Paracetamol should have no interaction."""
        warnings = evaluate_interactions(db, ["Warfarin", "Paracetamol"])
        assert len(warnings) == 0

    def test_single_drug_returns_empty(self, db, sample_drugs):
        """A single drug can't have interactions."""
        warnings = evaluate_interactions(db, ["Warfarin"])
        assert len(warnings) == 0

    def test_empty_list_returns_empty(self, db, sample_drugs):
        """Empty drug list should return no warnings."""
        warnings = evaluate_interactions(db, [])
        assert len(warnings) == 0

    def test_unknown_drug_ignored(self, db, sample_drugs):
        """Unknown drugs should not crash the system."""
        warnings = evaluate_interactions(db, ["Warfarin", "NonExistentDrug123"])
        assert len(warnings) == 0

    def test_case_insensitive(self, db, sample_drugs):
        """Drug names should match regardless of case."""
        warnings = evaluate_interactions(db, ["warfarin", "ASPIRIN"])
        assert len(warnings) == 1
