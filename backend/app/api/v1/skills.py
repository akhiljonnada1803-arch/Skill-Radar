import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import (
    Skill, SkillLesson, LessonVideo, SkillNote, UserNote,
    DiscoverySkill, Discovery, ChapterTask, TaskSubmission
)
from app.schemas import (
    SkillLearnResponse, LessonVideoResponse, SkillNoteResponse,
    UserNoteResponse, UserNoteUpdate,
    ChapterTaskResponse, TaskSubmissionResponse, TaskSubmissionRequest
)

router = APIRouter(prefix="/skills", tags=["Skills & Learning"])

def _get_skill_or_404(skill_id: str, db: Session) -> Skill:
    try:
        val_uuid = uuid.UUID(skill_id)
        skill = db.query(Skill).filter((Skill.id == val_uuid) | (Skill.slug == skill_id)).first()
    except ValueError:
        skill = db.query(Skill).filter(Skill.slug == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill

@router.get("/{skill_id}/learn", response_model=SkillLearnResponse)
def get_skill_learn(
    skill_id: str,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = _get_skill_or_404(skill_id, db)

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

    # Primary Video for Lecture Grounding
    primary_video = verified_videos[0] if verified_videos else None
    video_info = {
        "title": primary_video.title,
        "channel": primary_video.channel,
        "youtube_id": primary_video.youtube_id
    } if primary_video else None

    # Fetch Reports, Mindmaps, and Spaced-Repetition Flashcards Grounded in Video
    from app.services.study_materials import study_materials_service
    materials = study_materials_service.get_materials_for_skill(
        slug=skill.slug,
        name=skill.name,
        description=skill.description or "",
        overview=overview,
        video_info=video_info
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
        report=materials.get("report"),
        mindmap=materials.get("mindmap", []),
        flashcards=materials.get("flashcards", []),
        is_curated=skill.is_curated
    )

@router.post("/{skill_id}/synthesize", response_model=SkillLearnResponse)
def synthesize_chapter_materials(
    skill_id: str,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = _get_skill_or_404(skill_id, db)

    overview = skill.lesson.overview if skill.lesson else (skill.description or "")
    mini_project = skill.lesson.mini_project if skill.lesson else None
    prereqs = [p.slug for p in skill.prerequisites] if skill.prerequisites else []

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

    approved_note = db.query(SkillNote).filter(
        SkillNote.skill_id == skill.id,
        SkillNote.status == "approved"
    ).order_by(SkillNote.reviewed_at.desc()).first()

    study_note_resp = None
    notes_md = None
    if approved_note:
        notes_md = approved_note.content_md
        study_note_resp = SkillNoteResponse(
            id=approved_note.id,
            content_md=approved_note.content_md,
            origin=approved_note.origin,
            status=approved_note.status,
            label="AI-generated study notes, reviewed"
        )

    # Primary Video for Lecture Grounding
    primary_video = verified_videos[0] if verified_videos else None
    video_info = {
        "title": primary_video.title,
        "channel": primary_video.channel,
        "youtube_id": primary_video.youtube_id
    } if primary_video else None

    # Run NotebookLM Grounded Synthesis Engine
    from app.services.study_materials import study_materials_service
    materials = study_materials_service.synthesize_live_materials(
        slug=skill.slug,
        name=skill.name,
        description=skill.description or "",
        overview=overview,
        notes_md=notes_md,
        context=f"Domain: {skill.category or 'Software Engineering'}",
        video_info=video_info
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
        report=materials.get("report"),
        mindmap=materials.get("mindmap", []),
        flashcards=materials.get("flashcards", []),
        is_curated=skill.is_curated
    )

@router.get("/{skill_id}/notes/me", response_model=UserNoteResponse)
def get_user_skill_note(
    skill_id: str,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = _get_skill_or_404(skill_id, db)

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
    skill_id: str,
    payload: UserNoteUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = _get_skill_or_404(skill_id, db)

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

@router.get("/{skill_id}/task", response_model=ChapterTaskResponse)
def get_chapter_task(
    skill_id: str,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = _get_skill_or_404(skill_id, db)

    task = db.query(ChapterTask).filter(ChapterTask.skill_id == skill.id).first()
    if not task:
        # Auto-create practical chapter task if none exists yet
        task = ChapterTask(
            skill_id=skill.id,
            title=f"Mission: {skill.name} Applied Mastery",
            description=f"Implement and demonstrate core practical mechanics for {skill.name}.",
            instructions_md=f"### Objective\nBuild a verified practical module demonstrating hands-on mastery of **{skill.name}**.\n\n### Acceptance Criteria\n1. Implement the required functions or components with clean modular syntax.\n2. Ensure proper exception trapping and defensive boundaries.\n3. Align with production engineering best practices.",
            starter_code=f"// Chapter Mission: {skill.name}\n// Implement your solution below:\n\n",
            rubric=[
                {"criterion": "Core Mechanics & Correctness", "weight": 40, "description": "Accurate functional implementation"},
                {"criterion": "Defensive Trapping & Reliability", "weight": 30, "description": "Error handling and edge case resilience"},
                {"criterion": "Code Quality & Idiomatic Style", "weight": 30, "description": "Clean modular architecture"}
            ],
            difficulty=skill.difficulty
        )
        db.add(task)
        db.commit()
        db.refresh(task)

    # Fetch latest submission for this user
    latest_sub = db.query(TaskSubmission).filter(
        TaskSubmission.task_id == task.id,
        TaskSubmission.user_id == user_id
    ).order_by(TaskSubmission.created_at.desc()).first()

    latest_sub_resp = None
    if latest_sub:
        latest_sub_resp = TaskSubmissionResponse(
            id=latest_sub.id,
            task_id=latest_sub.task_id,
            user_id=latest_sub.user_id,
            submission_code=latest_sub.submission_code,
            score=latest_sub.score,
            status=latest_sub.status,
            summary=latest_sub.summary,
            strengths=latest_sub.strengths or [],
            gaps=latest_sub.gaps or [],
            remediation=latest_sub.remediation or [],
            created_at=latest_sub.created_at
        )

    return ChapterTaskResponse(
        id=task.id,
        skill_id=skill.id,
        skill_slug=skill.slug,
        skill_name=skill.name,
        title=task.title,
        description=task.description,
        instructions_md=task.instructions_md,
        starter_code=task.starter_code,
        rubric=task.rubric or [],
        difficulty=task.difficulty,
        latest_submission=latest_sub_resp
    )

@router.post("/{skill_id}/task/submit", response_model=TaskSubmissionResponse)
def submit_chapter_task(
    skill_id: str,
    payload: TaskSubmissionRequest,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    skill = _get_skill_or_404(skill_id, db)

    task = db.query(ChapterTask).filter(ChapterTask.skill_id == skill.id).first()
    if not task:
        # Auto-create task if not already present
        task = ChapterTask(
            skill_id=skill.id,
            title=f"Mission: {skill.name} Applied Mastery",
            description=f"Implement and demonstrate core practical mechanics for {skill.name}.",
            instructions_md=f"### Objective\nBuild a verified practical module demonstrating hands-on mastery of **{skill.name}**.\n\n### Acceptance Criteria\n1. Implement the required functions or components with clean modular syntax.\n2. Ensure proper exception trapping and defensive boundaries.\n3. Align with production engineering best practices.",
            starter_code=f"// Chapter Mission: {skill.name}\n// Implement your solution below:\n\n",
            rubric=[
                {"criterion": "Core Mechanics & Correctness", "weight": 40, "description": "Accurate functional implementation"},
                {"criterion": "Defensive Trapping & Reliability", "weight": 30, "description": "Error handling and edge case resilience"},
                {"criterion": "Code Quality & Idiomatic Style", "weight": 30, "description": "Clean modular architecture"}
            ],
            difficulty=skill.difficulty
        )
        db.add(task)
        db.commit()
        db.refresh(task)

    # Gather chapter context for diagnostic evaluator
    overview = skill.lesson.overview if skill.lesson else (skill.description or "")
    approved_note = db.query(SkillNote).filter(
        SkillNote.skill_id == skill.id,
        SkillNote.status == "approved"
    ).first()
    study_notes = approved_note.content_md if approved_note else None

    videos = db.query(LessonVideo).filter(
        LessonVideo.skill_id == skill.id,
        LessonVideo.verified == True
    ).all()
    video_list = [{"title": v.title, "channel": v.channel, "youtube_id": v.youtube_id} for v in videos]

    # Run AI Evaluator
    from app.services.evaluator import evaluator_service
    eval_result = evaluator_service.evaluate(
        task_title=task.title,
        instructions_md=task.instructions_md,
        rubric=task.rubric or [],
        overview=overview,
        study_notes=study_notes,
        videos=video_list,
        submission_code=payload.submission_code
    )

    # Save submission
    sub = TaskSubmission(
        task_id=task.id,
        user_id=user_id,
        submission_code=payload.submission_code,
        score=eval_result["score"],
        status=eval_result["status"],
        summary=eval_result["summary"],
        strengths=eval_result["strengths"],
        gaps=eval_result["gaps"],
        remediation=eval_result["remediation"],
        created_at=datetime.now(timezone.utc)
    )
    db.add(sub)

    # If passed (score >= 80), auto-mark roadmap item as 'done'!
    if sub.status == "passed":
        from app.models import RoadmapItem, Roadmap
        roadmap_item = db.query(RoadmapItem).join(Roadmap).filter(
            Roadmap.user_id == user_id,
            RoadmapItem.skill_id == skill.id
        ).first()
        if roadmap_item and roadmap_item.status != "done":
            roadmap_item.status = "done"

    db.commit()
    db.refresh(sub)

    return TaskSubmissionResponse(
        id=sub.id,
        task_id=sub.task_id,
        user_id=sub.user_id,
        submission_code=sub.submission_code,
        score=sub.score,
        status=sub.status,
        summary=sub.summary,
        strengths=sub.strengths or [],
        gaps=sub.gaps or [],
        remediation=sub.remediation or [],
        created_at=sub.created_at
    )
