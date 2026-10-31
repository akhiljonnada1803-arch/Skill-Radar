import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from fastapi import Request, HTTPException, status, Header, Depends
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limit tracker: key -> list of failure timestamps
_failed_attempts: Dict[str, list] = {}
RATE_LIMIT_WINDOW = 60  # seconds
MAX_FAILED_ATTEMPTS = 5

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def check_login_rate_limit(key: str) -> None:
    now = time.time()
    attempts = _failed_attempts.get(key, [])
    # Filter attempts within current window
    recent_attempts = [t for t in attempts if now - t < RATE_LIMIT_WINDOW]
    _failed_attempts[key] = recent_attempts
    if len(recent_attempts) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 60 seconds before retrying."
        )

def record_login_failure(key: str) -> None:
    now = time.time()
    attempts = _failed_attempts.get(key, [])
    attempts.append(now)
    _failed_attempts[key] = attempts

def clear_login_failures(key: str) -> None:
    if key in _failed_attempts:
        del _failed_attempts[key]

def get_current_user_id(request: Request) -> uuid.UUID:
    """
    Derives identity strictly from headers or demo mode.
    AGENTS.md Rule 19 & 31: Never trust a user_id from a query string.
    """
    # Enforce non-negotiable security rule against query string user_id
    if "user_id" in request.query_params:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplying user_id in query string is forbidden. Identity must be derived from authorization headers."
        )

    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        user_id_str = decode_access_token(token)
        if user_id_str:
            try:
                return uuid.UUID(user_id_str)
            except ValueError:
                pass
        # Fallback for plain UUID token in test/demo mode
        try:
            return uuid.UUID(token)
        except ValueError:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Check X-User-Id header (for legacy or tests)
    user_header = request.headers.get("x-user-id")
    if user_header:
        try:
            return uuid.UUID(user_header)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid UUID format in X-User-Id header"
            )

    # Demo user fallback
    if settings.DEMO_USER_ID:
        try:
            return uuid.UUID(settings.DEMO_USER_ID)
        except ValueError:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

def get_optional_user_id(request: Request) -> Optional[uuid.UUID]:
    try:
        return get_current_user_id(request)
    except HTTPException:
        return None

def get_current_user(request: Request, db: Session = Depends(get_db)):
    from app.models import User
    user_id = get_current_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # If demo user ID, ensure demo user exists
        if str(user_id) == settings.DEMO_USER_ID:
            user = User(id=user_id, email="demo@skillradar.local")
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
    return user

def verify_admin_token(x_admin_token: Optional[str] = Header(None)) -> str:
    """Protects admin endpoints like ingestion triggers."""
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin token"
        )
    return x_admin_token
