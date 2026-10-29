from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import Domain, DomainSkill
from app.schemas import DomainResponse

router = APIRouter(prefix="/domains", tags=["Domains"])

@router.get("", response_model=List[DomainResponse])
def get_domains(db: Session = Depends(get_db)):
    domains = db.query(Domain).order_by(Domain.created_at.asc()).all()
    results = []
    for d in domains:
        count = db.query(DomainSkill).filter(DomainSkill.domain_id == d.id).count()
        results.append(DomainResponse(
            id=d.id,
            slug=d.slug,
            name=d.name,
            description=d.description,
            icon=d.icon,
            skill_count=count
        ))
    return results
