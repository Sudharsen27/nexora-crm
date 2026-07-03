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
    # Optional regex for preview deployments (e.g. Vercel: https://.*\.vercel\.app)
    CORS_ORIGIN_REGEX: str = ""
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str | None = None

    FRONTEND_URL: str = "http://localhost:3000"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60

    # Email: use Resend API on Render free tier (SMTP ports blocked). SMTP works locally.
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Nexora"
    SMTP_USE_TLS: bool = True

    EMAIL_MAX_ATTACHMENT_BYTES: int = 10_485_760
    EMAIL_MAX_ATTACHMENTS: int = 10

    # Document management
    DOCUMENT_MAX_FILE_BYTES: int = 52_428_800  # 50 MB
    DOCUMENT_STORAGE_BACKEND: str = "db"  # db | supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "documents"
    # Public backend base URL (no trailing slash). Used for email tracking links.
    # Local: http://localhost:8000  |  Production: https://your-api.onrender.com
    BACKEND_PUBLIC_URL: str = ""
    # Full API prefix URL for tracking pixels. Optional if BACKEND_PUBLIC_URL is set.
    API_PUBLIC_URL: str = ""

    @property
    def api_public_url(self) -> str:
        """Base URL for public API routes (email open/click tracking)."""
        explicit = self.API_PUBLIC_URL.strip().rstrip("/")
        if explicit:
            return explicit
        backend = self.BACKEND_PUBLIC_URL.strip().rstrip("/")
        if backend:
            return f"{backend}{self.API_V1_PREFIX}"
        return f"http://localhost:8000{self.API_V1_PREFIX}"

    @field_validator("COOKIE_SAMESITE", mode="before")
    @classmethod
    def normalize_cookie_samesite(cls, value: str) -> str:
        normalized = str(value).strip().lower()
        if normalized not in {"lax", "strict", "none"}:
            return "lax"
        return normalized

    @property
    def use_supabase_storage(self) -> bool:
        return (
            self.DOCUMENT_STORAGE_BACKEND.strip().lower() == "supabase"
            and bool(self.SUPABASE_URL.strip())
            and bool(self.SUPABASE_SERVICE_KEY.strip())
        )

    @property
    def use_resend(self) -> bool:
        return bool(self.RESEND_API_KEY.strip())

    @property
    def email_enabled(self) -> bool:
        if not self.SMTP_FROM_EMAIL.strip():
            return False
        return self.use_resend or bool(self.SMTP_HOST.strip())

    @property
    def email_from_header(self) -> str:
        if self.SMTP_FROM_NAME.strip():
            return f"{self.SMTP_FROM_NAME} <{self.SMTP_FROM_EMAIL}>"
        return self.SMTP_FROM_EMAIL

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

    @property
    def cors_origin_regex(self) -> str | None:
        pattern = self.CORS_ORIGIN_REGEX.strip()
        return pattern or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
