"""Document file storage — database bytes (default) or Supabase Storage."""

from __future__ import annotations

import hashlib
import logging
import uuid

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class DocumentStorage:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def backend(self) -> str:
        if self.settings.use_supabase_storage:
            return "supabase"
        return "db"

    def checksum(self, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def store(
        self,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        version_number: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> tuple[str, str, bytes | None]:
        """Returns (storage_backend, storage_key, db_content)."""
        if self.backend == "supabase":
            key = f"{tenant_id}/{document_id}/v{version_number}/{filename}"
            self._upload_supabase(key, content, content_type)
            return "supabase", key, None
        return "db", "", content

    def retrieve(self, storage_backend: str, storage_key: str, db_content: bytes | None) -> bytes:
        if storage_backend == "supabase" and storage_key:
            return self._download_supabase(storage_key)
        if db_content is not None:
            return db_content
        raise FileNotFoundError("Document content not found")

    def _upload_supabase(self, path: str, content: bytes, content_type: str) -> None:
        settings = self.settings
        url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, content=content, headers=headers)
            response.raise_for_status()

    def _download_supabase(self, path: str) -> bytes:
        settings = self.settings
        url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
        headers = {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}"}
        with httpx.Client(timeout=60.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            return response.content

    def signed_url(self, storage_key: str, expires_in: int = 3600) -> str | None:
        if not self.settings.use_supabase_storage or not storage_key:
            return None
        settings = self.settings
        url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/"
            f"{settings.SUPABASE_STORAGE_BUCKET}/{storage_key}"
        )
        headers = {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}"}
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json={"expiresIn": expires_in}, headers=headers)
            if response.is_success:
                data = response.json()
                signed = data.get("signedURL") or data.get("signedUrl")
                if signed:
                    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{signed}"
        return None
