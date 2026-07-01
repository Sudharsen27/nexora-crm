from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.email import (
    EmailCreate,
    EmailForwardRequest,
    EmailListResponse,
    EmailReplyRequest,
    EmailResponse,
    EmailScheduleRequest,
    EmailSendRequest,
    EmailStatisticsResponse,
    EmailTemplateCreate,
    EmailTemplateListResponse,
    EmailTemplateResponse,
    EmailTemplateUpdate,
    EmailThreadResponse,
    EmailUpdate,
    EmailUserSettingsResponse,
    EmailUserSettingsUpdate,
)
from app.services.email_center_service import EmailCenterService, paginate

router = APIRouter(prefix="/tenants/{slug}/emails", tags=["emails"])

TRACKING_PIXEL = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00"
    b"\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


def _user_ref(user) -> dict | None:
    if not user:
        return None
    return {"id": user.id, "full_name": user.full_name, "email": user.email}


def _to_response(email) -> EmailResponse:
    return EmailResponse(
        id=email.id,
        tenant_id=email.tenant_id,
        thread_id=email.thread_id,
        parent_email_id=email.parent_email_id,
        sender_id=email.sender_id,
        sender=_user_ref(email.sender),
        created_by_id=email.created_by_id,
        created_by=_user_ref(email.created_by),
        template_id=email.template_id,
        from_email=email.from_email,
        from_name=email.from_name,
        subject=email.subject,
        body_html=email.body_html,
        body_text=email.body_text,
        status=email.status,
        priority=email.priority,
        folder=email.folder,
        direction=email.direction,
        is_read=email.is_read,
        is_starred=email.is_starred,
        is_important=email.is_important,
        has_attachments=email.has_attachments,
        scheduled_at=email.scheduled_at,
        sent_at=email.sent_at,
        archived_at=email.archived_at,
        company_id=email.company_id,
        contact_id=email.contact_id,
        lead_id=email.lead_id,
        deal_id=email.deal_id,
        task_id=email.task_id,
        meeting_id=email.meeting_id,
        activity_id=email.activity_id,
        metadata=email.email_metadata,
        recipients=[
            {
                "id": r.id,
                "recipient_type": r.recipient_type,
                "email_address": r.email_address,
                "display_name": r.display_name,
                "user_id": r.user_id,
                "contact_id": r.contact_id,
            }
            for r in email.recipients
        ],
        attachments=[
            {
                "id": a.id,
                "filename": a.filename,
                "content_type": a.content_type,
                "size_bytes": a.size_bytes,
                "created_at": a.created_at,
            }
            for a in email.attachments
        ],
        logs=[
            {
                "id": log.id,
                "event_type": log.event_type,
                "metadata": log.log_metadata,
                "created_at": log.created_at,
            }
            for log in email.logs
        ],
        created_at=email.created_at,
        updated_at=email.updated_at,
    )


