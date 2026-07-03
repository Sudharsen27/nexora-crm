from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.document import DOCUMENT_STATUSES, FOLDER_TYPES
from app.schemas.document import (
    AuditLogResponse,
    DocumentBulkIds,
    DocumentBulkMove,
    DocumentCommentCreate,
    DocumentCommentResponse,
    DocumentListResponse,
    DocumentMoveRequest,
    DocumentResponse,
    DocumentShareCreate,
    DocumentShareResponse,
    DocumentUpdate,
    DocumentVersionResponse,
    FolderCreate,
    FolderResponse,
    RejectSignatureRequest,
    SignatureRequestCreate,
    SignatureRequestResponse,
    SignDocumentRequest,
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/tenants/{slug}/documents", tags=["documents"])


def _doc_response(service: DocumentService, doc) -> DocumentResponse:
    data = DocumentResponse.model_validate(doc).model_dump()
    data["preview_url"] = service.preview_url(doc)
    return DocumentResponse(**data)


@router.get("/meta")
def documents_meta(_: TenantContext = Depends(require_permission("document:read"))) -> dict:
    return {"statuses": list(DOCUMENT_STATUSES), "folder_types": list(FOLDER_TYPES)}


@router.get("/folders", response_model=list[FolderResponse])
def list_folders(
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> list[FolderResponse]:
    folders = DocumentService(db).list_folders(ctx.tenant.id, ctx.membership.user_id)
    return [FolderResponse.model_validate(f) for f in folders]


@router.post("/folders", response_model=FolderResponse, status_code=201)
def create_folder(
    payload: FolderCreate,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> FolderResponse:
    folder = DocumentService(db).create_folder(
        ctx.tenant.id,
        ctx.membership.user_id,
        name=payload.name,
        parent_id=payload.parent_id,
    )
    db.commit()
    return FolderResponse.model_validate(folder)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    folder_id: UUID | None = None,
    folder_slug: str | None = None,
    q: str | None = None,
    file_type: str | None = None,
    status: str | None = Query(default=None, alias="status"),
    starred: bool | None = None,
    view: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    service = DocumentService(db)
    items, total = service.list_documents(
        ctx.tenant.id,
        ctx.membership.user_id,
        folder_id=folder_id,
        folder_slug=folder_slug,
        q=q,
        file_type=file_type,
        status_filter=status,
        starred=starred,
        view=view,
        page=page,
        page_size=page_size,
    )
    return DocumentListResponse(
        items=[_doc_response(service, d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: UUID | None = Form(default=None),
    company_id: UUID | None = Form(default=None),
    contact_id: UUID | None = Form(default=None),
    lead_id: UUID | None = Form(default=None),
    deal_id: UUID | None = Form(default=None),
    meeting_id: UUID | None = Form(default=None),
    task_id: UUID | None = Form(default=None),
    workflow_id: UUID | None = Form(default=None),
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    from app.schemas.document import DocumentLinkInput

    service = DocumentService(db)
    links = DocumentLinkInput(
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        deal_id=deal_id,
        meeting_id=meeting_id,
        task_id=task_id,
        workflow_id=workflow_id,
    )
    doc = service.upload_document(
        ctx.tenant.id,
        ctx.membership.user_id,
        file,
        folder_id=folder_id,
        links=links,
        tenant_slug=ctx.tenant.slug,
    )
    db.commit()
    return _doc_response(service, doc)


@router.get("/signatures", response_model=list[SignatureRequestResponse])
def list_signatures(
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> list[SignatureRequestResponse]:
    rows = DocumentService(db).list_signature_requests(ctx.tenant.id)
    return [SignatureRequestResponse.model_validate(r) for r in rows]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    service = DocumentService(db)
    doc = service._get_document(ctx.tenant.id, document_id)
    return _doc_response(service, doc)


@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: UUID,
    payload: DocumentUpdate,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    service = DocumentService(db)
    doc = service.update_document(ctx.tenant.id, ctx.membership.user_id, document_id, payload)
    db.commit()
    return _doc_response(service, doc)


@router.post("/{document_id}/move", response_model=DocumentResponse)
def move_document(
    document_id: UUID,
    payload: DocumentMoveRequest,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    service = DocumentService(db)
    doc = service.move_document(ctx.tenant.id, ctx.membership.user_id, document_id, payload.folder_id)
    db.commit()
    return _doc_response(service, doc)


@router.post("/{document_id}/star", response_model=DocumentResponse)
def star_document(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    service = DocumentService(db)
    doc = service.toggle_star(ctx.tenant.id, ctx.membership.user_id, document_id)
    db.commit()
    return _doc_response(service, doc)


@router.delete("/{document_id}", response_model=DocumentResponse)
def delete_document(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:delete")),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    service = DocumentService(db)
    doc = service.soft_delete(ctx.tenant.id, ctx.membership.user_id, document_id)
    db.commit()
    return _doc_response(service, doc)


@router.post("/{document_id}/restore", response_model=DocumentResponse)
def restore_document(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    service = DocumentService(db)
    doc = service.restore_document(ctx.tenant.id, ctx.membership.user_id, document_id)
    db.commit()
    return _doc_response(service, doc)


@router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> Response:
    service = DocumentService(db)
    doc, content, version = service.get_current_content(ctx.tenant.id, document_id)
    service.record_download(ctx.tenant.id, ctx.membership.user_id, document_id)
    db.commit()
    return Response(
        content=content,
        media_type=version.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{version.filename}"'},
    )


@router.post("/bulk-delete")
def bulk_delete(
    payload: DocumentBulkIds,
    ctx: TenantContext = Depends(require_permission("document:delete")),
    db: Session = Depends(get_db),
) -> dict:
    count = DocumentService(db).bulk_delete(ctx.tenant.id, ctx.membership.user_id, payload.document_ids)
    db.commit()
    return {"deleted": count}


@router.post("/bulk-move")
def bulk_move(
    payload: DocumentBulkMove,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> dict:
    count = DocumentService(db).bulk_move(
        ctx.tenant.id, ctx.membership.user_id, payload.document_ids, payload.folder_id
    )
    db.commit()
    return {"moved": count}


@router.post("/{document_id}/share", response_model=DocumentShareResponse, status_code=201)
def share_document(
    document_id: UUID,
    payload: DocumentShareCreate,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> DocumentShareResponse:
    share = DocumentService(db).share_document(
        ctx.tenant.id,
        ctx.membership.user_id,
        document_id,
        payload,
        tenant_slug=ctx.tenant.slug,
    )
    db.commit()
    return DocumentShareResponse.model_validate(share)


@router.get("/{document_id}/comments", response_model=list[DocumentCommentResponse])
def list_comments(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> list[DocumentCommentResponse]:
    comments = DocumentService(db).list_comments(ctx.tenant.id, document_id)
    return [DocumentCommentResponse.model_validate(c) for c in comments]


@router.post("/{document_id}/comments", response_model=DocumentCommentResponse, status_code=201)
def add_comment(
    document_id: UUID,
    payload: DocumentCommentCreate,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> DocumentCommentResponse:
    comment = DocumentService(db).add_comment(
        ctx.tenant.id, ctx.membership.user_id, document_id, payload
    )
    db.commit()
    return DocumentCommentResponse.model_validate(comment)


@router.get("/{document_id}/versions", response_model=list[DocumentVersionResponse])
def list_versions(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> list[DocumentVersionResponse]:
    versions = DocumentService(db).list_versions(ctx.tenant.id, document_id)
    return [DocumentVersionResponse.model_validate(v) for v in versions]


@router.get("/{document_id}/audit", response_model=list[AuditLogResponse])
def audit_trail(
    document_id: UUID,
    ctx: TenantContext = Depends(require_permission("document:read")),
    db: Session = Depends(get_db),
) -> list[AuditLogResponse]:
    logs = DocumentService(db).list_audit(ctx.tenant.id, document_id)
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.post("/{document_id}/signature-requests", response_model=SignatureRequestResponse, status_code=201)
def request_signature(
    document_id: UUID,
    payload: SignatureRequestCreate,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> SignatureRequestResponse:
    request = DocumentService(db).request_signature(
        ctx.tenant.id,
        ctx.membership.user_id,
        document_id,
        payload,
        tenant_slug=ctx.tenant.slug,
    )
    db.commit()
    return SignatureRequestResponse.model_validate(request)


@router.post("/signatures/{request_id}/sign", response_model=dict)
def sign_document(
    request_id: UUID,
    payload: SignDocumentRequest,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> dict:
    signer = DocumentService(db).sign_document(
        ctx.tenant.id, ctx.membership.user_id, request_id, payload, tenant_slug=ctx.tenant.slug
    )
    db.commit()
    return {"signer_id": str(signer.id), "status": signer.status}


@router.post("/signatures/{request_id}/reject", response_model=dict)
def reject_signature(
    request_id: UUID,
    payload: RejectSignatureRequest,
    ctx: TenantContext = Depends(require_permission("document:write")),
    db: Session = Depends(get_db),
) -> dict:
    signer = DocumentService(db).reject_signature(
        ctx.tenant.id, ctx.membership.user_id, request_id, payload
    )
    db.commit()
    return {"signer_id": str(signer.id), "status": signer.status}
