import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillRadar AI"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/skillradar"
    GEMINI_API_KEY: Optional[str] = None
    ADMIN_TOKEN: str = "skillradar-secret-admin-token-2026"
    JWT_SECRET_KEY: str = "skillradar-jwt-secret-key-2026-expedition"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEMO_USER_ID: str = "00000000-0000-0000-0000-000000000001"
    ENVIRONMENT: str = "development"

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
