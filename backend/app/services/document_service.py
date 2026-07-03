"""Document management and e-signature business logic."""

from __future__ import annotations

import mimetypes
import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import String, and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models.document import (
    ALLOWED_MIME_TYPES,
    DOCUMENT_STATUSES,
    Document,
    DocumentAuditLog,
    DocumentComment,
    DocumentFolder,
    DocumentShare,
    DocumentVersion,
    SignatureRequest,
    SignatureSigner,
)
from app.schemas.document import (
    DocumentCommentCreate,
    DocumentLinkInput,
    DocumentShareCreate,
    DocumentUpdate,
    RejectSignatureRequest,
    SignatureRequestCreate,
    SignDocumentRequest,
    SignerInput,
)
from app.services.activity_logger import ActivityLogger
from app.services.document_storage import DocumentStorage
from app.services.notification_emitter import NotificationEmitter

SYSTEM_FOLDERS: list[tuple[str, str, str]] = [
    ("My Documents", "my_documents", "my_documents"),
    ("Shared", "shared", "shared"),
    ("Company Files", "company_files", "company_files"),
    ("Deal Files", "deal_files", "deal_files"),
    ("Contract Library", "contract_library", "contract_library"),
    ("Proposal Library", "proposal_library", "proposal_library"),
    ("Marketing", "marketing", "marketing"),
    ("Templates", "templates", "templates"),
    ("Archive", "archive", "archive"),
    ("Recycle Bin", "recycle_bin", "recycle_bin"),
]

EXTENSION_MIME: dict[str, str] = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".zip": "application/zip",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
}


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return slug[:100] or "folder"


def _extension(filename: str) -> str:
    if "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    return ""


