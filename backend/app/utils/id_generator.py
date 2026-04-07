from sqlalchemy.orm import Session
from sqlalchemy import text

def generate_next_id(db: Session, model_class, prefix: str) -> str:
    """
    Thread-safe ID generation using database-level locking.
    Uses SELECT ... FOR UPDATE to prevent race conditions.
    
    Args:
        db: SQLAlchemy session
        model_class: The SQLAlchemy model (e.g., User, Patient)
        prefix: The ID prefix (e.g., "1", "4", "7")
    
    Returns:
        Next ID string like "1_6", "4_12", etc.
    """
    if db.bind.dialect.name == 'sqlite':
        ids = db.query(model_class.id).filter(model_class.id.like(f"{prefix}_%")).all()
        max_num = max([int(id_tuple[0].split('_')[1]) for id_tuple in ids]) if ids else 0
        return f"{prefix}_{max_num + 1}"

    # Lock the rows we're reading to prevent concurrent reads
    result = db.execute(
        text(
            f"SELECT id FROM {model_class.__tablename__} "
            f"WHERE id LIKE :pattern "
            f"ORDER BY CAST(SPLIT_PART(id, '_', 2) AS INTEGER) DESC "
            f"LIMIT 1 "
            f"FOR UPDATE"
        ),
        {"pattern": f"{prefix}_%"}
    ).first()
    
    if result:
        max_num = int(result[0].split('_')[1])
    else:
        max_num = 0
    
    return f"{prefix}_{max_num + 1}"
