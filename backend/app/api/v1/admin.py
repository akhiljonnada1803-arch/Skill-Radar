from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_admin_token
from app.schemas import IngestionTriggerRequest, IngestionRunResponse
from app.services.ingestion.runner import IngestionManager

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/ingest", response_model=List[IngestionRunResponse])
def trigger_ingestion(
    payload: IngestionTriggerRequest,
    db: Session = Depends(get_db),
    _token: str = Depends(verify_admin_token)
):
    """
    Protected HTTP trigger for ingestion (AGENTS.md Rule 18, T2.7).
    Requires X-Admin-Token header.
    """
    manager = IngestionManager(db)
    runs = manager.run_all(source_filter=payload.source)
    return [
        IngestionRunResponse(
            run_id=r.id,
            status=r.status,
            items_fetched=r.items_fetched,
            items_failed=r.items_failed,
            error_summary=r.error_summary
        )
        for r in runs
    ]
