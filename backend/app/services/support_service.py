"""Enterprise support & service desk business logic (Phase 19)."""

from __future__ import annotations

import math
import re
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.mixins import utcnow
from app.models import Company, Contact, TenantMembership, User
from app.models.portal import KnowledgeArticle, SupportTicket, TicketReply
from app.models.support import (
    OPEN_TICKET_STATUSES,
    RESOLVED_TICKET_STATUSES,
    ChatConversation,
    ChatMessage,
    CustomerFeedback,
    KnowledgeArticleVersion,
    KnowledgeCategory,
    SlaPolicy,
)
from app.schemas.support import (
    AiKnowledgeSuggestion,
    AiSupportAssistResponse,
    AgentLeaderboardItem,
    AgentPerformanceItem,
    ChatConversationCreate,
    ChatMessageCreate,
    CsatTrendItem,
    FeedbackCreate,
    KnowledgeArticleCreate,
    KnowledgeArticleUpdate,
    KnowledgeCategoryCreate,
    KnowledgeCategoryUpdate,
    SlaPerformanceItem,
    SlaPolicyCreate,
    SlaPolicyUpdate,
    SupportAnalyticsResponse,
    SupportDashboardResponse,
    TicketAssign,
    TicketBulkAction,
    TicketCreate,
    TicketEscalate,
    TicketMerge,
    TicketReplyCreate,
    TicketSplit,
    TicketUpdate,
    VolumeByDayItem,
)
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_all_members_except, notify_user
from app.services.workflow_trigger_service import dispatch_workflow_trigger


def paginate(total: int, page: int, page_size: int) -> dict:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)) if page_size else 1,
    }


def generate_ticket_number(db: Session, tenant_id: uuid.UUID) -> str:
    """Module-level helper for portal and staff ticket creation."""
    service = SupportService(db)
    return service._next_ticket_number(tenant_id)


def ticket_to_response(ticket: SupportTicket, db: Session, *, reply_count: int | None = None):
    """Map SupportTicket ORM row to TicketResponse-compatible dict."""
    from app.schemas.support import CompanyRef, ContactRef, TicketResponse, UserRef

    assignee = db.get(User, ticket.assigned_to_id) if ticket.assigned_to_id else None
    contact = db.get(Contact, ticket.contact_id) if ticket.contact_id else None
    company = db.get(Company, ticket.company_id) if ticket.company_id else None
    if reply_count is None:
        reply_count = db.scalar(
            select(func.count()).select_from(TicketReply).where(TicketReply.ticket_id == ticket.id)
        ) or 0
    return TicketResponse(
        id=ticket.id,
        tenant_id=ticket.tenant_id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        category=ticket.category,
        channel=ticket.channel,
        source=ticket.source,
        escalation_level=ticket.escalation_level,
        assigned_to_id=ticket.assigned_to_id,
        assigned_to=UserRef(id=assignee.id, full_name=assignee.full_name, email=assignee.email)
        if assignee
        else None,
        contact_id=ticket.contact_id,
        contact=ContactRef(
            id=contact.id,
            first_name=contact.first_name,
            last_name=contact.last_name,
            email=contact.email,
        )
        if contact
        else None,
        company_id=ticket.company_id,
        company=CompanyRef(id=company.id, company_name=company.company_name) if company else None,
        portal_user_id=ticket.portal_user_id,
        created_by_id=ticket.created_by_id,
        sla_policy_id=ticket.sla_policy_id,
        first_response_at=ticket.first_response_at,
        response_due_at=ticket.response_due_at,
        resolution_due_at=ticket.resolution_due_at,
        escalation_due_at=ticket.escalation_due_at,
        sla_breached=ticket.sla_breached,
        sentiment=ticket.sentiment,
        tags=ticket.tags or [],
        parent_ticket_id=ticket.parent_ticket_id,
        merged_into_id=ticket.merged_into_id,
        is_archived=ticket.is_archived,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        last_customer_reply_at=ticket.last_customer_reply_at,
        last_agent_reply_at=ticket.last_agent_reply_at,
        csat_score=ticket.csat_score,
        reply_count=reply_count,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def chat_to_response(convo: ChatConversation, db: Session):
    from app.schemas.support import ChatConversationResponse, UserRef

    assignee = db.get(User, convo.assigned_to_id) if convo.assigned_to_id else None
    msg_count = db.scalar(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.conversation_id == convo.id)
    ) or 0
    return ChatConversationResponse(
        id=convo.id,
        tenant_id=convo.tenant_id,
        ticket_id=convo.ticket_id,
        contact_id=convo.contact_id,
        company_id=convo.company_id,
        visitor_name=convo.visitor_name,
        visitor_email=convo.visitor_email,
        channel=convo.channel,
        status=convo.status,
        assigned_to_id=convo.assigned_to_id,
        assigned_to=UserRef(id=assignee.id, full_name=assignee.full_name, email=assignee.email)
        if assignee
        else None,
        rating=convo.rating,
        rating_comment=convo.rating_comment,
        started_at=convo.started_at,
        ended_at=convo.ended_at,
        last_message_at=convo.last_message_at,
        message_count=msg_count,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
    )