def _to_template(template) -> EmailTemplateResponse:
    variables = template.template_variables
    if isinstance(variables, dict):
        variables = variables.get("variables")
    return EmailTemplateResponse(
        id=template.id,
        tenant_id=template.tenant_id,
        name=template.name,
        category=template.category,
        subject=template.subject,
        body_html=template.body_html,
        body_text=template.body_text,
        variables=variables,
        created_by_id=template.created_by_id,
        created_by=_user_ref(template.created_by),
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.get("", response_model=EmailListResponse)
def list_emails(
    folder: str | None = Query(default="inbox"),
    q: str | None = Query(default=None, max_length=200),
    unread: bool | None = Query(default=None),
    starred: bool | None = Query(default=None),
    important: bool | None = Query(default=None),
    has_attachments: bool | None = Query(default=None),
    scheduled: bool | None = Query(default=None),
    company_id: UUID | None = Query(default=None),
    contact_id: UUID | None = Query(default=None),
    lead_id: UUID | None = Query(default=None),
    deal_id: UUID | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    ctx: TenantContext = Depends(require_permission("email:read")),
    db: Session = Depends(get_db),
):
    items, total = EmailCenterService(db).list_emails(
        ctx.tenant.id,
        folder=folder,
        q=q,
        unread=unread,
        starred=starred,
        important=important,
        has_attachments=has_attachments,
        scheduled=scheduled,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        deal_id=deal_id,
        entity_type=entity_type,
        entity_id=entity_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    meta = paginate(total, page, page_size)
    return EmailListResponse(items=[_to_response(e) for e in items], **meta)


@router.get("/statistics", response_model=EmailStatisticsResponse)
def email_statistics(
    ctx: TenantContext = Depends(require_permission("email:read")),
    db: Session = Depends(get_db),
):
    return EmailCenterService(db).get_statistics(ctx.tenant.id, ctx.membership.user_id)


@router.get("/settings", response_model=EmailUserSettingsResponse)
def get_email_settings(
    ctx: TenantContext = Depends(require_permission("email:read")),
    db: Session = Depends(get_db),
):
    settings = EmailCenterService(db).get_settings(ctx.tenant.id, ctx.membership.user_id)
    return EmailUserSettingsResponse(
        signature_html=settings.signature_html,
        signature_text=settings.signature_text,
        default_from_name=settings.default_from_name,
    )


@router.patch("/settings", response_model=EmailUserSettingsResponse)
def update_email_settings(
    payload: EmailUserSettingsUpdate,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    settings = EmailCenterService(db).update_settings(ctx.tenant.id, ctx.membership.user_id, payload)
    return EmailUserSettingsResponse(
        signature_html=settings.signature_html,
        signature_text=settings.signature_text,
        default_from_name=settings.default_from_name,
    )


@router.get("/templates", response_model=EmailTemplateListResponse)
def list_templates(
    category: str | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("email:read")),
    db: Session = Depends(get_db),
):
    items = EmailCenterService(db).list_templates(ctx.tenant.id, category)
    return EmailTemplateListResponse(items=[_to_template(t) for t in items], total=len(items))


@router.post("/templates", response_model=EmailTemplateResponse, status_code=201)
def create_template(
    payload: EmailTemplateCreate,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    template = EmailCenterService(db).create_template(ctx.tenant.id, payload, ctx.membership.user_id)
    return _to_template(template)


@router.patch("/templates/{template_id}", response_model=EmailTemplateResponse)
def update_template(
    template_id: UUID,
    payload: EmailTemplateUpdate,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    template = EmailCenterService(db).update_template(ctx.tenant.id, template_id, payload)
    return _to_template(template)


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(
    template_id: UUID,
    ctx: TenantContext = Depends(require_permission("email:delete")),
    db: Session = Depends(get_db),
):
    EmailCenterService(db).delete_template(ctx.tenant.id, template_id)


@router.post("/templates/{template_id}/duplicate", response_model=EmailTemplateResponse, status_code=201)
def duplicate_template(
    template_id: UUID,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    template = EmailCenterService(db).duplicate_template(ctx.tenant.id, template_id, ctx.membership.user_id)
    return _to_template(template)


@router.get("/threads/{thread_id}", response_model=EmailThreadResponse)
def get_thread(
    thread_id: UUID,
    ctx: TenantContext = Depends(require_permission("email:read")),
    db: Session = Depends(get_db),
):
    thread, emails = EmailCenterService(db).get_thread(ctx.tenant.id, thread_id)
    return EmailThreadResponse(
        thread_id=thread.id,
        subject=thread.subject,
        last_message_at=thread.last_message_at,
        emails=[_to_response(e) for e in emails],
    )


@router.get("/{email_id}", response_model=EmailResponse)
def get_email(
    email_id: UUID,
    ctx: TenantContext = Depends(require_permission("email:read")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).get_email(ctx.tenant.id, email_id))


@router.post("", response_model=EmailResponse, status_code=201)
def create_email(
    payload: EmailCreate,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).create_draft(ctx.tenant.id, payload, ctx.membership.user_id))


@router.post("/draft", response_model=EmailResponse, status_code=201)
def save_draft(
    payload: EmailCreate,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).create_draft(ctx.tenant.id, payload, ctx.membership.user_id))


@router.patch("/{email_id}", response_model=EmailResponse)
def update_email(
    email_id: UUID,
    payload: EmailUpdate,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(
        EmailCenterService(db).update_email(ctx.tenant.id, email_id, payload, ctx.membership.user_id)
    )


@router.delete("/{email_id}", status_code=204)
def delete_email(
    email_id: UUID,
    permanent: bool = Query(default=False),
    ctx: TenantContext = Depends(require_permission("email:delete")),
    db: Session = Depends(get_db),
):
    service = EmailCenterService(db)
    if permanent:
        service.delete_email(ctx.tenant.id, email_id)
    else:
        service.trash_email(ctx.tenant.id, email_id)


@router.post("/send", response_model=EmailResponse)
def send_email(
    payload: EmailSendRequest,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).send_email(ctx.tenant.id, payload, ctx.membership.user_id))


@router.post("/schedule", response_model=EmailResponse)
def schedule_email(
    payload: EmailScheduleRequest,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).schedule_email(ctx.tenant.id, payload, ctx.membership.user_id))


@router.post("/{email_id}/reply", response_model=EmailResponse)
def reply_email(
    email_id: UUID,
    payload: EmailReplyRequest,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).reply_email(ctx.tenant.id, email_id, payload, ctx.membership.user_id))


@router.post("/{email_id}/forward", response_model=EmailResponse)
def forward_email(
    email_id: UUID,
    payload: EmailForwardRequest,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).forward_email(ctx.tenant.id, email_id, payload, ctx.membership.user_id))


