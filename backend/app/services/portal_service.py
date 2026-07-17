"""Customer portal business logic."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.portal_deps import PortalContext
from app.db.mixins import utcnow
from app.models.activity import Activity
from app.models.company import Company
from app.models.deal import DEAL_STAGE_LABELS, OPEN_DEAL_STAGES, Deal
from app.models.document import Document, DocumentVersion, SignatureRequest, SignatureSigner
from app.models.meeting import Meeting
from app.models.portal import (
    Announcement,
    KnowledgeArticle,
    PortalAuditLog,
    PortalInvoice,
    PortalNotification,
    SupportTicket,
    TicketReply,
)
from app.schemas.portal import (
    PortalAnnouncementSummary,
    PortalDashboardResponse,
    PortalDealDetail,
    PortalDealSummary,
    PortalDocumentDetail,
    PortalDocumentSummary,
    PortalDocumentVersion,
    PortalInvoiceSummary,
    PortalKnowledgeDetail,
    PortalKnowledgeSummary,
    PortalKpiWidget,
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
)
from app.services.document_storage import DocumentStorage
from app.services.notification_hooks import notify_all_members_except, notify_user
from app.services.portal_scope import (
    can_access_deal,
    can_access_document,
    scope_deals,
    scope_documents,
    scope_invoices,
    scope_meetings,
)
from app.services.support_service import SupportService, generate_ticket_number
from app.services.workflow_trigger_service import dispatch_workflow_trigger


class PortalService:
    def __init__(self, db: Session):
        self.db = db
        self.storage = DocumentStorage()

    def _audit(self, ctx: PortalContext, action: str, **kwargs) -> None:
        self.db.add(
            PortalAuditLog(
                tenant_id=ctx.tenant.id,
                portal_user_id=ctx.portal_user.id,
                action=action,
                resource_type=kwargs.get("resource_type"),
                resource_id=kwargs.get("resource_id"),
                detail=kwargs.get("detail"),
                created_at=utcnow(),
            )
        )

    def _notify(
        self,
        ctx: PortalContext,
        notification_type: str,
        title: str,
        body: str | None = None,
        link: str | None = None,
    ) -> None:
        self.db.add(
            PortalNotification(
                tenant_id=ctx.tenant.id,
                portal_user_id=ctx.portal_user.id,
                notification_type=notification_type,
                title=title,
                body=body,
                link=link,
                created_at=utcnow(),
            )
        )

    def get_dashboard(self, ctx: PortalContext) -> PortalDashboardResponse:
        tid = ctx.tenant.id
        deal_scope = scope_deals(ctx)

        open_deals_count = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(Deal.tenant_id == tid, deal_scope, Deal.stage.in_(OPEN_DEAL_STAGES))
        ) or 0
        completed_deals = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(Deal.tenant_id == tid, deal_scope, Deal.stage == "won")
        ) or 0
        upcoming_meetings_count = self.db.scalar(
            select(func.count())
            .select_from(Meeting)
            .where(
                Meeting.tenant_id == tid,
                scope_meetings(ctx),
                Meeting.start_datetime >= utcnow(),
                Meeting.status.in_(("scheduled", "confirmed")),
            )
        ) or 0
        open_tickets = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(
                SupportTicket.tenant_id == tid,
                SupportTicket.portal_user_id == ctx.portal_user.id,
                SupportTicket.status.notin_(("resolved", "closed")),
            )
        ) or 0
        unread_notifications = self.db.scalar(
            select(func.count())
            .select_from(PortalNotification)
            .where(
                PortalNotification.tenant_id == tid,
                PortalNotification.portal_user_id == ctx.portal_user.id,
                PortalNotification.is_read.is_(False),
            )
        ) or 0
        outstanding_payments = self.db.scalar(
            select(func.count())
            .select_from(PortalInvoice)
            .where(
                PortalInvoice.tenant_id == tid,
                scope_invoices(ctx),
                PortalInvoice.status.in_(("sent", "overdue")),
            )
        ) or 0

        pending_signatures = 0
        if ctx.portal_user.email:
            pending_signatures = self.db.scalar(
                select(func.count())
                .select_from(SignatureSigner)
                .join(SignatureRequest, SignatureSigner.request_id == SignatureRequest.id)
                .where(
                    SignatureSigner.tenant_id == tid,
                    SignatureSigner.email == ctx.portal_user.email.lower(),
                    SignatureSigner.status == "pending",
                )
            ) or 0

        open_deals = self.list_deals(ctx, limit=5, open_only=True)
        meetings = self.list_meetings(ctx, upcoming_only=True, limit=5)
        documents = self.list_documents(ctx, limit=5)
        activities = self.get_timeline(ctx, limit=8)
        announcements = self.list_announcements(ctx, limit=3)

        kpis = [
            PortalKpiWidget(key="open_deals", label="Open deals", value=open_deals_count),
            PortalKpiWidget(key="completed_deals", label="Completed deals", value=completed_deals),
            PortalKpiWidget(key="meetings", label="Upcoming meetings", value=upcoming_meetings_count),
            PortalKpiWidget(key="tickets", label="Open tickets", value=open_tickets),
            PortalKpiWidget(key="notifications", label="Unread notifications", value=unread_notifications),
            PortalKpiWidget(key="payments", label="Outstanding payments", value=outstanding_payments),
        ]

        return PortalDashboardResponse(
            kpis=kpis,
            open_deals=open_deals,
            upcoming_meetings=meetings,
            recent_documents=documents,
            recent_activities=activities,
            announcements=announcements,
            unread_notifications=unread_notifications,
            pending_signatures=pending_signatures,
            open_tickets=open_tickets,
            outstanding_payments=outstanding_payments,
        )

    def list_deals(
        self,
        ctx: PortalContext,
        *,
        limit: int = 50,
        open_only: bool = False,
    ) -> list[PortalDealSummary]:
        q = (
            select(Deal)
            .where(Deal.tenant_id == ctx.tenant.id, scope_deals(ctx))
            .order_by(Deal.updated_at.desc())
            .limit(limit)
        )
        if open_only:
            q = q.where(Deal.stage.in_(OPEN_DEAL_STAGES))
        deals = self.db.scalars(q).all()
        return [self._deal_summary(d) for d in deals]

    def get_deal(self, ctx: PortalContext, deal_id: uuid.UUID) -> PortalDealDetail:
        deal = self.db.get(Deal, deal_id)
        if deal is None or not can_access_deal(ctx, deal):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")

        timeline = self.get_timeline(ctx, entity_type="deal", entity_id=deal.id, limit=20)
        summary = self._deal_summary(deal)
        return PortalDealDetail(
            **summary.model_dump(),
            description=deal.description,
            timeline=timeline,
        )

    def _deal_summary(self, deal: Deal) -> PortalDealSummary:
        return PortalDealSummary(
            id=deal.id,
            title=deal.title,
            stage=deal.stage,
            stage_label=DEAL_STAGE_LABELS.get(deal.stage, deal.stage),
            value=deal.value,
            currency=deal.currency,
            probability=deal.probability,
            expected_close_date=deal.expected_close_date,
            updated_at=deal.updated_at,
        )

    def list_documents(self, ctx: PortalContext, *, limit: int = 50) -> list[PortalDocumentSummary]:
        docs = self.db.scalars(
            select(Document)
            .where(
                Document.tenant_id == ctx.tenant.id,
                Document.deleted_at.is_(None),
                scope_documents(ctx),
            )
            .order_by(Document.updated_at.desc())
            .limit(limit)
        ).all()
        return [self._doc_summary(d) for d in docs]

    def get_document(self, ctx: PortalContext, document_id: uuid.UUID) -> PortalDocumentDetail:
        doc = self.db.scalar(
            select(Document)
            .options(joinedload(Document.versions))
            .where(Document.id == document_id, Document.deleted_at.is_(None))
        )
        if doc is None or not can_access_document(ctx, doc):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        versions = sorted(doc.versions, key=lambda v: v.version_number, reverse=True)
        summary = self._doc_summary(doc)
        self._audit(ctx, "document_download", resource_type="document", resource_id=doc.id)
        self.db.commit()
        return PortalDocumentDetail(
            **summary.model_dump(),
            description=doc.description,
            versions=[
                PortalDocumentVersion(
                    version_number=v.version_number,
                    filename=v.filename,
                    size_bytes=v.size_bytes,
                    created_at=v.created_at,
                )
                for v in versions
            ],
        )

    def get_document_content(self, ctx: PortalContext, document_id: uuid.UUID) -> tuple[Document, bytes, str]:
        doc = self.db.get(Document, document_id)
        if doc is None or not can_access_document(ctx, doc):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        version = self.db.scalar(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == doc.id, DocumentVersion.version_number == doc.current_version)
        )
        if version is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document version not found")
        content = self.storage.retrieve(
            version.storage_backend, version.storage_key or "", version.content
        )
        self._audit(ctx, "document_download", resource_type="document", resource_id=doc.id)
        self.db.commit()
        return doc, content, version.filename

    def upload_document(
        self,
        ctx: PortalContext,
        file: UploadFile,
        *,
        name: str | None = None,
        description: str | None = None,
        deal_id: uuid.UUID | None = None,
    ) -> PortalDocumentSummary:
        if deal_id:
            deal = self.db.get(Deal, deal_id)
            if deal is None or not can_access_deal(ctx, deal):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")

        raw = file.file.read()
        filename = file.filename or "upload"
        mime = file.content_type or "application/octet-stream"
        doc_name = name or filename

        doc = Document(
            tenant_id=ctx.tenant.id,
            name=doc_name,
            description=description,
            status="pending_review",
            mime_type=mime,
            extension=filename.rsplit(".", 1)[-1].lower() if "." in filename else "",
            size_bytes=len(raw),
            contact_id=ctx.portal_user.contact_id,
            company_id=ctx.portal_user.company_id,
            deal_id=deal_id,
        )
        self.db.add(doc)
        self.db.flush()

        backend, storage_key, db_content = self.storage.store(
            ctx.tenant.id,
            doc.id,
            1,
            filename,
            raw,
            mime,
        )
        version = DocumentVersion(
            document_id=doc.id,
            tenant_id=ctx.tenant.id,
            version_number=1,
            filename=filename,
            mime_type=mime,
            size_bytes=len(raw),
            storage_backend=backend,
            storage_key=storage_key or None,
            content=db_content,
            created_at=utcnow(),
        )
        self.db.add(version)
        self._notify(ctx, "document_uploaded", "Document uploaded", f"{doc_name} is pending review")
        self._audit(ctx, "document_upload", resource_type="document", resource_id=doc.id)
        self.db.commit()
        self.db.refresh(doc)
        return self._doc_summary(doc)

    def _doc_summary(self, doc: Document) -> PortalDocumentSummary:
        return PortalDocumentSummary(
            id=doc.id,
            name=doc.name,
            status=doc.status,
            mime_type=doc.mime_type,
            size_bytes=doc.size_bytes,
            current_version=doc.current_version,
            updated_at=doc.updated_at,
            deal_id=doc.deal_id,
        )

    def list_meetings(
        self,
        ctx: PortalContext,
        *,
        upcoming_only: bool = False,
        limit: int = 50,
    ) -> list[PortalMeetingSummary]:
        q = (
            select(Meeting)
            .where(Meeting.tenant_id == ctx.tenant.id, scope_meetings(ctx))
            .order_by(Meeting.start_datetime.asc())
            .limit(limit)
        )
        if upcoming_only:
            q = q.where(
                Meeting.start_datetime >= utcnow(),
                Meeting.status.in_(("scheduled", "confirmed")),
            )
        meetings = self.db.scalars(q).all()
        return [self._meeting_summary(m) for m in meetings]

    def get_meeting(self, ctx: PortalContext, meeting_id: uuid.UUID) -> PortalMeetingSummary:
        meeting = self.db.get(Meeting, meeting_id)
        if meeting is None or meeting.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
        if not (
            (ctx.portal_user.contact_id and meeting.contact_id == ctx.portal_user.contact_id)
            or (ctx.portal_user.company_id and meeting.company_id == ctx.portal_user.company_id)
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
        return self._meeting_summary(meeting)

    def request_meeting(self, ctx: PortalContext, payload: PortalMeetingRequest) -> PortalMeetingSummary:
        meeting = Meeting(
            tenant_id=ctx.tenant.id,
            title=payload.title,
            description=(payload.description or "") + "\n\n[Requested via customer portal]",
            meeting_type=payload.meeting_type,
            status="scheduled",
            start_datetime=payload.preferred_start,
            end_datetime=payload.preferred_end,
            contact_id=ctx.portal_user.contact_id,
            company_id=ctx.portal_user.company_id,
        )
        self.db.add(meeting)
        self._notify(ctx, "meeting_scheduled", "Meeting request submitted", payload.title)
        self.db.commit()
        self.db.refresh(meeting)
        return self._meeting_summary(meeting)

    def _meeting_summary(self, meeting: Meeting) -> PortalMeetingSummary:
        return PortalMeetingSummary(
            id=meeting.id,
            title=meeting.title,
            status=meeting.status,
            meeting_type=meeting.meeting_type,
            start_datetime=meeting.start_datetime,
            end_datetime=meeting.end_datetime,
            location=meeting.location,
            meeting_url=meeting.meeting_url,
        )

    def list_tickets(self, ctx: PortalContext) -> list[PortalTicketSummary]:
        tickets = self.db.scalars(
            select(SupportTicket)
            .where(
                SupportTicket.tenant_id == ctx.tenant.id,
                SupportTicket.portal_user_id == ctx.portal_user.id,
            )
            .order_by(SupportTicket.updated_at.desc())
        ).all()
        result = []
        for ticket in tickets:
            reply_count = self.db.scalar(
                select(func.count()).select_from(TicketReply).where(TicketReply.ticket_id == ticket.id)
            ) or 0
            result.append(
                PortalTicketSummary(
                    id=ticket.id,
                    subject=ticket.subject,
                    status=ticket.status,
                    priority=ticket.priority,
                    category=ticket.category,
                    created_at=ticket.created_at,
                    updated_at=ticket.updated_at,
                    reply_count=reply_count,
                )
            )
        return result

    def create_ticket(self, ctx: PortalContext, payload: PortalTicketCreate) -> PortalTicketDetail:
        ticket = SupportTicket(
            tenant_id=ctx.tenant.id,
            portal_user_id=ctx.portal_user.id,
            contact_id=ctx.portal_user.contact_id,
            company_id=ctx.portal_user.company_id,
            ticket_number=generate_ticket_number(self.db, ctx.tenant.id),
            subject=payload.subject,
            description=payload.description,
            status="new",
            priority=payload.priority,
            category=payload.category,
            channel="portal",
            source="portal",
        )
        SupportService(self.db).ensure_default_policies(ctx.tenant.id)
        SupportService(self.db)._apply_sla(ticket)
        self.db.add(ticket)
        self.db.flush()
        self._audit(ctx, "ticket_created", resource_type="ticket", resource_id=ticket.id)
        self._notify(ctx, "ticket_created", "Support ticket created", payload.subject)
        notify_all_members_except(
            self.db,
            tenant_id=ctx.tenant.id,
            actor_id=None,
            type="ticket_created",
            title="New portal support ticket",
            message=f'"{payload.subject}" ({ticket.ticket_number})',
            entity_type="ticket",
            entity_id=ticket.id,
        )
        self.db.commit()
        dispatch_workflow_trigger(
            ctx.tenant.id,
            "ticket_created",
            {
                "ticket_id": str(ticket.id),
                "ticket_number": ticket.ticket_number,
                "status": ticket.status,
                "priority": ticket.priority,
                "channel": ticket.channel,
                "source": ticket.source,
            },
            entity_type="ticket",
            entity_id=ticket.id,
        )
        return self.get_ticket(ctx, ticket.id)

    def get_ticket(self, ctx: PortalContext, ticket_id: uuid.UUID) -> PortalTicketDetail:
        ticket = self.db.scalar(
            select(SupportTicket)
            .options(joinedload(SupportTicket.replies))
            .where(
                SupportTicket.id == ticket_id,
                SupportTicket.tenant_id == ctx.tenant.id,
                SupportTicket.portal_user_id == ctx.portal_user.id,
            )
        )
        if ticket is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        replies = sorted(ticket.replies, key=lambda r: r.created_at)
        reply_responses = []
        for reply in replies:
            author_name = ctx.portal_user.full_name if reply.author_type == "portal" else "Support Team"
            reply_responses.append(
                PortalTicketReplyResponse(
                    id=reply.id,
                    author_type=reply.author_type,
                    author_name=author_name,
                    body=reply.body,
                    created_at=reply.created_at,
                )
            )
        return PortalTicketDetail(
            id=ticket.id,
            subject=ticket.subject,
            status=ticket.status,
            priority=ticket.priority,
            category=ticket.category,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            reply_count=len(replies),
            description=ticket.description,
            replies=reply_responses,
        )

    def reply_ticket(
        self,
        ctx: PortalContext,
        ticket_id: uuid.UUID,
        payload: PortalTicketReplyCreate,
    ) -> PortalTicketReplyResponse:
        ticket = self.db.get(SupportTicket, ticket_id)
        if ticket is None or ticket.portal_user_id != ctx.portal_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        reply = TicketReply(
            ticket_id=ticket.id,
            tenant_id=ctx.tenant.id,
            author_type="portal",
            portal_user_id=ctx.portal_user.id,
            body=payload.body,
        )
        ticket.status = "open" if ticket.status == "waiting_customer" else ticket.status
        ticket.last_customer_reply_at = utcnow()
        ticket.updated_at = utcnow()
        self.db.add(reply)
        self._audit(ctx, "ticket_reply", resource_type="ticket", resource_id=ticket.id)
        if ticket.assigned_to_id:
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ticket.assigned_to_id,
                actor_id=None,
                type="customer_replied",
                title="Customer replied to ticket",
                message=f'"{ticket.subject}" ({ticket.ticket_number})',
                entity_type="ticket",
                entity_id=ticket.id,
            )
        self.db.commit()
        self.db.refresh(reply)
        return PortalTicketReplyResponse(
            id=reply.id,
            author_type="portal",
            author_name=ctx.portal_user.full_name,
            body=reply.body,
            created_at=reply.created_at,
        )

    def list_announcements(self, ctx: PortalContext, *, limit: int = 20) -> list[PortalAnnouncementSummary]:
        rows = self.db.scalars(
            select(Announcement)
            .where(Announcement.tenant_id == ctx.tenant.id, Announcement.is_published.is_(True))
            .order_by(Announcement.published_at.desc().nullslast(), Announcement.created_at.desc())
            .limit(limit)
        ).all()
        return [
            PortalAnnouncementSummary(
                id=a.id,
                title=a.title,
                body=a.body,
                published_at=a.published_at,
                created_at=a.created_at,
            )
            for a in rows
        ]

    def list_knowledge(self, ctx: PortalContext, *, q: str | None = None) -> list[PortalKnowledgeSummary]:
        stmt = select(KnowledgeArticle).where(
            KnowledgeArticle.tenant_id == ctx.tenant.id,
            KnowledgeArticle.is_published.is_(True),
        )
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(
                or_(
                    KnowledgeArticle.title.ilike(pattern),
                    KnowledgeArticle.summary.ilike(pattern),
                    KnowledgeArticle.body.ilike(pattern),
                )
            )
        rows = self.db.scalars(stmt.order_by(KnowledgeArticle.title)).all()
        return [
            PortalKnowledgeSummary(
                id=a.id,
                title=a.title,
                slug=a.slug,
                summary=a.summary,
                category=a.category,
                view_count=a.view_count,
            )
            for a in rows
        ]

    def get_knowledge(self, ctx: PortalContext, slug: str) -> PortalKnowledgeDetail:
        article = self.db.scalar(
            select(KnowledgeArticle).where(
                KnowledgeArticle.tenant_id == ctx.tenant.id,
                KnowledgeArticle.slug == slug,
                KnowledgeArticle.is_published.is_(True),
            )
        )
        if article is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        article.view_count += 1
        self.db.commit()
        return PortalKnowledgeDetail(
            id=article.id,
            title=article.title,
            slug=article.slug,
            summary=article.summary,
            category=article.category,
            view_count=article.view_count,
            body=article.body,
        )

    def list_notifications(self, ctx: PortalContext) -> list[PortalNotificationItem]:
        rows = self.db.scalars(
            select(PortalNotification)
            .where(
                PortalNotification.tenant_id == ctx.tenant.id,
                PortalNotification.portal_user_id == ctx.portal_user.id,
            )
            .order_by(PortalNotification.created_at.desc())
            .limit(100)
        ).all()
        return [
            PortalNotificationItem(
                id=n.id,
                notification_type=n.notification_type,
                title=n.title,
                body=n.body,
                link=n.link,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in rows
        ]

    def mark_notification_read(self, ctx: PortalContext, notification_id: uuid.UUID) -> None:
        note = self.db.get(PortalNotification, notification_id)
        if note is None or note.portal_user_id != ctx.portal_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        note.is_read = True
        self.db.commit()

    def list_invoices(self, ctx: PortalContext) -> list[PortalInvoiceSummary]:
        rows = self.db.scalars(
            select(PortalInvoice)
            .where(PortalInvoice.tenant_id == ctx.tenant.id, scope_invoices(ctx))
            .order_by(PortalInvoice.created_at.desc())
        ).all()
        return [
            PortalInvoiceSummary(
                id=inv.id,
                invoice_number=inv.invoice_number,
                amount=inv.amount,
                currency=inv.currency,
                status=inv.status,
                due_date=inv.due_date,
                deal_id=inv.deal_id,
                document_id=inv.document_id,
            )
            for inv in rows
        ]

    def get_timeline(
        self,
        ctx: PortalContext,
        *,
        limit: int = 30,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
    ) -> list[PortalTimelineItem]:
        items: list[PortalTimelineItem] = []

        deal_ids = list(
            self.db.scalars(
                select(Deal.id).where(Deal.tenant_id == ctx.tenant.id, scope_deals(ctx))
            ).all()
        )

        if entity_type == "deal" and entity_id:
            deal_ids = [entity_id] if entity_id in deal_ids else []

        if deal_ids:
            activities = self.db.scalars(
                select(Activity)
                .where(
                    Activity.tenant_id == ctx.tenant.id,
                    Activity.entity_type == "deal",
                    Activity.entity_id.in_(deal_ids),
                    Activity.archived_at.is_(None),
                )
                .order_by(Activity.created_at.desc())
                .limit(limit)
            ).all()
            for act in activities:
                items.append(
                    PortalTimelineItem(
                        id=str(act.id),
                        event_type=act.activity_type,
                        title=act.title,
                        detail=act.description,
                        occurred_at=act.created_at,
                        entity_type=act.entity_type,
                        entity_id=act.entity_id,
                    )
                )

        tickets = self.db.scalars(
            select(SupportTicket)
            .where(
                SupportTicket.tenant_id == ctx.tenant.id,
                SupportTicket.portal_user_id == ctx.portal_user.id,
            )
            .order_by(SupportTicket.updated_at.desc())
            .limit(10)
        ).all()
        for ticket in tickets:
            items.append(
                PortalTimelineItem(
                    id=f"ticket-{ticket.id}",
                    event_type="ticket",
                    title=ticket.subject,
                    detail=f"Status: {ticket.status}",
                    occurred_at=ticket.updated_at,
                    entity_type="ticket",
                    entity_id=ticket.id,
                )
            )

        items.sort(key=lambda x: x.occurred_at, reverse=True)
        return items[:limit]

    def update_profile(self, ctx: PortalContext, payload: PortalProfileUpdate) -> None:
        user = ctx.portal_user
        if payload.full_name is not None:
            user.full_name = payload.full_name.strip()
        if payload.job_title is not None:
            user.job_title = payload.job_title
        if payload.phone is not None:
            user.phone = payload.phone
        self._audit(ctx, "profile_update")
        self.db.commit()

    def get_organization(self, ctx: PortalContext) -> dict:
        company = ctx.company
        if company is None and ctx.portal_user.company_id:
            company = self.db.get(Company, ctx.portal_user.company_id)
        return {
            "tenant_name": ctx.tenant.name,
            "company_id": str(company.id) if company else None,
            "company_name": company.name if company else ctx.contact.company,
            "contact_name": f"{ctx.contact.first_name} {ctx.contact.last_name}".strip(),
            "contact_email": ctx.contact.email,
            "contact_phone": ctx.contact.phone,
        }