class SupportService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _slugify(self, text: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
        return slug or "item"

    def _next_ticket_number(self, tenant_id: uuid.UUID) -> str:
        rows = self.db.scalars(
            select(SupportTicket.ticket_number)
            .where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.ticket_number.isnot(None),
            )
            .order_by(SupportTicket.created_at.desc())
            .limit(50)
        ).all()
        max_num = 0
        for row in rows:
            if row and row.startswith("TKT-"):
                try:
                    max_num = max(max_num, int(row.split("-", 1)[1]))
                except (ValueError, IndexError):
                    pass
        return f"TKT-{max_num + 1:05d}"

    def _validate_assignee(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
        if user_id is None:
            return
        membership = self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.user_id == user_id,
                TenantMembership.status == "active",
            )
        )
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user is not an active member of this organization",
            )

    def _validate_contact(self, tenant_id: uuid.UUID, contact_id: uuid.UUID | None) -> None:
        if contact_id is None:
            return
        contact = self.db.scalar(
            select(Contact).where(Contact.id == contact_id, Contact.tenant_id == tenant_id)
        )
        if contact is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact not found")

    def _validate_company(self, tenant_id: uuid.UUID, company_id: uuid.UUID | None) -> None:
        if company_id is None:
            return
        company = self.db.scalar(
            select(Company).where(Company.id == company_id, Company.tenant_id == tenant_id)
        )
        if company is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company not found")

    def _base_ticket_query(self, tenant_id: uuid.UUID):
        return select(SupportTicket).where(
            SupportTicket.tenant_id == tenant_id,
            SupportTicket.merged_into_id.is_(None),
        )

    def _get_ticket(self, tenant_id: uuid.UUID, ticket_id: uuid.UUID) -> SupportTicket:
        ticket = self.db.scalar(
            self._base_ticket_query(tenant_id).where(SupportTicket.id == ticket_id)
        )
        if ticket is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        return ticket

    def _load_user(self, user_id: uuid.UUID | None) -> User | None:
        if not user_id:
            return None
        return self.db.get(User, user_id)

    def _load_contact(self, contact_id: uuid.UUID | None) -> Contact | None:
        if not contact_id:
            return None
        return self.db.get(Contact, contact_id)

    def _load_company(self, company_id: uuid.UUID | None) -> Company | None:
        if not company_id:
            return None
        return self.db.get(Company, company_id)

    def _log_activity(
        self,
        tenant_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        ticket: SupportTicket,
        action: str,
        title: str,
        description: str,
        metadata: dict | None = None,
    ) -> None:
        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=actor_id,
            entity_type="ticket",
            entity_id=ticket.id,
            action=action,
            title=title,
            description=description,
            metadata=metadata,
        )

    def _dispatch(self, tenant_id: uuid.UUID, trigger: str, ticket: SupportTicket, actor_id: uuid.UUID | None) -> None:
        dispatch_workflow_trigger(
            tenant_id,
            trigger,
            {
                "ticket_id": str(ticket.id),
                "ticket_number": ticket.ticket_number,
                "status": ticket.status,
                "priority": ticket.priority,
                "assigned_to_id": str(ticket.assigned_to_id) if ticket.assigned_to_id else None,
                "channel": ticket.channel,
                "source": ticket.source,
            },
            entity_type="ticket",
            entity_id=ticket.id,
            actor_id=actor_id,
        )

    def _apply_sla(self, ticket: SupportTicket) -> None:
        policy = self.db.scalar(
            select(SlaPolicy)
            .where(
                SlaPolicy.tenant_id == ticket.tenant_id,
                SlaPolicy.is_active.is_(True),
                SlaPolicy.priority == ticket.priority,
            )
            .order_by(SlaPolicy.is_default.desc())
            .limit(1)
        )
        if policy is None:
            policy = self.db.scalar(
                select(SlaPolicy).where(
                    SlaPolicy.tenant_id == ticket.tenant_id,
                    SlaPolicy.is_active.is_(True),
                    SlaPolicy.is_default.is_(True),
                )
            )
        if policy is None:
            return

        now = utcnow()
        ticket.sla_policy_id = policy.id
        ticket.response_due_at = now + timedelta(minutes=policy.response_minutes)
        ticket.resolution_due_at = now + timedelta(minutes=policy.resolution_minutes)
        ticket.escalation_due_at = now + timedelta(minutes=policy.escalation_minutes)

    def _check_sla_breach(self, ticket: SupportTicket, *, notify: bool = False) -> bool:
        now = utcnow()
        breached = False
        if ticket.response_due_at and not ticket.first_response_at and now > ticket.response_due_at:
            breached = True
        if (
            ticket.resolution_due_at
            and ticket.status not in RESOLVED_TICKET_STATUSES
            and now > ticket.resolution_due_at
        ):
            breached = True
        newly = breached and not ticket.sla_breached
        if newly:
            ticket.sla_breached = True
            if notify and ticket.assigned_to_id:
                notify_user(
                    self.db,
                    tenant_id=ticket.tenant_id,
                    user_id=ticket.assigned_to_id,
                    actor_id=None,
                    type="sla_breached",
                    title="SLA breached",
                    message=f'Ticket "{ticket.subject}" ({ticket.ticket_number}) breached SLA',
                    entity_type="ticket",
                    entity_id=ticket.id,
                    priority="urgent",
                )
        return breached

    def ensure_default_policies(self, tenant_id: uuid.UUID) -> None:
        existing = self.db.scalar(
            select(func.count()).select_from(SlaPolicy).where(SlaPolicy.tenant_id == tenant_id)
        )
        if existing:
            return
        defaults = [
            ("Critical", "critical", 15, 120, 60, "level_3"),
            ("High", "high", 30, 240, 120, "level_2"),
            ("Medium", "medium", 60, 480, 240, "level_2"),
            ("Low", "low", 240, 1440, 720, "level_1"),
        ]
        for idx, (name, priority, resp, resol, esc, level) in enumerate(defaults):
            self.db.add(
                SlaPolicy(
                    tenant_id=tenant_id,
                    name=name,
                    priority=priority,
                    response_minutes=resp,
                    resolution_minutes=resol,
                    escalation_minutes=esc,
                    escalate_to_level=level,
                    is_default=(idx == 2),
                )
            )
        self.db.flush()

    # ------------------------------------------------------------------
    # Tickets — CRUD & actions
    # ------------------------------------------------------------------

    def list_tickets(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        status_filter: str | None = None,
        priority: str | None = None,
        channel: str | None = None,
        assigned_to_id: uuid.UUID | None = None,
        company_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        category: str | None = None,
        sla_breached: bool | None = None,
        is_archived: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[SupportTicket], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        query = self._base_ticket_query(tenant_id)

        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                or_(
                    SupportTicket.subject.ilike(term),
                    SupportTicket.description.ilike(term),
                    SupportTicket.ticket_number.ilike(term),
                )
            )
        if status_filter:
            query = query.where(SupportTicket.status == status_filter)
        if priority:
            query = query.where(SupportTicket.priority == priority)
        if channel:
            query = query.where(SupportTicket.channel == channel)
        if assigned_to_id:
            query = query.where(SupportTicket.assigned_to_id == assigned_to_id)
        if company_id:
            query = query.where(SupportTicket.company_id == company_id)
        if contact_id:
            query = query.where(SupportTicket.contact_id == contact_id)
        if category:
            query = query.where(SupportTicket.category == category)
        if sla_breached is not None:
            query = query.where(SupportTicket.sla_breached.is_(sla_breached))
        if is_archived is not None:
            query = query.where(SupportTicket.is_archived.is_(is_archived))
        else:
            query = query.where(SupportTicket.is_archived.is_(False))

        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        tickets = list(
            self.db.scalars(
                query.order_by(SupportTicket.updated_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return tickets, total

    def get_ticket(self, tenant_id: uuid.UUID, ticket_id: uuid.UUID) -> SupportTicket:
        ticket = self.db.scalar(
            select(SupportTicket)
            .options(joinedload(SupportTicket.replies))
            .where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.id == ticket_id,
            )
        )
        if ticket is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        return ticket

    def create_ticket(
        self,
        tenant_id: uuid.UUID,
        payload: TicketCreate,
        created_by_id: uuid.UUID,
    ) -> SupportTicket:
        self.ensure_default_policies(tenant_id)
        self._validate_assignee(tenant_id, payload.assigned_to_id)
        self._validate_contact(tenant_id, payload.contact_id)
        self._validate_company(tenant_id, payload.company_id)

        ticket = SupportTicket(
            tenant_id=tenant_id,
            ticket_number=self._next_ticket_number(tenant_id),
            subject=payload.subject,
            description=payload.description,
            status="new",
            priority=payload.priority,
            category=payload.category,
            channel=payload.channel,
            source="staff",
            contact_id=payload.contact_id,
            company_id=payload.company_id,
            assigned_to_id=payload.assigned_to_id,
            created_by_id=created_by_id,
            tags=payload.tags,
        )
        if payload.assigned_to_id:
            ticket.status = "assigned"
        self._apply_sla(ticket)
        self.db.add(ticket)
        self.db.flush()

        self._log_activity(
            tenant_id,
            created_by_id,
            ticket,
            "ticket_created",
            "Ticket created",
            f'Ticket "{ticket.subject}" ({ticket.ticket_number}) was created',
        )
        if payload.assigned_to_id:
            notify_user(
                self.db,
                tenant_id=tenant_id,
                user_id=payload.assigned_to_id,
                actor_id=created_by_id,
                type="ticket_assigned",
                title="Ticket assigned to you",
                message=f'"{ticket.subject}" ({ticket.ticket_number})',
                entity_type="ticket",
                entity_id=ticket.id,
            )

        self.db.commit()
        self._dispatch(tenant_id, "ticket_created", ticket, created_by_id)
        if payload.assigned_to_id:
            self._dispatch(tenant_id, "ticket_assigned", ticket, created_by_id)
        return self.get_ticket(tenant_id, ticket.id)

    def update_ticket(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        payload: TicketUpdate,
        actor_id: uuid.UUID,
    ) -> SupportTicket:
        ticket = self._get_ticket(tenant_id, ticket_id)
        data = payload.model_dump(exclude_unset=True)
        old_assignee = ticket.assigned_to_id
        old_status = ticket.status

        if "assigned_to_id" in data:
            self._validate_assignee(tenant_id, data["assigned_to_id"])
        if "contact_id" in data:
            self._validate_contact(tenant_id, data["contact_id"])
        if "company_id" in data:
            self._validate_company(tenant_id, data["company_id"])

        priority_changed = "priority" in data and data["priority"] != ticket.priority
        for field, value in data.items():
            setattr(ticket, field, value)

        if priority_changed:
            self._apply_sla(ticket)

        if ticket.status in RESOLVED_TICKET_STATUSES and old_status not in RESOLVED_TICKET_STATUSES:
            ticket.resolved_at = utcnow()
        if ticket.status == "closed" and old_status != "closed":
            ticket.closed_at = utcnow()

        self._check_sla_breach(ticket)
        self._log_activity(
            tenant_id,
            actor_id,
            ticket,
            "ticket_updated",
            "Ticket updated",
            f'Ticket "{ticket.subject}" was updated',
        )

        if "assigned_to_id" in data and data["assigned_to_id"] != old_assignee:
            notify_user(
                self.db,
                tenant_id=tenant_id,
                user_id=data["assigned_to_id"],
                actor_id=actor_id,
                type="ticket_assigned",
                title="Ticket assigned to you",
                message=f'"{ticket.subject}" ({ticket.ticket_number})',
                entity_type="ticket",
                entity_id=ticket.id,
            )

        self.db.commit()
        if "assigned_to_id" in data and data["assigned_to_id"] != old_assignee:
            self._dispatch(tenant_id, "ticket_assigned", ticket, actor_id)
        if ticket.status in RESOLVED_TICKET_STATUSES and old_status not in RESOLVED_TICKET_STATUSES:
            self._dispatch(tenant_id, "ticket_resolved", ticket, actor_id)
        if ticket.status == "closed" and old_status != "closed":
            self._dispatch(tenant_id, "ticket_closed", ticket, actor_id)
        return self.get_ticket(tenant_id, ticket_id)

    def delete_ticket(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        actor_id: uuid.UUID,
        *,
        hard: bool = False,
    ) -> None:
        ticket = self._get_ticket(tenant_id, ticket_id)
        if hard:
            self._log_activity(
                tenant_id,
                actor_id,
                ticket,
                "ticket_deleted",
                "Ticket deleted",
                f'Ticket "{ticket.subject}" was permanently deleted',
            )
            self.db.delete(ticket)
        else:
            ticket.is_archived = True
            self._log_activity(
                tenant_id,
                actor_id,
                ticket,
                "ticket_archived",
                "Ticket archived",
                f'Ticket "{ticket.subject}" was archived',
            )
        self.db.commit()

    def assign_ticket(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        payload: TicketAssign,
        actor_id: uuid.UUID,
    ) -> SupportTicket:
        ticket = self._get_ticket(tenant_id, ticket_id)
        self._validate_assignee(tenant_id, payload.assigned_to_id)
        ticket.assigned_to_id = payload.assigned_to_id
        if ticket.status == "new":
            ticket.status = "assigned"
        self._log_activity(
            tenant_id,
            actor_id,
            ticket,
            "ticket_assigned",
            "Ticket assigned",
            f'Ticket "{ticket.subject}" was assigned',
            metadata={"assigned_to_id": str(payload.assigned_to_id)},
        )
        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=payload.assigned_to_id,
            actor_id=actor_id,
            type="ticket_assigned",
            title="Ticket assigned to you",
            message=f'"{ticket.subject}" ({ticket.ticket_number})',
            entity_type="ticket",
            entity_id=ticket.id,
        )
        self.db.commit()
        self._dispatch(tenant_id, "ticket_assigned", ticket, actor_id)
        return self.get_ticket(tenant_id, ticket_id)

    def transfer_ticket(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        payload: TicketAssign,
        actor_id: uuid.UUID,
    ) -> SupportTicket:
        return self.assign_ticket(tenant_id, ticket_id, payload, actor_id)

    def escalate_ticket(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        payload: TicketEscalate,
        actor_id: uuid.UUID,
    ) -> SupportTicket:
        ticket = self._get_ticket(tenant_id, ticket_id)
        ticket.escalation_level = payload.escalation_level
        ticket.status = "escalated"
        self._log_activity(
            tenant_id,
            actor_id,
            ticket,
            "ticket_escalated",
            "Ticket escalated",
            payload.note or f'Ticket escalated to {payload.escalation_level}',
        )
        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=ticket.assigned_to_id,
            actor_id=actor_id,
            type="ticket_escalated",
            title="Ticket escalated",
            message=f'"{ticket.subject}" escalated to {payload.escalation_level}',
            entity_type="ticket",
            entity_id=ticket.id,
            priority="high",
        )
        self.db.commit()
        self._dispatch(tenant_id, "ticket_escalated", ticket, actor_id)
        return self.get_ticket(tenant_id, ticket_id)

    def merge_tickets(
        self,
        tenant_id: uuid.UUID,
        target_id: uuid.UUID,
        payload: TicketMerge,
        actor_id: uuid.UUID,
    ) -> SupportTicket:
        target = self._get_ticket(tenant_id, target_id)
        source = self._get_ticket(tenant_id, payload.source_ticket_id)
        if source.id == target.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot merge ticket into itself")

        for reply in source.replies:
            reply.ticket_id = target.id
        source.merged_into_id = target.id
        source.status = "closed"
        source.is_archived = True
        source.closed_at = utcnow()

        self._log_activity(
            tenant_id,
            actor_id,
            target,
            "ticket_merged",
            "Tickets merged",
            f'Merged {source.ticket_number} into {target.ticket_number}',
            metadata={"source_id": str(source.id)},
        )
        self.db.commit()
        return self.get_ticket(tenant_id, target_id)

    def split_ticket(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        payload: TicketSplit,
        actor_id: uuid.UUID,
    ) -> SupportTicket:
        parent = self._get_ticket(tenant_id, ticket_id)
        child = SupportTicket(
            tenant_id=tenant_id,
            ticket_number=self._next_ticket_number(tenant_id),
            subject=payload.subject,
            description=payload.description,
            status="new",
            priority=parent.priority,
            category=parent.category,
            channel=parent.channel,
            source=parent.source,
            contact_id=parent.contact_id,
            company_id=parent.company_id,
            portal_user_id=parent.portal_user_id,
            parent_ticket_id=parent.id,
            created_by_id=actor_id,
        )
        self._apply_sla(child)
        self.db.add(child)
        self.db.flush()
        self._log_activity(
            tenant_id,
            actor_id,
            child,
            "ticket_split",
            "Ticket split",
            f'Split from {parent.ticket_number} as {child.ticket_number}',
            metadata={"parent_id": str(parent.id)},
        )
        self.db.commit()
        self._dispatch(tenant_id, "ticket_created", child, actor_id)
        return self.get_ticket(tenant_id, child.id)

    def close_ticket(self, tenant_id: uuid.UUID, ticket_id: uuid.UUID, actor_id: uuid.UUID) -> SupportTicket:
        ticket = self._get_ticket(tenant_id, ticket_id)
        ticket.status = "closed"
        ticket.closed_at = utcnow()
        self._log_activity(
            tenant_id,
            actor_id,
            ticket,
            "ticket_closed",
            "Ticket closed",
            f'Ticket "{ticket.subject}" was closed',
        )
        self.db.commit()
        self._dispatch(tenant_id, "ticket_closed", ticket, actor_id)
        return self.get_ticket(tenant_id, ticket_id)

    def reopen_ticket(self, tenant_id: uuid.UUID, ticket_id: uuid.UUID, actor_id: uuid.UUID) -> SupportTicket:
        ticket = self._get_ticket(tenant_id, ticket_id)
        ticket.status = "open"
        ticket.resolved_at = None
        ticket.closed_at = None
        self._log_activity(
            tenant_id,
            actor_id,
            ticket,
            "ticket_reopened",
            "Ticket reopened",
            f'Ticket "{ticket.subject}" was reopened',
        )
        self.db.commit()
        return self.get_ticket(tenant_id, ticket_id)

    def archive_ticket(self, tenant_id: uuid.UUID, ticket_id: uuid.UUID, actor_id: uuid.UUID) -> SupportTicket:
        ticket = self._get_ticket(tenant_id, ticket_id)
        ticket.is_archived = True
        self._log_activity(
            tenant_id,
            actor_id,
            ticket,
            "ticket_archived",
            "Ticket archived",
            f'Ticket "{ticket.subject}" was archived',
        )
        self.db.commit()
        return self.get_ticket(tenant_id, ticket_id)

    def bulk_action(
        self,
        tenant_id: uuid.UUID,
        payload: TicketBulkAction,
        actor_id: uuid.UUID,
    ) -> dict:
        updated = 0
        for tid in payload.ticket_ids:
            try:
                ticket = self._get_ticket(tenant_id, tid)
            except HTTPException:
                continue
            if payload.action == "assign" and payload.assigned_to_id:
                self._validate_assignee(tenant_id, payload.assigned_to_id)
                ticket.assigned_to_id = payload.assigned_to_id
                if ticket.status == "new":
                    ticket.status = "assigned"
            elif payload.action == "close":
                ticket.status = "closed"
                ticket.closed_at = utcnow()
            elif payload.action == "archive":
                ticket.is_archived = True
            elif payload.action == "escalate":
                ticket.status = "escalated"
                if payload.escalation_level:
                    ticket.escalation_level = payload.escalation_level
            elif payload.action == "priority" and payload.priority:
                ticket.priority = payload.priority
                self._apply_sla(ticket)
            updated += 1
        self.db.commit()
        return {"updated": updated, "total": len(payload.ticket_ids)}

    def add_reply(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        payload: TicketReplyCreate,
        actor_id: uuid.UUID,
    ) -> TicketReply:
        ticket = self._get_ticket(tenant_id, ticket_id)
        reply = TicketReply(
            ticket_id=ticket.id,
            tenant_id=tenant_id,
            author_type="staff",
            staff_user_id=actor_id,
            body=payload.body,
            is_internal=payload.is_internal,
        )
        now = utcnow()
        if not payload.is_internal:
            if not ticket.first_response_at:
                ticket.first_response_at = now
            ticket.last_agent_reply_at = now
            if ticket.status in ("new", "assigned"):
                ticket.status = "in_progress"
        self.db.add(reply)
        self._check_sla_breach(ticket)
        self._log_activity(
            tenant_id,
            actor_id,
            ticket,
            "ticket_replied",
            "Ticket reply added",
            f'Reply added to "{ticket.subject}"',
            metadata={"is_internal": payload.is_internal},
        )
        self.db.commit()
        self._dispatch(tenant_id, "ticket_replied", ticket, actor_id)
        self.db.refresh(reply)
        return reply

    def list_replies(self, tenant_id: uuid.UUID, ticket_id: uuid.UUID) -> list[TicketReply]:
        self._get_ticket(tenant_id, ticket_id)
        return list(
            self.db.scalars(
                select(TicketReply)
                .where(TicketReply.ticket_id == ticket_id, TicketReply.tenant_id == tenant_id)
                .order_by(TicketReply.created_at)
            ).all()
        )

    # ------------------------------------------------------------------
    # SLA
    # ------------------------------------------------------------------

    def list_sla_policies(self, tenant_id: uuid.UUID) -> list[SlaPolicy]:
        self.ensure_default_policies(tenant_id)
        return list(
            self.db.scalars(
                select(SlaPolicy)
                .where(SlaPolicy.tenant_id == tenant_id)
                .order_by(SlaPolicy.priority)
            ).all()
        )

    def create_sla_policy(
        self, tenant_id: uuid.UUID, payload: SlaPolicyCreate, actor_id: uuid.UUID
    ) -> SlaPolicy:
        if payload.is_default:
            for p in self.db.scalars(select(SlaPolicy).where(SlaPolicy.tenant_id == tenant_id)).all():
                p.is_default = False
        policy = SlaPolicy(tenant_id=tenant_id, **payload.model_dump())
        self.db.add(policy)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def update_sla_policy(
        self,
        tenant_id: uuid.UUID,
        policy_id: uuid.UUID,
        payload: SlaPolicyUpdate,
    ) -> SlaPolicy:
        policy = self.db.scalar(
            select(SlaPolicy).where(SlaPolicy.id == policy_id, SlaPolicy.tenant_id == tenant_id)
        )
        if policy is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")
        data = payload.model_dump(exclude_unset=True)
        if data.get("is_default"):
            for p in self.db.scalars(select(SlaPolicy).where(SlaPolicy.tenant_id == tenant_id)).all():
                p.is_default = False
        for field, value in data.items():
            setattr(policy, field, value)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def delete_sla_policy(self, tenant_id: uuid.UUID, policy_id: uuid.UUID) -> None:
        policy = self.db.scalar(
            select(SlaPolicy).where(SlaPolicy.id == policy_id, SlaPolicy.tenant_id == tenant_id)
        )
        if policy is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")
        self.db.delete(policy)
        self.db.commit()

    def check_overdue_and_escalate(self, tenant_id: uuid.UUID) -> dict:
        now = utcnow()
        escalated = 0
        tickets = self.db.scalars(
            select(SupportTicket).where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.status.in_(OPEN_TICKET_STATUSES),
                SupportTicket.escalation_due_at.isnot(None),
                SupportTicket.escalation_due_at < now,
                SupportTicket.is_archived.is_(False),
            )
        ).all()
        for ticket in tickets:
            if ticket.status != "escalated":
                ticket.status = "escalated"
                ticket.escalation_level = "level_2"
                self._check_sla_breach(ticket, notify=True)
                escalated += 1
        self.db.commit()
        return {"escalated": escalated, "scanned": len(tickets)}

    # ------------------------------------------------------------------
    # Knowledge base
    # ------------------------------------------------------------------

    def _unique_slug(self, tenant_id: uuid.UUID, base: str, table, exclude_id: uuid.UUID | None = None) -> str:
        slug = base
        counter = 1
        while True:
            q = select(table).where(table.tenant_id == tenant_id, table.slug == slug)
            if exclude_id:
                q = q.where(table.id != exclude_id)
            if self.db.scalar(select(func.count()).select_from(q.subquery())) == 0:
                return slug
            slug = f"{base}-{counter}"
            counter += 1

    def list_knowledge_articles(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        status_filter: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[KnowledgeArticle], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        query = select(KnowledgeArticle).where(KnowledgeArticle.tenant_id == tenant_id)
        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                or_(
                    KnowledgeArticle.title.ilike(term),
                    KnowledgeArticle.summary.ilike(term),
                    KnowledgeArticle.body.ilike(term),
                )
            )
        if status_filter:
            query = query.where(KnowledgeArticle.status == status_filter)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        articles = list(
            self.db.scalars(
                query.order_by(KnowledgeArticle.updated_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return articles, total

    def get_knowledge_article(self, tenant_id: uuid.UUID, article_id: uuid.UUID) -> KnowledgeArticle:
        article = self.db.scalar(
            select(KnowledgeArticle).where(
                KnowledgeArticle.id == article_id,
                KnowledgeArticle.tenant_id == tenant_id,
            )
        )
        if article is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        return article

    def create_knowledge_article(
        self,
        tenant_id: uuid.UUID,
        payload: KnowledgeArticleCreate,
        actor_id: uuid.UUID,
    ) -> KnowledgeArticle:
        slug = self._unique_slug(tenant_id, self._slugify(payload.title), KnowledgeArticle)
        is_published = payload.status == "published"
        article = KnowledgeArticle(
            tenant_id=tenant_id,
            title=payload.title,
            slug=slug,
            summary=payload.summary,
            body=payload.body,
            category=payload.category,
            category_id=payload.category_id,
            content_type=payload.content_type,
            status=payload.status,
            tags=payload.tags,
            video_url=payload.video_url,
            is_published=is_published,
            created_by_id=actor_id,
            published_at=utcnow() if is_published else None,
        )
        self.db.add(article)
        self.db.flush()
        self.db.add(
            KnowledgeArticleVersion(
                tenant_id=tenant_id,
                article_id=article.id,
                version=1,
                title=article.title,
                body=article.body,
                summary=article.summary,
                changed_by_id=actor_id,
            )
        )
        self.db.commit()
        return self.get_knowledge_article(tenant_id, article.id)

    def update_knowledge_article(
        self,
        tenant_id: uuid.UUID,
        article_id: uuid.UUID,
        payload: KnowledgeArticleUpdate,
        actor_id: uuid.UUID,
    ) -> KnowledgeArticle:
        article = self.get_knowledge_article(tenant_id, article_id)
        data = payload.model_dump(exclude_unset=True)
        change_note = data.pop("change_note", None)
        if "title" in data:
            article.slug = self._unique_slug(
                tenant_id, self._slugify(data["title"]), KnowledgeArticle, exclude_id=article.id
            )
        if "status" in data:
            article.is_published = data["status"] == "published"
            if article.is_published and not article.published_at:
                article.published_at = utcnow()
        for field, value in data.items():
            setattr(article, field, value)
        article.updated_by_id = actor_id
        article.version += 1
        self.db.add(
            KnowledgeArticleVersion(
                tenant_id=tenant_id,
                article_id=article.id,
                version=article.version,
                title=article.title,
                body=article.body,
                summary=article.summary,
                changed_by_id=actor_id,
                change_note=change_note,
            )
        )
        self.db.commit()
        return self.get_knowledge_article(tenant_id, article_id)

    def delete_knowledge_article(self, tenant_id: uuid.UUID, article_id: uuid.UUID) -> None:
        article = self.get_knowledge_article(tenant_id, article_id)
        self.db.delete(article)
        self.db.commit()

    def list_knowledge_categories(self, tenant_id: uuid.UUID) -> list[KnowledgeCategory]:
        return list(
            self.db.scalars(
                select(KnowledgeCategory)
                .where(KnowledgeCategory.tenant_id == tenant_id)
                .order_by(KnowledgeCategory.sort_order, KnowledgeCategory.name)
            ).all()
        )

    def create_knowledge_category(
        self, tenant_id: uuid.UUID, payload: KnowledgeCategoryCreate
    ) -> KnowledgeCategory:
        slug = self._unique_slug(tenant_id, self._slugify(payload.name), KnowledgeCategory)
        cat = KnowledgeCategory(tenant_id=tenant_id, slug=slug, **payload.model_dump())
        self.db.add(cat)
        self.db.commit()
        self.db.refresh(cat)
        return cat

    def update_knowledge_category(
        self,
        tenant_id: uuid.UUID,
        category_id: uuid.UUID,
        payload: KnowledgeCategoryUpdate,
    ) -> KnowledgeCategory:
        cat = self.db.scalar(
            select(KnowledgeCategory).where(
                KnowledgeCategory.id == category_id,
                KnowledgeCategory.tenant_id == tenant_id,
            )
        )
        if cat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        data = payload.model_dump(exclude_unset=True)
        if "name" in data:
            cat.slug = self._unique_slug(
                tenant_id, self._slugify(data["name"]), KnowledgeCategory, exclude_id=cat.id
            )
        for field, value in data.items():
            setattr(cat, field, value)
        self.db.commit()
        self.db.refresh(cat)
        return cat

    def search_knowledge(self, tenant_id: uuid.UUID, q: str, limit: int = 10) -> list[KnowledgeArticle]:
        term = f"%{q.strip()}%"
        return list(
            self.db.scalars(
                select(KnowledgeArticle)
                .where(
                    KnowledgeArticle.tenant_id == tenant_id,
                    or_(
                        KnowledgeArticle.title.ilike(term),
                        KnowledgeArticle.summary.ilike(term),
                        KnowledgeArticle.body.ilike(term),
                    ),
                )
                .order_by(KnowledgeArticle.view_count.desc())
                .limit(limit)
            ).all()
        )

    # ------------------------------------------------------------------
    # Chat
    # ------------------------------------------------------------------

    def list_conversations(
        self,
        tenant_id: uuid.UUID,
        *,
        status_filter: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ChatConversation], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        query = select(ChatConversation).where(ChatConversation.tenant_id == tenant_id)
        if status_filter:
            query = query.where(ChatConversation.status == status_filter)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        convos = list(
            self.db.scalars(
                query.order_by(ChatConversation.last_message_at.desc().nullslast())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return convos, total

    def get_conversation(self, tenant_id: uuid.UUID, conversation_id: uuid.UUID) -> ChatConversation:
        convo = self.db.scalar(
            select(ChatConversation)
            .options(joinedload(ChatConversation.messages))
            .where(
                ChatConversation.id == conversation_id,
                ChatConversation.tenant_id == tenant_id,
            )
        )
        if convo is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        return convo

    def start_conversation(
        self,
        tenant_id: uuid.UUID,
        payload: ChatConversationCreate,
        actor_id: uuid.UUID,
    ) -> ChatConversation:
        self._validate_contact(tenant_id, payload.contact_id)
        self._validate_company(tenant_id, payload.company_id)
        now = utcnow()
        convo = ChatConversation(
            tenant_id=tenant_id,
            contact_id=payload.contact_id,
            company_id=payload.company_id,
            visitor_name=payload.visitor_name,
            visitor_email=payload.visitor_email,
            channel=payload.channel,
            ticket_id=payload.ticket_id,
            status="active",
            assigned_to_id=actor_id,
            started_at=now,
            last_message_at=now,
        )
        self.db.add(convo)
        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=actor_id,
            entity_type="chat",
            entity_id=convo.id,
            action="chat_started",
            title="Chat started",
            description="Live chat conversation started",
        )
        self.db.commit()
        return self.get_conversation(tenant_id, convo.id)

    def send_message(
        self,
        tenant_id: uuid.UUID,
        conversation_id: uuid.UUID,
        payload: ChatMessageCreate,
        actor_id: uuid.UUID,
        *,
        author_type: str = "agent",
    ) -> ChatMessage:
        convo = self.get_conversation(tenant_id, conversation_id)
        user = self._load_user(actor_id)
        msg = ChatMessage(
            tenant_id=tenant_id,
            conversation_id=convo.id,
            author_type=author_type,
            author_id=actor_id,
            author_name=user.full_name if user else None,
            message_type=payload.message_type,
            body=payload.body,
            is_internal=payload.is_internal,
        )
        convo.last_message_at = utcnow()
        if convo.status == "waiting":
            convo.status = "active"
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def transfer_chat(
        self,
        tenant_id: uuid.UUID,
        conversation_id: uuid.UUID,
        assigned_to_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> ChatConversation:
        convo = self.get_conversation(tenant_id, conversation_id)
        self._validate_assignee(tenant_id, assigned_to_id)
        convo.assigned_to_id = assigned_to_id
        convo.status = "transferred"
        self.db.add(
            ChatMessage(
                tenant_id=tenant_id,
                conversation_id=convo.id,
                author_type="system",
                message_type="system",
                body=f"Chat transferred to agent",
            )
        )
        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=assigned_to_id,
            actor_id=actor_id,
            type="chat_transferred",
            title="Chat transferred to you",
            message="A live chat has been transferred to you",
            entity_type="chat",
            entity_id=convo.id,
        )
        self.db.commit()
        return self.get_conversation(tenant_id, conversation_id)

    def rate_chat(
        self,
        tenant_id: uuid.UUID,
        conversation_id: uuid.UUID,
        rating: int,
        comment: str | None = None,
    ) -> ChatConversation:
        convo = self.get_conversation(tenant_id, conversation_id)
        convo.rating = rating
        convo.rating_comment = comment
        self.db.commit()
        return self.get_conversation(tenant_id, conversation_id)

    def resolve_chat(
        self, tenant_id: uuid.UUID, conversation_id: uuid.UUID, actor_id: uuid.UUID
    ) -> ChatConversation:
        convo = self.get_conversation(tenant_id, conversation_id)
        convo.status = "resolved"
        convo.ended_at = utcnow()
        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=actor_id,
            entity_type="chat",
            entity_id=convo.id,
            action="chat_resolved",
            title="Chat resolved",
            description="Live chat conversation resolved",
        )
        self.db.commit()
        return self.get_conversation(tenant_id, conversation_id)

    # ------------------------------------------------------------------
    # Feedback
    # ------------------------------------------------------------------

    def create_feedback(self, tenant_id: uuid.UUID, payload: FeedbackCreate) -> CustomerFeedback:
        fb = CustomerFeedback(tenant_id=tenant_id, **payload.model_dump())
        self.db.add(fb)
        agent_id = payload.agent_id
        if payload.ticket_id:
            ticket = self.db.get(SupportTicket, payload.ticket_id)
            if ticket and ticket.tenant_id == tenant_id:
                ticket.csat_score = payload.score
                agent_id = agent_id or ticket.assigned_to_id
        if agent_id:
            notify_user(
                self.db,
                tenant_id=tenant_id,
                user_id=agent_id,
                actor_id=None,
                type="feedback_received",
                title="Customer feedback received",
                message=f"{payload.feedback_type.upper()} score: {payload.score}",
                entity_type="ticket",
                entity_id=payload.ticket_id,
                priority="normal",
            )
        self.db.commit()
        self.db.refresh(fb)
        return fb

    def list_feedback(
        self,
        tenant_id: uuid.UUID,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CustomerFeedback], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        query = select(CustomerFeedback).where(CustomerFeedback.tenant_id == tenant_id)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = list(
            self.db.scalars(
                query.order_by(CustomerFeedback.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return items, total

    # ------------------------------------------------------------------
    # Dashboard & analytics
    # ------------------------------------------------------------------

    def get_dashboard(self, tenant_id: uuid.UUID) -> SupportDashboardResponse:
        now = utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        today_tickets = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(SupportTicket.tenant_id == tenant_id, SupportTicket.created_at >= today_start)
        ) or 0
        open_tickets = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.status.in_(OPEN_TICKET_STATUSES),
                SupportTicket.is_archived.is_(False),
            )
        ) or 0
        pending_tickets = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.status == "waiting_customer",
                SupportTicket.is_archived.is_(False),
            )
        ) or 0
        resolved_tickets = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.status.in_(RESOLVED_TICKET_STATUSES),
            )
        ) or 0
        overdue_tickets = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.status.in_(OPEN_TICKET_STATUSES),
                SupportTicket.resolution_due_at.isnot(None),
                SupportTicket.resolution_due_at < now,
                SupportTicket.is_archived.is_(False),
            )
        ) or 0
        sla_violations = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(SupportTicket.tenant_id == tenant_id, SupportTicket.sla_breached.is_(True))
        ) or 0

        avg_response = self._avg_response_minutes(tenant_id)
        avg_resolution = self._avg_resolution_minutes(tenant_id)
        csat_score = self.db.scalar(
            select(func.avg(CustomerFeedback.score)).where(
                CustomerFeedback.tenant_id == tenant_id,
                CustomerFeedback.feedback_type == "csat",
            )
        ) or 0.0

        agent_perf = self.get_agent_leaderboard(tenant_id, limit=5)
        agent_items = [
            AgentPerformanceItem(
                user_id=a.user_id,
                full_name=a.full_name,
                tickets_assigned=self.db.scalar(
                    select(func.count())
                    .select_from(SupportTicket)
                    .where(
                        SupportTicket.tenant_id == tenant_id,
                        SupportTicket.assigned_to_id == a.user_id,
                    )
                )
                or 0,
                tickets_resolved=a.tickets_resolved,
                avg_response_minutes=avg_response,
                avg_resolution_minutes=a.avg_resolution_minutes,
                csat_avg=a.csat_avg,
            )
            for a in agent_perf
        ]

        recent_tickets, _ = self.list_tickets(tenant_id, page=1, page_size=5)
        recent_chats, _ = self.list_conversations(tenant_id, page=1, page_size=5)

        return SupportDashboardResponse(
            today_tickets=today_tickets,
            open_tickets=open_tickets,
            pending_tickets=pending_tickets,
            resolved_tickets=resolved_tickets,
            overdue_tickets=overdue_tickets,
            sla_violations=sla_violations,
            avg_response_minutes=avg_response,
            avg_resolution_minutes=avg_resolution,
            csat_score=float(csat_score),
            agent_performance=agent_items,
            recent_tickets=[ticket_to_response(t, self.db) for t in recent_tickets],
            recent_chats=[chat_to_response(c, self.db) for c in recent_chats],
        )

    def _avg_response_minutes(self, tenant_id: uuid.UUID) -> float:
        tickets = self.db.scalars(
            select(SupportTicket).where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.first_response_at.isnot(None),
            )
        ).all()
        if not tickets:
            return 0.0
        total = sum(
            (t.first_response_at - t.created_at).total_seconds() / 60
            for t in tickets
            if t.first_response_at
        )
        return round(total / len(tickets), 1)

    def _avg_resolution_minutes(self, tenant_id: uuid.UUID) -> float:
        tickets = self.db.scalars(
            select(SupportTicket).where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.resolved_at.isnot(None),
            )
        ).all()
        if not tickets:
            return 0.0
        total = sum(
            (t.resolved_at - t.created_at).total_seconds() / 60
            for t in tickets
            if t.resolved_at
        )
        return round(total / len(tickets), 1)

    def get_analytics(self, tenant_id: uuid.UUID, days: int = 30) -> SupportAnalyticsResponse:
        since = utcnow() - timedelta(days=days)
        tickets = list(
            self.db.scalars(
                select(SupportTicket).where(
                    SupportTicket.tenant_id == tenant_id,
                    SupportTicket.created_at >= since,
                )
            ).all()
        )

        volume_map: dict[str, int] = {}
        for t in tickets:
            key = t.created_at.strftime("%Y-%m-%d")
            volume_map[key] = volume_map.get(key, 0) + 1
        volume_by_day = [
            VolumeByDayItem(date=k, count=v) for k, v in sorted(volume_map.items())
        ]

        total = len(tickets)
        resolved = sum(1 for t in tickets if t.status in RESOLVED_TICKET_STATUSES)
        resolution_rate = round(resolved / total * 100, 1) if total else 0.0

        leaderboard = self.get_agent_leaderboard(tenant_id, limit=10)

        sla_perf = []
        for priority in ("critical", "high", "medium", "low"):
            pt = [t for t in tickets if t.priority == priority]
            if not pt:
                continue
            met = sum(1 for t in pt if not t.sla_breached)
            breached = sum(1 for t in pt if t.sla_breached)
            rate = round(met / len(pt) * 100, 1) if pt else 0.0
            sla_perf.append(
                SlaPerformanceItem(priority=priority, met=met, breached=breached, compliance_rate=rate)
            )

        feedback_rows = list(
            self.db.scalars(
                select(CustomerFeedback).where(
                    CustomerFeedback.tenant_id == tenant_id,
                    CustomerFeedback.feedback_type == "csat",
                    CustomerFeedback.created_at >= since,
                )
            ).all()
        )
        csat_map: dict[str, list[int]] = {}
        for fb in feedback_rows:
            key = fb.created_at.strftime("%Y-%m-%d")
            csat_map.setdefault(key, []).append(fb.score)
        csat_trend = [
            CsatTrendItem(date=k, score=round(sum(v) / len(v), 1), count=len(v))
            for k, v in sorted(csat_map.items())
        ]

        return SupportAnalyticsResponse(
            volume_by_day=volume_by_day,
            resolution_rate=resolution_rate,
            agent_leaderboard=leaderboard,
            sla_performance=sla_perf,
            csat_trend=csat_trend,
        )

    def get_agent_leaderboard(self, tenant_id: uuid.UUID, limit: int = 10) -> list[AgentLeaderboardItem]:
        assignees = self.db.scalars(
            select(SupportTicket.assigned_to_id)
            .where(
                SupportTicket.tenant_id == tenant_id,
                SupportTicket.assigned_to_id.isnot(None),
            )
            .distinct()
        ).all()
        items = []
        for uid in assignees:
            if not uid:
                continue
            user = self._load_user(uid)
            if not user:
                continue
            resolved = self.db.scalar(
                select(func.count())
                .select_from(SupportTicket)
                .where(
                    SupportTicket.tenant_id == tenant_id,
                    SupportTicket.assigned_to_id == uid,
                    SupportTicket.status.in_(RESOLVED_TICKET_STATUSES),
                )
            ) or 0
            resolved_tickets = self.db.scalars(
                select(SupportTicket).where(
                    SupportTicket.tenant_id == tenant_id,
                    SupportTicket.assigned_to_id == uid,
                    SupportTicket.resolved_at.isnot(None),
                )
            ).all()
            avg_res = 0.0
            if resolved_tickets:
                avg_res = round(
                    sum(
                        (t.resolved_at - t.created_at).total_seconds() / 60
                        for t in resolved_tickets
                        if t.resolved_at
                    )
                    / len(resolved_tickets),
                    1,
                )
            csat = self.db.scalar(
                select(func.avg(CustomerFeedback.score)).where(
                    CustomerFeedback.tenant_id == tenant_id,
                    CustomerFeedback.agent_id == uid,
                )
            ) or 0.0
            items.append(
                AgentLeaderboardItem(
                    user_id=uid,
                    full_name=user.full_name,
                    tickets_resolved=resolved,
                    avg_resolution_minutes=avg_res,
                    csat_avg=round(float(csat), 1),
                )
            )
        items.sort(key=lambda x: x.tickets_resolved, reverse=True)
        return items[:limit]

    # ------------------------------------------------------------------
    # AI assist (heuristic)
    # ------------------------------------------------------------------

    _CLASSIFICATION_KEYWORDS = {
        "billing": ("invoice", "payment", "billing", "charge", "refund"),
        "technical": ("error", "bug", "broken", "not working", "crash", "api"),
        "account": ("login", "password", "account", "access", "permission"),
        "product": ("feature", "product", "upgrade", "license"),
    }
    _NEGATIVE_KEYWORDS = ("angry", "frustrated", "terrible", "awful", "unacceptable", "urgent", "asap")
    _POSITIVE_KEYWORDS = ("thanks", "thank you", "great", "excellent", "appreciate")
    _URGENT_KEYWORDS = ("urgent", "critical", "emergency", "asap", "immediately")

    def ai_assist(
        self,
        tenant_id: uuid.UUID,
        ticket_id: uuid.UUID,
        assist_type: str = "all",
    ) -> AiSupportAssistResponse:
        ticket = self.get_ticket(tenant_id, ticket_id)
        text = f"{ticket.subject} {ticket.description}".lower()
        replies = sorted(ticket.replies, key=lambda r: r.created_at)

        result = AiSupportAssistResponse()

        if assist_type in ("all", "classification"):
            result.classification = self._classify_text(text, ticket.category)

        if assist_type in ("all", "sentiment"):
            result.sentiment = self._detect_sentiment(text)

        if assist_type in ("all", "priority"):
            result.priority_suggestion = self._suggest_priority(text, ticket.priority)

        if assist_type in ("all", "escalate"):
            should, reason = self._escalation_recommendation(ticket, text)
            result.escalate_recommendation = should
            result.escalate_reason = reason

        if assist_type in ("all", "summary"):
            parts = [f"Subject: {ticket.subject}"]
            for r in replies[-5:]:
                parts.append(f"[{r.author_type}] {r.body[:200]}")
            result.summary = "\n".join(parts)

        if assist_type in ("all", "reply"):
            greeting = "Thank you for contacting us."
            if result.sentiment == "negative":
                greeting = "We sincerely apologize for the inconvenience."
            result.reply_suggestion = (
                f"{greeting} Regarding your request about \"{ticket.subject}\", "
                "we are reviewing your case and will update you shortly."
            )

        if assist_type in ("all", "knowledge"):
            articles = self.search_knowledge(tenant_id, ticket.subject, limit=5)
            result.knowledge_suggestions = [
                AiKnowledgeSuggestion(
                    id=a.id,
                    title=a.title,
                    slug=a.slug,
                    relevance_score=0.8,
                )
                for a in articles
            ]

        return result

    def _classify_text(self, text: str, default: str) -> str:
        for category, keywords in self._CLASSIFICATION_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return category
        return default

    def _detect_sentiment(self, text: str) -> str:
        neg = sum(1 for kw in self._NEGATIVE_KEYWORDS if kw in text)
        pos = sum(1 for kw in self._POSITIVE_KEYWORDS if kw in text)
        if neg > pos:
            return "negative"
        if pos > neg:
            return "positive"
        return "neutral"

    def _suggest_priority(self, text: str, current: str) -> str:
        if any(kw in text for kw in self._URGENT_KEYWORDS):
            return "critical" if "critical" in text or "emergency" in text else "urgent"
        return current

    def _escalation_recommendation(self, ticket: SupportTicket, text: str) -> tuple[bool, str | None]:
        if ticket.sla_breached:
            return True, "SLA has been breached"
        if ticket.priority in ("critical", "urgent"):
            return True, f"Ticket priority is {ticket.priority}"
        if any(kw in text for kw in self._URGENT_KEYWORDS):
            return True, "Urgent language detected in ticket content"
        if ticket.escalation_due_at and utcnow() > ticket.escalation_due_at:
            return True, "Escalation deadline has passed"
        return False, None
