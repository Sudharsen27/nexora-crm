"""Enterprise support & service desk API (Phase 19)."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.portal import TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES
from app.models.support import (
    ESCALATION_LEVELS,
    TICKET_CHANNELS,
    TICKET_SOURCES,
)
from app.models.portal import KnowledgeArticle, TicketReply
from app.models.support import ChatConversation, ChatMessage, CustomerFeedback, KnowledgeCategory, SlaPolicy
from app.schemas.support import (
    AiSupportAssistRequest,
    AiSupportAssistResponse,
    ChatConversationCreate,
    ChatConversationResponse,
    ChatListResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    FeedbackCreate,
    FeedbackListResponse,
    FeedbackResponse,
    KnowledgeArticleCreate,
    KnowledgeArticleListResponse,
    KnowledgeArticleResponse,
    KnowledgeArticleUpdate,
    KnowledgeCategoryCreate,
    KnowledgeCategoryResponse,
    KnowledgeCategoryUpdate,
    SlaPolicyCreate,
    SlaPolicyListResponse,
    SlaPolicyResponse,
    SlaPolicyUpdate,
    SupportAnalyticsResponse,
    SupportDashboardResponse,
    TicketAssign,
    TicketBulkAction,
    TicketCreate,
    TicketDetailResponse,
    TicketEscalate,
    TicketListResponse,
    TicketMerge,
    TicketMetaResponse,
    TicketReplyCreate,
    TicketReplyResponse,
    TicketResponse,
    TicketSplit,
    TicketUpdate,
)
from app.services.support_service import (
    SupportService,
    chat_to_response,
    paginate,
    ticket_to_response,
)

router = APIRouter(prefix="/tenants/{slug}/support", tags=["support"])


def _to_ticket_response(ticket, db: Session) -> TicketResponse:
    return ticket_to_response(ticket, db)


def _to_ticket_detail(ticket, db: Session) -> TicketDetailResponse:
    replies = sorted(ticket.replies, key=lambda r: r.created_at) if ticket.replies else []
    reply_items = []
    for reply in replies:
        author_name = None
        if reply.staff_user_id:
            from app.models import User

            user = db.get(User, reply.staff_user_id)
            author_name = user.full_name if user else "Staff"
        elif reply.portal_user_id:
            from app.models.portal import CustomerPortalUser

            pu = db.get(CustomerPortalUser, reply.portal_user_id)
            author_name = pu.full_name if pu else "Customer"
        reply_items.append(
            TicketReplyResponse(
                id=reply.id,
                ticket_id=reply.ticket_id,
                author_type=reply.author_type,
                body=reply.body,
                is_internal=reply.is_internal,
                is_ai_generated=reply.is_ai_generated,
                staff_user_id=reply.staff_user_id,
                portal_user_id=reply.portal_user_id,
                author_name=author_name,
                created_at=reply.created_at,
            )
        )
    base = ticket_to_response(ticket, db, reply_count=len(replies))
    return TicketDetailResponse(**base.model_dump(), replies=reply_items)


def _to_reply_response(reply: TicketReply, db: Session) -> TicketReplyResponse:
    author_name = None
    if reply.staff_user_id:
        from app.models import User

        user = db.get(User, reply.staff_user_id)
        author_name = user.full_name if user else "Staff"
    elif reply.portal_user_id:
        from app.models.portal import CustomerPortalUser

        pu = db.get(CustomerPortalUser, reply.portal_user_id)
        author_name = pu.full_name if pu else "Customer"
    return TicketReplyResponse(
        id=reply.id,
        ticket_id=reply.ticket_id,
        author_type=reply.author_type,
        body=reply.body,
        is_internal=reply.is_internal,
        is_ai_generated=reply.is_ai_generated,
        staff_user_id=reply.staff_user_id,
        portal_user_id=reply.portal_user_id,
        author_name=author_name,
        created_at=reply.created_at,
    )


def _to_chat_response(convo: ChatConversation, db: Session) -> ChatConversationResponse:
    return chat_to_response(convo, db)


def _to_sla_response(policy: SlaPolicy) -> SlaPolicyResponse:
    return SlaPolicyResponse.model_validate(policy)


def _to_article_response(article: KnowledgeArticle) -> KnowledgeArticleResponse:
    return KnowledgeArticleResponse.model_validate(article)


def _to_category_response(cat: KnowledgeCategory) -> KnowledgeCategoryResponse:
    return KnowledgeCategoryResponse.model_validate(cat)


def _to_feedback_response(fb: CustomerFeedback) -> FeedbackResponse:
    return FeedbackResponse.model_validate(fb)


# --- Meta & dashboard ---


@router.get("/meta", response_model=TicketMetaResponse)
def get_support_meta(
    _: TenantContext = Depends(require_permission("support:read")),
) -> TicketMetaResponse:
    return TicketMetaResponse(
        statuses=list(TICKET_STATUSES),
        priorities=list(TICKET_PRIORITIES),
        channels=list(TICKET_CHANNELS),
        sources=list(TICKET_SOURCES),
        escalation_levels=list(ESCALATION_LEVELS),
        categories=list(TICKET_CATEGORIES),
    )


@router.get("/dashboard", response_model=SupportDashboardResponse)
def get_dashboard(
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> SupportDashboardResponse:
    return SupportService(db).get_dashboard(ctx.tenant.id)


@router.get("/analytics", response_model=SupportAnalyticsResponse)
def get_analytics(
    days: int = Query(default=30, ge=1, le=365),
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> SupportAnalyticsResponse:
    return SupportService(db).get_analytics(ctx.tenant.id, days=days)


# --- Tickets ---


@router.get("/tickets", response_model=TicketListResponse)
def list_tickets(
    q: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
    channel: str | None = Query(default=None),
    assigned_to_id: UUID | None = Query(default=None),
    company_id: UUID | None = Query(default=None),
    contact_id: UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    sla_breached: bool | None = Query(default=None),
    is_archived: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> TicketListResponse:
    service = SupportService(db)
    tickets, total = service.list_tickets(
        ctx.tenant.id,
        q=q,
        status_filter=status,
        priority=priority,
        channel=channel,
        assigned_to_id=assigned_to_id,
        company_id=company_id,
        contact_id=contact_id,
        category=category,
        sla_breached=sla_breached,
        is_archived=is_archived,
        page=page,
        page_size=page_size,
    )
    meta = paginate(total, page, page_size)
    return TicketListResponse(
        items=[_to_ticket_response(t, db) for t in tickets],
        **meta,
    )


@router.post("/tickets", response_model=TicketDetailResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).create_ticket(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/bulk")
def bulk_action(
    payload: TicketBulkAction,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> dict:
    return SupportService(db).bulk_action(
        ctx.tenant.id, payload, ctx.membership.user_id
    )


@router.get("/tickets/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).get_ticket(ctx.tenant.id, ticket_id)
    return _to_ticket_detail(ticket, db)


@router.put("/tickets/{ticket_id}", response_model=TicketDetailResponse)
def update_ticket(
    ticket_id: UUID,
    payload: TicketUpdate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).update_ticket(
        ctx.tenant.id, ticket_id, payload, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: UUID,
    hard: bool = Query(default=False),
    ctx: TenantContext = Depends(require_permission("support:delete")),
    db: Session = Depends(get_db),
) -> None:
    SupportService(db).delete_ticket(
        ctx.tenant.id, ticket_id, ctx.membership.user_id, hard=hard
    )


@router.post("/tickets/{ticket_id}/assign", response_model=TicketDetailResponse)
def assign_ticket(
    ticket_id: UUID,
    payload: TicketAssign,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).assign_ticket(
        ctx.tenant.id, ticket_id, payload, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/{ticket_id}/transfer", response_model=TicketDetailResponse)
def transfer_ticket(
    ticket_id: UUID,
    payload: TicketAssign,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).transfer_ticket(
        ctx.tenant.id, ticket_id, payload, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/{ticket_id}/escalate", response_model=TicketDetailResponse)
def escalate_ticket(
    ticket_id: UUID,
    payload: TicketEscalate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).escalate_ticket(
        ctx.tenant.id, ticket_id, payload, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/{ticket_id}/merge", response_model=TicketDetailResponse)
def merge_tickets(
    ticket_id: UUID,
    payload: TicketMerge,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).merge_tickets(
        ctx.tenant.id, ticket_id, payload, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/{ticket_id}/split", response_model=TicketDetailResponse, status_code=status.HTTP_201_CREATED)
def split_ticket(
    ticket_id: UUID,
    payload: TicketSplit,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).split_ticket(
        ctx.tenant.id, ticket_id, payload, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/{ticket_id}/close", response_model=TicketDetailResponse)
def close_ticket(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).close_ticket(
        ctx.tenant.id, ticket_id, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/{ticket_id}/reopen", response_model=TicketDetailResponse)
def reopen_ticket(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).reopen_ticket(
        ctx.tenant.id, ticket_id, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


@router.post("/tickets/{ticket_id}/archive", response_model=TicketDetailResponse)
def archive_ticket(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketDetailResponse:
    ticket = SupportService(db).archive_ticket(
        ctx.tenant.id, ticket_id, ctx.membership.user_id
    )
    return _to_ticket_detail(ticket, db)


# --- SLA ---
def list_replies(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> list[TicketReplyResponse]:
    replies = SupportService(db).list_replies(ctx.tenant.id, ticket_id)
    return [_to_reply_response(r, db) for r in replies]


@router.post("/tickets/{ticket_id}/replies", response_model=TicketReplyResponse, status_code=status.HTTP_201_CREATED)
def add_reply(
    ticket_id: UUID,
    payload: TicketReplyCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> TicketReplyResponse:
    reply = SupportService(db).add_reply(
        ctx.tenant.id, ticket_id, payload, ctx.membership.user_id
    )
    return _to_reply_response(reply, db)


@router.post("/tickets/{ticket_id}/ai-assist", response_model=AiSupportAssistResponse)
def ai_assist(
    ticket_id: UUID,
    payload: AiSupportAssistRequest,
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> AiSupportAssistResponse:
    return SupportService(db).ai_assist(
        ctx.tenant.id, ticket_id, payload.assist_type
    )


# --- SLA ---


@router.get("/sla", response_model=SlaPolicyListResponse)
def list_sla_policies(
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> SlaPolicyListResponse:
    policies = SupportService(db).list_sla_policies(ctx.tenant.id)
    total = len(policies)
    return SlaPolicyListResponse(
        items=[_to_sla_response(p) for p in policies],
        total=total,
        page=1,
        page_size=total or 1,
        total_pages=1,
    )


@router.post("/sla", response_model=SlaPolicyResponse, status_code=status.HTTP_201_CREATED)
def create_sla_policy(
    payload: SlaPolicyCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> SlaPolicyResponse:
    policy = SupportService(db).create_sla_policy(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    return _to_sla_response(policy)


@router.put("/sla/{policy_id}", response_model=SlaPolicyResponse)
def update_sla_policy(
    policy_id: UUID,
    payload: SlaPolicyUpdate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> SlaPolicyResponse:
    policy = SupportService(db).update_sla_policy(ctx.tenant.id, policy_id, payload)
    return _to_sla_response(policy)


@router.delete("/sla/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sla_policy(
    policy_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:delete")),
    db: Session = Depends(get_db),
) -> None:
    SupportService(db).delete_sla_policy(ctx.tenant.id, policy_id)


@router.post("/sla/check-escalations")
def check_escalations(
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> dict:
    return SupportService(db).check_overdue_and_escalate(ctx.tenant.id)


# --- Knowledge base ---


@router.get("/knowledge", response_model=KnowledgeArticleListResponse)
def list_knowledge(
    q: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> KnowledgeArticleListResponse:
    articles, total = SupportService(db).list_knowledge_articles(
        ctx.tenant.id, q=q, status_filter=status, page=page, page_size=page_size
    )
    meta = paginate(total, page, page_size)
    return KnowledgeArticleListResponse(
        items=[_to_article_response(a) for a in articles],
        **meta,
    )


@router.post("/knowledge", response_model=KnowledgeArticleResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge(
    payload: KnowledgeArticleCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> KnowledgeArticleResponse:
    article = SupportService(db).create_knowledge_article(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    return _to_article_response(article)


@router.get("/knowledge/categories", response_model=list[KnowledgeCategoryResponse])
def list_knowledge_categories(
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> list[KnowledgeCategoryResponse]:
    cats = SupportService(db).list_knowledge_categories(ctx.tenant.id)
    return [_to_category_response(c) for c in cats]


@router.post("/knowledge/categories", response_model=KnowledgeCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge_category(
    payload: KnowledgeCategoryCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> KnowledgeCategoryResponse:
    cat = SupportService(db).create_knowledge_category(ctx.tenant.id, payload)
    return _to_category_response(cat)


@router.get("/knowledge/{article_id}", response_model=KnowledgeArticleResponse)
def get_knowledge(
    article_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> KnowledgeArticleResponse:
    article = SupportService(db).get_knowledge_article(ctx.tenant.id, article_id)
    return _to_article_response(article)


@router.put("/knowledge/{article_id}", response_model=KnowledgeArticleResponse)
def update_knowledge(
    article_id: UUID,
    payload: KnowledgeArticleUpdate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> KnowledgeArticleResponse:
    article = SupportService(db).update_knowledge_article(
        ctx.tenant.id, article_id, payload, ctx.membership.user_id
    )
    return _to_article_response(article)


@router.delete("/knowledge/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge(
    article_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:delete")),
    db: Session = Depends(get_db),
) -> None:
    SupportService(db).delete_knowledge_article(ctx.tenant.id, article_id)


# --- Chat ---


@router.get("/chats", response_model=ChatListResponse)
def list_chats(
    status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> ChatListResponse:
    convos, total = SupportService(db).list_conversations(
        ctx.tenant.id, status_filter=status, page=page, page_size=page_size
    )
    meta = paginate(total, page, page_size)
    return ChatListResponse(
        items=[_to_chat_response(c, db) for c in convos],
        **meta,
    )


@router.post("/chats", response_model=ChatConversationResponse, status_code=status.HTTP_201_CREATED)
def start_chat(
    payload: ChatConversationCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> ChatConversationResponse:
    convo = SupportService(db).start_conversation(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    return _to_chat_response(convo, db)


@router.get("/chats/{conversation_id}", response_model=ChatConversationResponse)
def get_chat(
    conversation_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> ChatConversationResponse:
    convo = SupportService(db).get_conversation(ctx.tenant.id, conversation_id)
    return _to_chat_response(convo, db)


@router.post("/chats/{conversation_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_chat_message(
    conversation_id: UUID,
    payload: ChatMessageCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> ChatMessageResponse:
    msg = SupportService(db).send_message(
        ctx.tenant.id, conversation_id, payload, ctx.membership.user_id
    )
    return ChatMessageResponse.model_validate(msg)


@router.post("/chats/{conversation_id}/transfer", response_model=ChatConversationResponse)
def transfer_chat(
    conversation_id: UUID,
    payload: TicketAssign,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> ChatConversationResponse:
    convo = SupportService(db).transfer_chat(
        ctx.tenant.id, conversation_id, payload.assigned_to_id, ctx.membership.user_id
    )
    return _to_chat_response(convo, db)


@router.post("/chats/{conversation_id}/resolve", response_model=ChatConversationResponse)
def resolve_chat(
    conversation_id: UUID,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> ChatConversationResponse:
    convo = SupportService(db).resolve_chat(
        ctx.tenant.id, conversation_id, ctx.membership.user_id
    )
    return _to_chat_response(convo, db)


@router.post("/chats/{conversation_id}/rate", response_model=ChatConversationResponse)
def rate_chat(
    conversation_id: UUID,
    rating: int = Query(ge=1, le=5),
    comment: str | None = Query(default=None, max_length=2000),
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> ChatConversationResponse:
    convo = SupportService(db).rate_chat(
        ctx.tenant.id, conversation_id, rating, comment
    )
    return _to_chat_response(convo, db)


# --- Feedback ---


@router.get("/feedback", response_model=FeedbackListResponse)
def list_feedback(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("support:read")),
    db: Session = Depends(get_db),
) -> FeedbackListResponse:
    items, total = SupportService(db).list_feedback(
        ctx.tenant.id, page=page, page_size=page_size
    )
    meta = paginate(total, page, page_size)
    return FeedbackListResponse(
        items=[_to_feedback_response(f) for f in items],
        **meta,
    )


@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackCreate,
    ctx: TenantContext = Depends(require_permission("support:write")),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    fb = SupportService(db).create_feedback(ctx.tenant.id, payload)
    return _to_feedback_response(fb)
