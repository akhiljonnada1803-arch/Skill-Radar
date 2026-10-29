import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import User, StudentProfile, Domain
from app.schemas import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("", response_model=ProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if not profile:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(id=user_id, email=f"user-{user_id.hex[:6]}@skillradar.demo")
            db.add(user)
            db.flush()

        default_domain = db.query(Domain).filter(Domain.slug == "ai-engineering").first()
        profile = StudentProfile(
            user_id=user_id,
            display_name="Demo Student",
            selected_domain_id=default_domain.id if default_domain else None,
            experience_level="beginner",
            career_goal="AI Systems Engineer",
            interests=["AI agents", "LLMs", "FastAPI"],
            current_skills=["python", "git"],
            weekly_study_minutes=300
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return ProfileResponse(
        user_id=profile.user_id,
        display_name=profile.display_name,
        selected_domain_id=profile.selected_domain_id,
        selected_domain_slug=profile.selected_domain.slug if profile.selected_domain else None,
        experience_level=profile.experience_level,
        career_goal=profile.career_goal,
        interests=profile.interests or [],
        current_skills=profile.current_skills or [],
        weekly_study_minutes=profile.weekly_study_minutes or 300,
        updated_at=profile.updated_at
    )

@router.put("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "selected_domain_id" in update_data and update_data["selected_domain_id"] is not None:
        domain = db.query(Domain).filter(Domain.id == update_data["selected_domain_id"]).first()
        if not domain:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected domain does not exist")

    for field, val in update_data.items():
        if val is not None:
            setattr(profile, field, val)

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        user_id=profile.user_id,
        display_name=profile.display_name,
        selected_domain_id=profile.selected_domain_id,
        selected_domain_slug=profile.selected_domain.slug if profile.selected_domain else None,
        experience_level=profile.experience_level,
        career_goal=profile.career_goal,
        interests=profile.interests or [],
        current_skills=profile.current_skills or [],
        weekly_study_minutes=profile.weekly_study_minutes or 300,
        updated_at=profile.updated_at
    )
