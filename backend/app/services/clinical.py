import itertools
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.interactions import Interaction
from app.schemas.clinical import InteractionWarning

from sqlalchemy import func
from app.models.drugs import Drug

def evaluate_interactions(db: Session, drug_names: list[str]) -> list[InteractionWarning]:
    """Generates unique pairs and queries the Interactions table to return warnings based on drug names."""
    warnings = []
    
    if not drug_names or len(drug_names) < 2:
        return warnings
        
    # Make names case insensitive and strip whitespace
    cleaned_names = [name.strip().lower() for name in drug_names if name.strip()]
    if not cleaned_names:
         return warnings

    # Query Drugs table for matching names
    matched_drugs = db.query(Drug).filter(func.lower(Drug.Generic_Name).in_(cleaned_names)).all()
    drug_ids = [d.id for d in matched_drugs]
    
    # Must have at least two matched drugs to evaluate interactions
    if len(drug_ids) < 2:
        return warnings
        
    pairs = list(itertools.combinations(drug_ids, 2))
    
    for pair in pairs:
        drug_a_id, drug_b_id = pair
        
        # Check both ordering permutations
        interaction = db.query(Interaction).filter(
            or_(
                and_(Interaction.drug_a == drug_a_id, Interaction.drug_b == drug_b_id),
                and_(Interaction.drug_a == drug_b_id, Interaction.drug_b == drug_a_id)
            )
        ).first()
        
        if interaction:
            warnings.append(InteractionWarning(
                drug_a=drug_a_id,
                drug_b=drug_b_id,
                severity=interaction.severity,
                description=interaction.description,
                management=interaction.management
            ))
            
    return warnings
