import json
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Nexora CRM API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql://nexora:nexora@localhost:5432/nexora"
    RUN_MIGRATIONS_ON_STARTUP: bool = True
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str | None = None

    FRONTEND_URL: str = "http://localhost:3000"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Nexora"
    SMTP_USE_TLS: bool = True

    @field_validator("COOKIE_SAMESITE", mode="before")
    @classmethod
    def normalize_cookie_samesite(cls, value: str) -> str:
        normalized = str(value).strip().lower()
        if normalized not in {"lax", "strict", "none"}:
            return "lax"
        return normalized

    @property
    def email_enabled(self) -> bool:
        return bool(self.SMTP_HOST.strip() and self.SMTP_FROM_EMAIL.strip())

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql://", 1)
        return value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return [origin.strip().rstrip("/") for origin in value if origin.strip()]
        text = value.strip()
        if text.startswith("["):
            parsed = json.loads(text)
            return [str(origin).strip().rstrip("/") for origin in parsed if str(origin).strip()]
        return [origin.strip().rstrip("/") for origin in text.split(",") if origin.strip()]

    @property
    def cors_origins(self) -> list[str]:
        """Allowed browser origins — always includes FRONTEND_URL when set."""
        origins: list[str] = []
        for origin in [*self.CORS_ORIGINS, self.FRONTEND_URL]:
            normalized = origin.strip().rstrip("/")
            if normalized and normalized not in origins:
                origins.append(normalized)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
