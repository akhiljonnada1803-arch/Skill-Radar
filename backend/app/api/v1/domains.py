import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_optional_user_id
from app.models import Domain, DomainSkill, Roadmap, RoadmapItem
from app.schemas import DomainResponse

router = APIRouter(prefix="/domains", tags=["Domains"])

@router.get("", response_model=List[DomainResponse])
def get_domains(
    db: Session = Depends(get_db),
    user_id: Optional[uuid.UUID] = Depends(get_optional_user_id)
):
    domains = db.query(Domain).order_by(Domain.created_at.asc()).all()
    results = []
    for d in domains:
        count = db.query(DomainSkill).filter(DomainSkill.domain_id == d.id).count()
        completed = 0
        if user_id:
            roadmap = db.query(Roadmap).filter(
                Roadmap.user_id == user_id,
                Roadmap.domain_id == d.id
            ).first()
            if roadmap:
                completed = db.query(RoadmapItem).filter(
                    RoadmapItem.roadmap_id == roadmap.id,
                    RoadmapItem.status == "done"
                ).count()

        results.append(DomainResponse(
            id=d.id,
            slug=d.slug,
            name=d.name,
            description=d.description,
            icon=d.icon,
            skill_count=count,
            completed_count=completed
        ))
    return results
