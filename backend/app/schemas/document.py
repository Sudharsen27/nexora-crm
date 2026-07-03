from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent_id: uuid.UUID | None = None


class FolderResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    parent_id: uuid.UUID | None
    name: str
    slug: str
    folder_type: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentLinkInput(BaseModel):
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    deal_id: uuid.UUID | None = None
    meeting_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    workflow_id: uuid.UUID | None = None


class DocumentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    folder_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    deal_id: uuid.UUID | None = None
    meeting_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    workflow_id: uuid.UUID | None = None


class DocumentMoveRequest(BaseModel):
    folder_id: uuid.UUID | None = None


class DocumentBulkIds(BaseModel):
    document_ids: list[uuid.UUID] = Field(min_length=1)


class DocumentBulkMove(BaseModel):
    document_ids: list[uuid.UUID] = Field(min_length=1)
    folder_id: uuid.UUID | None = None


class DocumentShareCreate(BaseModel):
    user_id: uuid.UUID
    permission: str = "view"


class DocumentCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class SignerInput(BaseModel):
    email: str
    full_name: str
    user_id: uuid.UUID | None = None
    order_index: int = 0


class SignatureRequestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    message: str | None = None
    expires_at: datetime | None = None
    signing_order: bool = False
    signers: list[SignerInput] = Field(min_length=1)


class SignDocumentRequest(BaseModel):
    signature_type: str = Field(pattern="^(draw|type|upload)$")
    signature_data: dict


class RejectSignatureRequest(BaseModel):
    reason: str | None = None


class DocumentVersionResponse(BaseModel):
    id: uuid.UUID
    version_number: int
    filename: str
    mime_type: str
    size_bytes: int
    created_by_id: uuid.UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentCommentResponse(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentShareResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    permission: str
    shared_by_id: uuid.UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    folder_id: uuid.UUID | None
    name: str
    description: str | None
    status: str
    mime_type: str
    extension: str
    size_bytes: int
    current_version: int
    is_starred: bool
    deleted_at: datetime | None
    tags: list
    company_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    lead_id: uuid.UUID | None
    deal_id: uuid.UUID | None
    meeting_id: uuid.UUID | None
    task_id: uuid.UUID | None
    workflow_id: uuid.UUID | None
    created_by_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    preview_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int


class SignatureSignerResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    order_index: int
    status: str
    signature_type: str | None
    signed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SignatureRequestResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    title: str
    message: str | None
    status: str
    expires_at: datetime | None
    signing_order: bool
    signers: list[SignatureSignerResponse]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    action: str
    detail: str | None
    actor_id: uuid.UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