def _resolve_mime(filename: str, content_type: str | None) -> str:
    ext = _extension(filename)
    if ext:
        mapped = EXTENSION_MIME.get(f".{ext}")
        if mapped:
            return mapped
    if content_type and content_type != "application/octet-stream":
        return content_type.split(";")[0].strip()
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.storage = DocumentStorage()
        self.settings = get_settings()
        self.activity = ActivityLogger(db)
        self.notifications = NotificationEmitter(db)

    def ensure_system_folders(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
        existing = {
            row.slug
            for row in self.db.scalars(
                select(DocumentFolder).where(
                    DocumentFolder.tenant_id == tenant_id,
                    DocumentFolder.is_system.is_(True),
                )
            )
        }
        for name, slug, folder_type in SYSTEM_FOLDERS:
            if slug in existing:
                continue
            self.db.add(
                DocumentFolder(
                    tenant_id=tenant_id,
                    name=name,
                    slug=slug,
                    folder_type=folder_type,
                    is_system=True,
                    created_by_id=user_id,
                )
            )
        self.db.flush()

    def _folder_by_slug(self, tenant_id: uuid.UUID, slug: str) -> DocumentFolder | None:
        return self.db.scalar(
            select(DocumentFolder).where(
                DocumentFolder.tenant_id == tenant_id,
                DocumentFolder.slug == slug,
            )
        )

    def list_folders(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> list[DocumentFolder]:
        self.ensure_system_folders(tenant_id, user_id)
        return list(
            self.db.scalars(
                select(DocumentFolder)
                .where(DocumentFolder.tenant_id == tenant_id)
                .order_by(DocumentFolder.is_system.desc(), DocumentFolder.name.asc())
            )
        )

    def create_folder(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        name: str,
        parent_id: uuid.UUID | None,
    ) -> DocumentFolder:
        self.ensure_system_folders(tenant_id, user_id)
        slug_base = _slugify(name)
        slug = slug_base
        counter = 1
        while self._folder_by_slug(tenant_id, slug):
            slug = f"{slug_base}_{counter}"
            counter += 1
        if parent_id:
            parent = self.db.get(DocumentFolder, parent_id)
            if not parent or parent.tenant_id != tenant_id:
                raise HTTPException(status_code=404, detail="Parent folder not found")
        folder = DocumentFolder(
            tenant_id=tenant_id,
            parent_id=parent_id,
            name=name,
            slug=slug,
            folder_type="custom",
            is_system=False,
            created_by_id=user_id,
        )
        self.db.add(folder)
        self.db.flush()
        return folder

    def _document_query(self, tenant_id: uuid.UUID):
        return select(Document).where(Document.tenant_id == tenant_id)

    def _get_document(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> Document:
        doc = self.db.scalar(
            self._document_query(tenant_id).where(Document.id == document_id)
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc

    def _audit(
        self,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        action: str,
        detail: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        self.db.add(
            DocumentAuditLog(
                tenant_id=tenant_id,
                document_id=document_id,
                actor_id=actor_id,
                action=action,
                detail=detail,
                audit_metadata=metadata,
                created_at=datetime.now(timezone.utc),
            )
        )

    def _activity(
        self,
        tenant_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        document: Document,
        action: str,
        title: str,
        description: str,
    ) -> None:
        entity_type = "company" if document.company_id else "deal" if document.deal_id else "tenant"
        entity_id = document.company_id or document.deal_id or document.tenant_id
        self.activity.log(
            tenant_id=tenant_id,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            title=title,
            description=description,
            metadata={"document_id": str(document.id), "document_name": document.name},
        )

    def list_documents(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        folder_id: uuid.UUID | None = None,
        folder_slug: str | None = None,
        q: str | None = None,
        file_type: str | None = None,
        status_filter: str | None = None,
        starred: bool | None = None,
        view: str | None = None,
        page: int = 1,
        page_size: int = 24,
    ) -> tuple[list[Document], int]:
        self.ensure_system_folders(tenant_id, user_id)
        stmt = self._document_query(tenant_id)

        if view == "recycle_bin" or folder_slug == "recycle_bin":
            stmt = stmt.where(Document.deleted_at.isnot(None))
        else:
            stmt = stmt.where(Document.deleted_at.is_(None))

        if folder_slug == "shared" or view == "shared":
            shared_ids = select(DocumentShare.document_id).where(
                DocumentShare.tenant_id == tenant_id,
                DocumentShare.user_id == user_id,
            )
            stmt = stmt.where(Document.id.in_(shared_ids))
        elif folder_slug == "my_documents" or view == "my_documents":
            my_folder = self._folder_by_slug(tenant_id, "my_documents")
            if my_folder:
                stmt = stmt.where(
                    or_(Document.created_by_id == user_id, Document.folder_id == my_folder.id)
                )
        elif folder_id:
            stmt = stmt.where(Document.folder_id == folder_id)
        elif folder_slug:
            folder = self._folder_by_slug(tenant_id, folder_slug)
            if folder:
                stmt = stmt.where(Document.folder_id == folder.id)

        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Document.name.ilike(pattern),
                    func.cast(Document.tags, String).ilike(pattern),
                )
            )
        if status_filter:
            stmt = stmt.where(Document.status == status_filter)
        if starred is True:
            stmt = stmt.where(Document.is_starred.is_(True))

        if file_type == "pdf":
            stmt = stmt.where(Document.mime_type == "application/pdf")
        elif file_type == "images":
            stmt = stmt.where(Document.mime_type.like("image/%"))
        elif file_type == "contracts":
            stmt = stmt.where(Document.status.in_(["pending_signature", "signed"]))
        elif file_type == "signed":
            stmt = stmt.where(Document.status == "signed")
        elif file_type == "pending":
            stmt = stmt.where(Document.status == "pending_signature")

        order = Document.updated_at.desc()
        if view == "recent":
            order = Document.updated_at.desc()

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(order).offset((page - 1) * page_size).limit(page_size)
        ).all()
        return list(rows), total

    def upload_document(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        file: UploadFile,
        *,
        folder_id: uuid.UUID | None = None,
        links: DocumentLinkInput | None = None,
        tenant_slug: str | None = None,
    ) -> Document:
        self.ensure_system_folders(tenant_id, user_id)
        content = file.file.read()
        if len(content) > self.settings.DOCUMENT_MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="File exceeds maximum size")

        filename = file.filename or "untitled"
        mime_type = _resolve_mime(filename, file.content_type)
        if mime_type not in ALLOWED_MIME_TYPES and mime_type != "application/octet-stream":
            ext = _extension(filename)
            if f".{ext}" not in EXTENSION_MIME:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime_type}")

        if not folder_id:
            default_folder = self._folder_by_slug(tenant_id, "my_documents")
            folder_id = default_folder.id if default_folder else None

        doc_id = uuid.uuid4()
        backend, storage_key, db_content = self.storage.store(
            tenant_id, doc_id, 1, filename, content, mime_type
        )
        checksum = self.storage.checksum(content)
        now = datetime.now(timezone.utc)

        document = Document(
            id=doc_id,
            tenant_id=tenant_id,
            folder_id=folder_id,
            name=filename,
            status="draft",
            mime_type=mime_type,
            extension=_extension(filename),
            size_bytes=len(content),
            current_version=1,
            storage_backend=backend,
            storage_key=storage_key or None,
            created_by_id=user_id,
            updated_by_id=user_id,
            tags=[],
        )
        if links:
            for field in ("company_id", "contact_id", "lead_id", "deal_id", "meeting_id", "task_id", "workflow_id"):
                setattr(document, field, getattr(links, field))

        version = DocumentVersion(
            document_id=doc_id,
            tenant_id=tenant_id,
            version_number=1,
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(content),
            storage_backend=backend,
            storage_key=storage_key or None,
            content=db_content,
            checksum=checksum,
            created_by_id=user_id,
            created_at=now,
        )
        self.db.add(document)
        self.db.add(version)
        self.db.flush()

        self._audit(tenant_id, doc_id, user_id, "upload", f"Uploaded {filename}")
        self._activity(
            tenant_id,
            user_id,
            document,
            "document_uploaded",
            "Document uploaded",
            f'"{filename}" was uploaded',
        )
        return document

    def get_current_content(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> tuple[Document, bytes, DocumentVersion]:
        document = self._get_document(tenant_id, document_id)
        version = self.db.scalar(
            select(DocumentVersion).where(
                DocumentVersion.document_id == document_id,
                DocumentVersion.version_number == document.current_version,
            )
        )
        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")
        content = self.storage.retrieve(
            version.storage_backend, version.storage_key or "", version.content
        )
        return document, content, version

    def update_document(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        payload: DocumentUpdate,
    ) -> Document:
        document = self._get_document(tenant_id, document_id)
        data = payload.model_dump(exclude_unset=True)
        if "name" in data:
            self._audit(tenant_id, document_id, user_id, "rename", f"Renamed to {data['name']}")
        for key, value in data.items():
            setattr(document, key, value)
        document.updated_by_id = user_id
        self.db.flush()
        return document

    def move_document(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        folder_id: uuid.UUID | None,
    ) -> Document:
        document = self._get_document(tenant_id, document_id)
        if folder_id:
            folder = self.db.get(DocumentFolder, folder_id)
            if not folder or folder.tenant_id != tenant_id:
                raise HTTPException(status_code=404, detail="Folder not found")
        document.folder_id = folder_id
        document.updated_by_id = user_id
        self._audit(tenant_id, document_id, user_id, "move", "Document moved")
        self.db.flush()
        return document

    def toggle_star(self, tenant_id: uuid.UUID, user_id: uuid.UUID, document_id: uuid.UUID) -> Document:
        document = self._get_document(tenant_id, document_id)
        document.is_starred = not document.is_starred
        document.updated_by_id = user_id
        self.db.flush()
        return document

    def soft_delete(self, tenant_id: uuid.UUID, user_id: uuid.UUID, document_id: uuid.UUID) -> Document:
        document = self._get_document(tenant_id, document_id)
        recycle = self._folder_by_slug(tenant_id, "recycle_bin")
        document.deleted_at = datetime.now(timezone.utc)
        if recycle:
            document.folder_id = recycle.id
        document.updated_by_id = user_id
        self._audit(tenant_id, document_id, user_id, "delete", "Moved to recycle bin")
        self._activity(
            tenant_id, user_id, document, "document_deleted", "Document deleted", f'"{document.name}" deleted'
        )
        self.db.flush()
        return document

    def restore_document(self, tenant_id: uuid.UUID, user_id: uuid.UUID, document_id: uuid.UUID) -> Document:
        document = self._get_document(tenant_id, document_id)
        my_docs = self._folder_by_slug(tenant_id, "my_documents")
        document.deleted_at = None
        if my_docs:
            document.folder_id = my_docs.id
        document.updated_by_id = user_id
        self._audit(tenant_id, document_id, user_id, "restore", "Restored from recycle bin")
        self.db.flush()
        return document

    def bulk_delete(self, tenant_id: uuid.UUID, user_id: uuid.UUID, document_ids: list[uuid.UUID]) -> int:
        count = 0
        for doc_id in document_ids:
            self.soft_delete(tenant_id, user_id, doc_id)
            count += 1
        return count

    def bulk_move(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        document_ids: list[uuid.UUID],
        folder_id: uuid.UUID | None,
    ) -> int:
        count = 0
        for doc_id in document_ids:
            self.move_document(tenant_id, user_id, doc_id, folder_id)
            count += 1
        return count

    def share_document(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        payload: DocumentShareCreate,
        tenant_slug: str | None = None,
    ) -> DocumentShare:
        document = self._get_document(tenant_id, document_id)
        existing = self.db.scalar(
            select(DocumentShare).where(
                DocumentShare.document_id == document_id,
                DocumentShare.user_id == payload.user_id,
            )
        )
        if existing:
            existing.permission = payload.permission
            share = existing
        else:
            share = DocumentShare(
                tenant_id=tenant_id,
                document_id=document_id,
                user_id=payload.user_id,
                permission=payload.permission,
                shared_by_id=user_id,
            )
            self.db.add(share)
        self._audit(tenant_id, document_id, user_id, "share", f"Shared with user {payload.user_id}")
        self.notifications.notify(
            tenant_id=tenant_id,
            user_id=payload.user_id,
            actor_id=user_id,
            type="document_shared",
            title="Document shared with you",
            message=f'"{document.name}" was shared with you',
            entity_type="document",
            entity_id=document_id,
            action_url=f"/{tenant_slug}/documents/{document_id}" if tenant_slug else None,
            tenant_slug=tenant_slug,
        )
        self.db.flush()
        return share

    def add_comment(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        payload: DocumentCommentCreate,
    ) -> DocumentComment:
        self._get_document(tenant_id, document_id)
        comment = DocumentComment(
            tenant_id=tenant_id,
            document_id=document_id,
            author_id=user_id,
            body=payload.body,
        )
        self.db.add(comment)
        self._audit(tenant_id, document_id, user_id, "comment", "Comment added")
        self.db.flush()
        return comment

    def list_comments(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> list[DocumentComment]:
        self._get_document(tenant_id, document_id)
        return list(
            self.db.scalars(
                select(DocumentComment)
                .where(DocumentComment.document_id == document_id)
                .order_by(DocumentComment.created_at.desc())
            )
        )

    def list_versions(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> list[DocumentVersion]:
        self._get_document(tenant_id, document_id)
        return list(
            self.db.scalars(
                select(DocumentVersion)
                .where(DocumentVersion.document_id == document_id)
                .order_by(DocumentVersion.version_number.desc())
            )
        )

    def list_audit(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> list[DocumentAuditLog]:
        self._get_document(tenant_id, document_id)
        return list(
            self.db.scalars(
                select(DocumentAuditLog)
                .where(DocumentAuditLog.document_id == document_id)
                .order_by(DocumentAuditLog.created_at.desc())
            )
        )

    def record_download(self, tenant_id: uuid.UUID, user_id: uuid.UUID, document_id: uuid.UUID) -> None:
        self._audit(tenant_id, document_id, user_id, "download", "Document downloaded")

    def request_signature(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        payload: SignatureRequestCreate,
        tenant_slug: str | None = None,
    ) -> SignatureRequest:
        document = self._get_document(tenant_id, document_id)
        document.status = "pending_signature"
        request = SignatureRequest(
            tenant_id=tenant_id,
            document_id=document_id,
            title=payload.title,
            message=payload.message,
            status="pending",
            expires_at=payload.expires_at,
            signing_order=payload.signing_order,
            created_by_id=user_id,
        )
        self.db.add(request)
        self.db.flush()

        for signer in sorted(payload.signers, key=lambda s: s.order_index):
            self.db.add(
                SignatureSigner(
                    request_id=request.id,
                    tenant_id=tenant_id,
                    user_id=signer.user_id,
                    email=signer.email,
                    full_name=signer.full_name,
                    order_index=signer.order_index,
                )
            )
            if signer.user_id:
                self.notifications.notify(
                    tenant_id=tenant_id,
                    user_id=signer.user_id,
                    actor_id=user_id,
                    type="signature_requested",
                    title="Signature requested",
                    message=f'Please sign "{document.name}"',
                    entity_type="document",
                    entity_id=document_id,
                    action_url=f"/{tenant_slug}/documents/signatures" if tenant_slug else None,
                    tenant_slug=tenant_slug,
                )

        self._audit(tenant_id, document_id, user_id, "signature_request", payload.title)
        self._activity(
            tenant_id,
            user_id,
            document,
            "signature_requested",
            "Signature requested",
            f'Signature requested for "{document.name}"',
        )
        self.db.flush()
        return self.db.scalar(
            select(SignatureRequest)
            .options(joinedload(SignatureRequest.signers))
            .where(SignatureRequest.id == request.id)
        )

    def list_signature_requests(self, tenant_id: uuid.UUID) -> list[SignatureRequest]:
        return list(
            self.db.scalars(
                select(SignatureRequest)
                .options(joinedload(SignatureRequest.signers))
                .where(SignatureRequest.tenant_id == tenant_id)
                .order_by(SignatureRequest.created_at.desc())
            ).unique()
        )

    def sign_document(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        request_id: uuid.UUID,
        payload: SignDocumentRequest,
        tenant_slug: str | None = None,
    ) -> SignatureSigner:
        request = self.db.scalar(
            select(SignatureRequest)
            .options(joinedload(SignatureRequest.signers))
            .where(SignatureRequest.id == request_id, SignatureRequest.tenant_id == tenant_id)
        )
        if not request:
            raise HTTPException(status_code=404, detail="Signature request not found")

        signer = next((s for s in request.signers if s.user_id == user_id), None)
        if not signer:
            raise HTTPException(status_code=403, detail="You are not a signer on this request")
        if request.signing_order:
            prior = [s for s in request.signers if s.order_index < signer.order_index]
            if any(s.status != "signed" for s in prior):
                raise HTTPException(status_code=400, detail="Waiting for prior signers")

        signer.status = "signed"
        signer.signature_type = payload.signature_type
        signer.signature_data = payload.signature_data
        signer.signed_at = datetime.now(timezone.utc)

        if all(s.status == "signed" for s in request.signers):
            request.status = "completed"
            request.completed_at = datetime.now(timezone.utc)
            doc = self._get_document(tenant_id, request.document_id)
            doc.status = "signed"
            if request.created_by_id:
                self.notifications.notify(
                    tenant_id=tenant_id,
                    user_id=request.created_by_id,
                    actor_id=user_id,
                    type="signature_completed",
                    title="Document signed",
                    message=f'"{doc.name}" has been fully signed',
                    entity_type="document",
                    entity_id=doc.id,
                    action_url=f"/{tenant_slug}/documents/{doc.id}" if tenant_slug else None,
                    tenant_slug=tenant_slug,
                )

        self._audit(tenant_id, request.document_id, user_id, "signed", "Document signed")
        self.db.flush()
        return signer

    def reject_signature(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        request_id: uuid.UUID,
        payload: RejectSignatureRequest,
    ) -> SignatureSigner:
        request = self.db.scalar(
            select(SignatureRequest)
            .options(joinedload(SignatureRequest.signers))
            .where(SignatureRequest.id == request_id, SignatureRequest.tenant_id == tenant_id)
        )
        if not request:
            raise HTTPException(status_code=404, detail="Signature request not found")
        signer = next((s for s in request.signers if s.user_id == user_id), None)
        if not signer:
            raise HTTPException(status_code=403, detail="You are not a signer on this request")
        signer.status = "declined"
        signer.declined_reason = payload.reason
        request.status = "declined"
        doc = self._get_document(tenant_id, request.document_id)
        doc.status = "rejected"
        self._audit(tenant_id, request.document_id, user_id, "declined", payload.reason)
        self.db.flush()
        return signer

    def preview_url(self, document: Document) -> str | None:
        if document.storage_backend == "supabase" and document.storage_key:
            return self.storage.signed_url(document.storage_key)
        return None
