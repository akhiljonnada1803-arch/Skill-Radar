from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User, StudentProfile
from app.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    UserBasicInfo, UserMeResponse, ProfileResponse
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    check_login_rate_limit, record_login_failure, clear_login_failures,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    # Hash password with bcrypt
    hashed = get_password_hash(req.password)
    user = User(
        email=req.email.lower().strip(),
        password_hash=hashed
    )
    db.add(user)
    db.flush()

    # Create empty student profile
    profile = StudentProfile(
        user_id=user.id,
        display_name=user.email.split("@")[0].capitalize(),
        experience_level="beginner",
        weekly_study_minutes=300
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id))
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserBasicInfo(id=user.id, email=user.email)
    )

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{email_clean}"

    # Check rate limit / lockout (T1.9)
    check_login_rate_limit(rate_limit_key)

    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        record_login_failure(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    clear_login_failures(rate_limit_key)
    token = create_access_token(subject=str(user.id))
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserBasicInfo(id=user.id, email=user.email)
    )

@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    profile_resp = None
    if profile:
        profile_resp = ProfileResponse(
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
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        profile=profile_resp
    )
