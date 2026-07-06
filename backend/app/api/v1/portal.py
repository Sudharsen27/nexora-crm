"""Customer portal workspace routes."""

import json
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.portal_deps import PortalContext, get_portal_context
from app.db.session import get_db
from app.schemas.portal import (
    PortalAiChatRequest,
    PortalDashboardResponse,
    PortalDealDetail,
    PortalDealSummary,
    PortalDocumentDetail,
    PortalDocumentSummary,
    PortalInvoiceSummary,
    PortalKnowledgeDetail,
    PortalKnowledgeSummary,
    PortalMeetingRequest,
    PortalMeetingSummary,
    PortalNotificationItem,
    PortalProfileUpdate,
    PortalTicketCreate,
    PortalTicketDetail,
    PortalTicketReplyCreate,
    PortalTicketReplyResponse,
    PortalTicketSummary,
    PortalTimelineItem,
    PortalAnnouncementSummary,
    PortalUserResponse,
)
from app.services.portal_auth_service import PortalAuthService
from app.services.portal_service import PortalService
from app.services.portal_ai_service import PortalAiService

router = APIRouter(prefix="/portal/{slug}", tags=["portal"])


@router.get("/dashboard", response_model=PortalDashboardResponse)
def portal_dashboard(
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
) -> PortalDashboardResponse:
    return PortalService(db).get_dashboard(ctx)


@router.get("/profile", response_model=PortalUserResponse)
def portal_profile(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalAuthService(db).to_user_response(ctx.portal_user, ctx.tenant)


@router.patch("/profile", response_model=PortalUserResponse)
def portal_update_profile(
    payload: PortalProfileUpdate,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    PortalService(db).update_profile(ctx, payload)
    db.refresh(ctx.portal_user)
    return PortalAuthService(db).to_user_response(ctx.portal_user, ctx.tenant)


@router.get("/organization")
def portal_organization(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).get_organization(ctx)


@router.get("/deals", response_model=list[PortalDealSummary])
def portal_list_deals(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).list_deals(ctx)


@router.get("/deals/{deal_id}", response_model=PortalDealDetail)
def portal_get_deal(
    deal_id: uuid.UUID,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).get_deal(ctx, deal_id)


@router.get("/documents", response_model=list[PortalDocumentSummary])
def portal_list_documents(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).list_documents(ctx)


@router.get("/documents/{document_id}", response_model=PortalDocumentDetail)
def portal_get_document(
    document_id: uuid.UUID,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).get_document(ctx, document_id)


@router.get("/documents/{document_id}/download")
def portal_download_document(
    document_id: uuid.UUID,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    from fastapi.responses import Response

    doc, content, version = PortalService(db).get_document_content(ctx, document_id)
    return Response(
        content=content,
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{version.filename}"'},
    )


@router.post("/documents/upload", response_model=PortalDocumentSummary)
async def portal_upload_document(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    description: str | None = Form(default=None),
    deal_id: uuid.UUID | None = Form(default=None),
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).upload_document(ctx, file, name=name, description=description, deal_id=deal_id)


@router.get("/meetings", response_model=list[PortalMeetingSummary])
def portal_list_meetings(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).list_meetings(ctx)


@router.get("/meetings/{meeting_id}", response_model=PortalMeetingSummary)
def portal_get_meeting(
    meeting_id: uuid.UUID,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).get_meeting(ctx, meeting_id)


@router.post("/meetings/request", response_model=PortalMeetingSummary)
def portal_request_meeting(
    payload: PortalMeetingRequest,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).request_meeting(ctx, payload)


@router.get("/tickets", response_model=list[PortalTicketSummary])
def portal_list_tickets(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).list_tickets(ctx)


@router.post("/tickets", response_model=PortalTicketDetail)
def portal_create_ticket(
    payload: PortalTicketCreate,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).create_ticket(ctx, payload)


@router.get("/tickets/{ticket_id}", response_model=PortalTicketDetail)
def portal_get_ticket(
    ticket_id: uuid.UUID,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).get_ticket(ctx, ticket_id)


@router.post("/tickets/{ticket_id}/replies", response_model=PortalTicketReplyResponse)
def portal_reply_ticket(
    ticket_id: uuid.UUID,
    payload: PortalTicketReplyCreate,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).reply_ticket(ctx, ticket_id, payload)


@router.get("/announcements", response_model=list[PortalAnnouncementSummary])
def portal_announcements(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).list_announcements(ctx)


@router.get("/knowledge", response_model=list[PortalKnowledgeSummary])
def portal_knowledge(
    q: str | None = None,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).list_knowledge(ctx, q=q)


@router.get("/knowledge/{article_slug}", response_model=PortalKnowledgeDetail)
def portal_knowledge_article(
    article_slug: str,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    return PortalService(db).get_knowledge(ctx, article_slug)


@router.get("/notifications", response_model=list[PortalNotificationItem])
def portal_notifications(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).list_notifications(ctx)


@router.post("/notifications/{notification_id}/read")
def portal_mark_notification_read(
    notification_id: uuid.UUID,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    PortalService(db).mark_notification_read(ctx, notification_id)
    return {"ok": True}


@router.get("/invoices", response_model=list[PortalInvoiceSummary])
def portal_invoices(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).list_invoices(ctx)


@router.get("/timeline", response_model=list[PortalTimelineItem])
def portal_timeline(ctx: PortalContext = Depends(get_portal_context), db: Session = Depends(get_db)):
    return PortalService(db).get_timeline(ctx)


@router.post("/ai/chat")
async def portal_ai_chat(
    payload: PortalAiChatRequest,
    ctx: PortalContext = Depends(get_portal_context),
    db: Session = Depends(get_db),
):
    service = PortalAiService(db)
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]

    async def event_stream():
        try:
            async for token in service.stream_chat(ctx, messages):
                yield f"data: {json.dumps({'content': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