@router.patch("/{email_id}/star", response_model=EmailResponse)
def star_email(
    email_id: UUID,
    starred: bool = Query(default=True),
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).star_email(ctx.tenant.id, email_id, starred))


@router.patch("/{email_id}/archive", response_model=EmailResponse)
def archive_email(
    email_id: UUID,
    archived: bool = Query(default=True),
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).archive_email(ctx.tenant.id, email_id, archived))


@router.patch("/{email_id}/read", response_model=EmailResponse)
def mark_read(
    email_id: UUID,
    read: bool = Query(default=True),
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    return _to_response(EmailCenterService(db).mark_read(ctx.tenant.id, email_id, read))


@router.post("/{email_id}/attachments", status_code=201)
async def upload_attachment(
    email_id: UUID,
    file: UploadFile = File(...),
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    attachment = await EmailCenterService(db).upload_attachment(ctx.tenant.id, email_id, file)
    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "content_type": attachment.content_type,
        "size_bytes": attachment.size_bytes,
        "created_at": attachment.created_at,
    }


@router.get("/{email_id}/attachments/{attachment_id}")
def download_attachment(
    email_id: UUID,
    attachment_id: UUID,
    ctx: TenantContext = Depends(require_permission("email:read")),
    db: Session = Depends(get_db),
):
    email = EmailCenterService(db).get_email(ctx.tenant.id, email_id)
    attachment = next((a for a in email.attachments if a.id == attachment_id), None)
    if attachment is None:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    return FileResponse(attachment.storage_path, filename=attachment.filename, media_type=attachment.content_type)


@router.delete("/{email_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(
    email_id: UUID,
    attachment_id: UUID,
    ctx: TenantContext = Depends(require_permission("email:write")),
    db: Session = Depends(get_db),
):
    EmailCenterService(db).delete_attachment(ctx.tenant.id, email_id, attachment_id)


tracking_router = APIRouter(prefix="/emails/track", tags=["email-tracking"])


@tracking_router.get("/open/{token}")
def track_open(token: str, db: Session = Depends(get_db)):
    EmailCenterService(db).track_open(token)
    return Response(content=TRACKING_PIXEL, media_type="image/gif")


@tracking_router.get("/click/{token}")
def track_click(token: str, url: str = Query(...), db: Session = Depends(get_db)):
    redirect_url = EmailCenterService(db).track_click(token, url)
    return RedirectResponse(redirect_url, status_code=302)
