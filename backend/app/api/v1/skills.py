import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import (
    Skill, SkillLesson, LessonVideo, SkillNote, UserNote,
    DiscoverySkill, Discovery
)
from app.schemas import (
    SkillLearnResponse, LessonVideoResponse, SkillNoteResponse,
    UserNoteResponse, UserNoteUpdate
)

router = APIRouter(prefix="/skills", tags=["Skills & Learning"])

@router.get("/{skill_id}/learn", response_model=SkillLearnResponse)
def get_skill_learn(
    skill_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    # Prerequisites
    prereqs = [p.slug for p in skill.prerequisites] if skill.prerequisites else []

    # Lesson overview & mini-project
    overview = skill.description or ""
    mini_project = None
    if skill.lesson:
        overview = skill.lesson.overview
        mini_project = skill.lesson.mini_project
    elif not skill.is_curated:
        # Suggested skill fallback: abstract-based overview
        disc_skill = db.query(DiscoverySkill).filter(DiscoverySkill.skill_id == skill.id).first()
        if disc_skill and disc_skill.discovery:
            overview = disc_skill.discovery.summary or disc_skill.discovery.why_it_matters or "Extracted from research literature."

    # Videos: STRICT GATE — only return videos with verified == True (Rule 8)
    verified_videos = db.query(LessonVideo).filter(
        LessonVideo.skill_id == skill.id,
        LessonVideo.verified == True
    ).order_by(LessonVideo.position.asc()).all()

    video_responses = [
        LessonVideoResponse(
            id=v.id,
            youtube_id=v.youtube_id,
            title=v.title,
            channel=v.channel,
            verified=v.verified,
            verified_on=v.verified_on,
            position=v.position
        )
        for v in verified_videos
    ]

    # Study Notes: STRICT GATE — only return approved notes (Rule 10, 11)
    approved_note = db.query(SkillNote).filter(
        SkillNote.skill_id == skill.id,
        SkillNote.status == "approved"
    ).order_by(SkillNote.reviewed_at.desc()).first()

    study_note_resp = None
    if approved_note:
        study_note_resp = SkillNoteResponse(
            id=approved_note.id,
            content_md=approved_note.content_md,
            origin=approved_note.origin,
            status=approved_note.status,
            label="AI-generated study notes, reviewed"
        )

    return SkillLearnResponse(
        skill_id=skill.id,
        slug=skill.slug,
        name=skill.name,
        difficulty=skill.difficulty,
        prerequisites=prereqs,
        overview=overview,
        mini_project=mini_project,
        videos=video_responses,
        study_notes=study_note_resp,
        is_curated=skill.is_curated
    )

@router.get("/{skill_id}/notes/me", response_model=UserNoteResponse)
def get_user_skill_note(
    skill_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    note = db.query(UserNote).filter(
        UserNote.user_id == user_id,
        UserNote.skill_id == skill.id
    ).first()

    if not note:
        return UserNoteResponse(
            skill_id=skill.id,
            content="",
            updated_at=datetime.now(timezone.utc)
        )

    return UserNoteResponse(
        skill_id=note.skill_id,
        content=note.content,
        updated_at=note.updated_at
    )

@router.put("/{skill_id}/notes/me", response_model=UserNoteResponse)
def update_user_skill_note(
    skill_id: uuid.UUID,
    payload: UserNoteUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    note = db.query(UserNote).filter(
        UserNote.user_id == user_id,
        UserNote.skill_id == skill.id
    ).first()

    now = datetime.now(timezone.utc)
    if not note:
        note = UserNote(
            user_id=user_id,
            skill_id=skill.id,
            content=payload.content,
            updated_at=now
        )
        db.add(note)
    else:
        note.content = payload.content
        note.updated_at = now

    db.commit()
    db.refresh(note)

    return UserNoteResponse(
        skill_id=note.skill_id,
        content=note.content,
        updated_at=note.updated_at
    )
