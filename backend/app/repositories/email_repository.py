import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.email import Email, EmailAttachment, EmailLog, EmailRecipient, EmailTemplate, EmailThread, EmailUserSettings


class EmailRepository:
    def __init__(self, db: Session):
        self.db = db

    def _attachments_load(self, *, include_content: bool = False):
        loader = joinedload(Email.attachments)
        if not include_content:
            loader = loader.defer(EmailAttachment.content)
        return loader

    def _email_options(self, *, include_attachment_content: bool = False):
        return (
            joinedload(Email.sender),
            joinedload(Email.created_by),
            joinedload(Email.recipients),
            self._attachments_load(include_content=include_attachment_content),
            joinedload(Email.logs),
        )

    def get_by_id(self, tenant_id: uuid.UUID, email_id: uuid.UUID) -> Email | None:
        return self.db.scalar(
            select(Email)
            .options(*self._email_options())
            .where(Email.id == email_id, Email.tenant_id == tenant_id)
        )

    def get_by_tracking_token(self, token: str) -> Email | None:
        return self.db.scalar(select(Email).where(Email.tracking_token == token))

    def list_emails(
        self,
        tenant_id: uuid.UUID,
        *,
        folder: str | None = None,
        q: str | None = None,
        sender_id: uuid.UUID | None = None,
        unread: bool | None = None,
        starred: bool | None = None,
        important: bool | None = None,
        has_attachments: bool | None = None,
        scheduled: bool | None = None,
        company_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        lead_id: uuid.UUID | None = None,
        deal_id: uuid.UUID | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Email], int]:
        stmt = select(Email).options(
            joinedload(Email.sender),
            joinedload(Email.recipients),
            self._attachments_load(),
        ).where(Email.tenant_id == tenant_id)

        if folder == "trash":
            stmt = stmt.where(Email.deleted_at.isnot(None))
        else:
            stmt = stmt.where(Email.deleted_at.is_(None))

        if folder == "starred":
            stmt = stmt.where(Email.is_starred.is_(True), Email.archived_at.is_(None))
        elif folder == "archive":
            stmt = stmt.where(Email.archived_at.isnot(None))
        elif folder == "trash":
            stmt = stmt.where(Email.deleted_at.isnot(None))
        elif folder:
            stmt = stmt.where(Email.folder == folder, Email.archived_at.is_(None))

        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Email.subject.ilike(pattern),
                    Email.body_text.ilike(pattern),
                    Email.from_email.ilike(pattern),
                )
            )
        if sender_id:
            stmt = stmt.where(Email.sender_id == sender_id)
        if unread is True:
            stmt = stmt.where(Email.is_read.is_(False))
        if starred is True:
            stmt = stmt.where(Email.is_starred.is_(True))
        if important is True:
            stmt = stmt.where(Email.is_important.is_(True))
        if has_attachments is True:
            stmt = stmt.where(Email.has_attachments.is_(True))
        if scheduled is True:
            stmt = stmt.where(Email.status == "scheduled")
        if company_id:
            stmt = stmt.where(Email.company_id == company_id)
        if contact_id:
            stmt = stmt.where(Email.contact_id == contact_id)
        if lead_id:
            stmt = stmt.where(Email.lead_id == lead_id)
        if deal_id:
            stmt = stmt.where(Email.deal_id == deal_id)
        if entity_type and entity_id:
            col = getattr(Email, f"{entity_type}_id", None)
            if col is not None:
                stmt = stmt.where(col == entity_id)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        sort_col = getattr(Email, sort_by, Email.created_at)
        order = sort_col.desc() if sort_order == "desc" else sort_col.asc()
        items = list(
            self.db.scalars(
                stmt.order_by(order).offset((page - 1) * page_size).limit(page_size)
            ).unique().all()
        )
        return items, total

    def list_thread_emails(self, tenant_id: uuid.UUID, thread_id: uuid.UUID) -> list[Email]:
        return list(
            self.db.scalars(
                select(Email)
                .options(*self._email_options())
                .where(Email.tenant_id == tenant_id, Email.thread_id == thread_id)
                .order_by(Email.created_at.asc())
            ).unique().all()
        )

    def get_scheduled_due(self, before: datetime | None = None) -> list[Email]:
        cutoff = before or datetime.now(UTC)
        return list(
            self.db.scalars(
                select(Email)
                .options(
                    joinedload(Email.recipients),
                    self._attachments_load(include_content=True),
                    joinedload(Email.sender),
                )
                .where(
                    Email.status == "scheduled",
                    Email.scheduled_at.isnot(None),
                    Email.scheduled_at <= cutoff,
                    Email.deleted_at.is_(None),
                )
            ).unique().all()
        )

    def count_by_folder(self, tenant_id: uuid.UUID, folder: str, user_id: uuid.UUID | None = None) -> int:
        stmt = select(func.count()).select_from(Email).where(
            Email.tenant_id == tenant_id,
            Email.deleted_at.is_(None),
            Email.archived_at.is_(None),
        )
        if folder == "starred":
            stmt = stmt.where(Email.is_starred.is_(True))
        elif folder == "drafts":
            stmt = stmt.where(Email.folder == "drafts", Email.status == "draft")
        elif folder == "scheduled":
            stmt = stmt.where(Email.status == "scheduled")
        elif folder == "sent":
            stmt = stmt.where(Email.folder == "sent")
        elif folder == "inbox":
            stmt = stmt.where(Email.folder == "inbox")
        if user_id and folder in ("drafts", "sent", "scheduled"):
            stmt = stmt.where(Email.sender_id == user_id)
        return self.db.scalar(stmt) or 0

    def unread_count(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None = None) -> int:
        stmt = select(func.count()).select_from(Email).where(
            Email.tenant_id == tenant_id,
            Email.folder == "inbox",
            Email.is_read.is_(False),
            Email.deleted_at.is_(None),
            Email.archived_at.is_(None),
        )
        if user_id:
            stmt = stmt.where(Email.sender_id == user_id)
        return self.db.scalar(stmt) or 0

    def sent_count_since(self, tenant_id: uuid.UUID, since: datetime, user_id: uuid.UUID | None = None) -> int:
        stmt = select(func.count()).select_from(Email).where(
            Email.tenant_id == tenant_id,
            Email.status == "sent",
            Email.sent_at.isnot(None),
            Email.sent_at >= since,
        )
        if user_id:
            stmt = stmt.where(Email.sender_id == user_id)
        return self.db.scalar(stmt) or 0

    def tracking_stats(self, tenant_id: uuid.UUID, since: datetime) -> dict[str, int]:
        sent = self.db.scalar(
            select(func.count())
            .select_from(Email)
            .where(Email.tenant_id == tenant_id, Email.status == "sent", Email.sent_at >= since)
        ) or 0
        opened = self.db.scalar(
            select(func.count(func.distinct(EmailLog.email_id)))
            .select_from(EmailLog)
            .join(Email, Email.id == EmailLog.email_id)
            .where(Email.tenant_id == tenant_id, EmailLog.event_type == "opened", EmailLog.created_at >= since)
        ) or 0
        clicked = self.db.scalar(
            select(func.count(func.distinct(EmailLog.email_id)))
            .select_from(EmailLog)
            .join(Email, Email.id == EmailLog.email_id)
            .where(Email.tenant_id == tenant_id, EmailLog.event_type == "clicked", EmailLog.created_at >= since)
        ) or 0
        replied = self.db.scalar(
            select(func.count(func.distinct(EmailLog.email_id)))
            .select_from(EmailLog)
            .join(Email, Email.id == EmailLog.email_id)
            .where(Email.tenant_id == tenant_id, EmailLog.event_type == "replied", EmailLog.created_at >= since)
        ) or 0
        delivered = self.db.scalar(
            select(func.count(func.distinct(EmailLog.email_id)))
            .select_from(EmailLog)
            .join(Email, Email.id == EmailLog.email_id)
            .where(Email.tenant_id == tenant_id, EmailLog.event_type == "delivered", EmailLog.created_at >= since)
        ) or 0
        return {"sent": sent, "opened": opened, "clicked": clicked, "replied": replied, "delivered": delivered}

    def list_templates(self, tenant_id: uuid.UUID, category: str | None = None) -> list[EmailTemplate]:
        stmt = (
            select(EmailTemplate)
            .options(joinedload(EmailTemplate.created_by))
            .where(EmailTemplate.tenant_id == tenant_id)
            .order_by(EmailTemplate.name.asc())
        )
        if category:
            stmt = stmt.where(EmailTemplate.category == category)
        return list(self.db.scalars(stmt).unique().all())

    def get_template(self, tenant_id: uuid.UUID, template_id: uuid.UUID) -> EmailTemplate | None:
        return self.db.scalar(
            select(EmailTemplate)
            .options(joinedload(EmailTemplate.created_by))
            .where(EmailTemplate.id == template_id, EmailTemplate.tenant_id == tenant_id)
        )

    def get_user_settings(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> EmailUserSettings | None:
        return self.db.scalar(
            select(EmailUserSettings).where(
                EmailUserSettings.tenant_id == tenant_id,
                EmailUserSettings.user_id == user_id,
            )
        )

    def recent_emails(self, tenant_id: uuid.UUID, limit: int = 8) -> list[Email]:
        return list(
            self.db.scalars(
                select(Email)
                .options(joinedload(Email.sender), joinedload(Email.recipients))
                .where(Email.tenant_id == tenant_id, Email.deleted_at.is_(None))
                .order_by(Email.updated_at.desc())
                .limit(limit)
            ).unique().all()
        )

    def upcoming_scheduled(self, tenant_id: uuid.UUID, limit: int = 8) -> list[Email]:
        return list(
            self.db.scalars(
                select(Email)
                .options(joinedload(Email.sender), joinedload(Email.recipients))
                .where(
                    Email.tenant_id == tenant_id,
                    Email.status == "scheduled",
                    Email.scheduled_at.isnot(None),
                    Email.deleted_at.is_(None),
                )
                .order_by(Email.scheduled_at.asc())
                .limit(limit)
            ).unique().all()
        )
