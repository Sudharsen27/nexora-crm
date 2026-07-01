import math
import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.html_sanitizer import html_to_text, sanitize_html
from app.db.mixins import utcnow
from app.models import Company, Contact, Deal, Lead, Meeting, Task, User
from app.models.email import (
    EMAIL_FOLDERS,
    EMAIL_PRIORITIES,
    Email,
    EmailAttachment,
    EmailLog,
    EmailRecipient,
    EmailTemplate,
    EmailThread,
    EmailUserSettings,
)
from app.repositories.email_repository import EmailRepository
from app.schemas.email import (
    EmailCreate,
    EmailForwardRequest,
    EmailRecipientInput,
    EmailReplyRequest,
    EmailScheduleRequest,
    EmailSendRequest,
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailUpdate,
    EmailUserSettingsUpdate,
)
from app.services.activity_logger import ActivityLogger
from app.services.email_service import send_crm_email
from app.services.notification_hooks import notify_user


def paginate(total: int, page: int, page_size: int) -> dict:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)) if total else 0,
    }


class EmailCenterService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EmailRepository(db)
        self.settings = get_settings()

    def _validate_priority(self, priority: str) -> None:
        if priority not in EMAIL_PRIORITIES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid priority")

    def _validate_fk(self, tenant_id: uuid.UUID, **ids: uuid.UUID | None) -> None:
        checks = [
            ("company_id", ids.get("company_id"), Company, "Company"),
            ("contact_id", ids.get("contact_id"), Contact, "Contact"),
            ("lead_id", ids.get("lead_id"), Lead, "Lead"),
            ("deal_id", ids.get("deal_id"), Deal, "Deal"),
            ("task_id", ids.get("task_id"), Task, "Task"),
            ("meeting_id", ids.get("meeting_id"), Meeting, "Meeting"),
        ]
        for _, entity_id, model, label in checks:
            if entity_id is None:
                continue
            found = self.db.scalar(
                select(model.id).where(model.id == entity_id, model.tenant_id == tenant_id)
            )
            if found is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{label} not found")

    def _entity_link(self, email: Email) -> tuple[str, uuid.UUID]:
        for etype, eid in [
            ("deal", email.deal_id),
            ("contact", email.contact_id),
            ("lead", email.lead_id),
            ("company", email.company_id),
            ("task", email.task_id),
            ("meeting", email.meeting_id),
        ]:
            if eid:
                return etype, eid
        return "tenant", email.tenant_id

    def _coerce_recipients(self, recipients: list) -> list[EmailRecipientInput]:
        coerced: list[EmailRecipientInput] = []
        for item in recipients:
            if isinstance(item, EmailRecipientInput):
                coerced.append(item)
            elif isinstance(item, dict):
                coerced.append(EmailRecipientInput(**item))
            else:
                coerced.append(EmailRecipientInput.model_validate(item))
        return coerced

    def _sync_recipients(self, email: Email, recipients: list) -> None:
        email.recipients.clear()
        self.db.flush()
        for r in self._coerce_recipients(recipients):
            email.recipients.append(
                EmailRecipient(
                    recipient_type=r.recipient_type,
                    email_address=str(r.email_address).lower(),
                    display_name=r.display_name,
                    user_id=r.user_id,
                    contact_id=r.contact_id,
                )
            )

    def _get_user_settings(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> EmailUserSettings | None:
        return self.repo.get_user_settings(tenant_id, user_id)

    def _apply_signature(self, body_html: str | None, body_text: str | None, settings: EmailUserSettings | None) -> tuple[str | None, str | None]:
        if not settings:
            return body_html, body_text
        html = body_html or ""
        text = body_text or ""
        if settings.signature_html:
            html = f"{html}<br/><br/>{settings.signature_html}" if html else settings.signature_html
        if settings.signature_text:
            text = f"{text}\n\n{settings.signature_text}" if text else settings.signature_text
        return html or None, text or None

    def _build_variables(self, tenant_id: uuid.UUID, email: Email) -> dict[str, str]:
        vars_map: dict[str, str] = {"owner": "", "first_name": "", "company": "", "deal": "", "meeting": ""}
        if email.sender:
            vars_map["owner"] = email.sender.full_name
        if email.contact_id:
            c = self.db.get(Contact, email.contact_id)
            if c:
                vars_map["first_name"] = c.first_name or ""
                vars_map["company"] = c.company or vars_map["company"]
        if email.company_id:
            co = self.db.get(Company, email.company_id)
            if co:
                vars_map["company"] = co.name
        if email.deal_id:
            d = self.db.get(Deal, email.deal_id)
            if d:
                vars_map["deal"] = d.title
        if email.meeting_id:
            m = self.db.get(Meeting, email.meeting_id)
            if m:
                vars_map["meeting"] = m.title
        return vars_map

    def _apply_template_variables(self, text: str | None, variables: dict[str, str]) -> str | None:
        if not text:
            return text
        result = text
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", value)
        return result

    def _ensure_thread(self, tenant_id: uuid.UUID, subject: str, thread_id: uuid.UUID | None) -> EmailThread:
        if thread_id:
            thread = self.db.get(EmailThread, thread_id)
            if thread and thread.tenant_id == tenant_id:
                return thread
        thread = EmailThread(tenant_id=tenant_id, subject=subject or "(no subject)", last_message_at=utcnow())
        self.db.add(thread)
        self.db.flush()
        return thread

    def _log_email_event(self, email: Email, event_type: str, metadata: dict | None = None) -> None:
        self.db.add(EmailLog(email_id=email.id, event_type=event_type, log_metadata=metadata))

    def _inject_tracking(self, email: Email, html: str | None) -> str | None:
        if not html or not email.tracking_token:
            return html
        base = self.settings.api_public_url.rstrip("/")
        pixel = f'<img src="{base}/emails/track/open/{email.tracking_token}" width="1" height="1" alt="" style="display:none" />'
        return f"{html}{pixel}"

    def _log_activity(self, tenant_id: uuid.UUID, email: Email, action: str, title: str, description: str, actor_id: uuid.UUID | None) -> None:
        entity_type, entity_id = self._entity_link(email)
        activity = ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            title=title,
            description=description,
            metadata={"email_id": str(email.id), "subject": email.subject},
            activity_type="email",
        )
        email.activity_id = activity.id

    def get_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID) -> Email:
        email = self.repo.get_by_id(tenant_id, email_id)
        if email is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
        return email

    def list_emails(self, tenant_id: uuid.UUID, **kwargs) -> tuple[list[Email], int]:
        return self.repo.list_emails(tenant_id, **kwargs)

    def create_draft(self, tenant_id: uuid.UUID, payload: EmailCreate, user_id: uuid.UUID) -> Email:
        self._validate_priority(payload.priority)
        self._validate_fk(
            tenant_id,
            company_id=payload.company_id,
            contact_id=payload.contact_id,
            lead_id=payload.lead_id,
            deal_id=payload.deal_id,
            task_id=payload.task_id,
            meeting_id=payload.meeting_id,
        )
        user = self.db.get(User, user_id)
        thread = self._ensure_thread(tenant_id, payload.subject, payload.thread_id)
        body_html = sanitize_html(payload.body_html)
        body_text = payload.body_text or html_to_text(body_html)

        email = Email(
            tenant_id=tenant_id,
            thread_id=thread.id,
            parent_email_id=payload.parent_email_id,
            sender_id=user_id,
            created_by_id=user_id,
            updated_by_id=user_id,
            template_id=payload.template_id,
            from_email=user.email if user else None,
            from_name=payload.from_name,
            subject=payload.subject,
            body_html=body_html,
            body_text=body_text,
            status="draft",
            priority=payload.priority,
            folder="drafts",
            direction="outbound",
            company_id=payload.company_id,
            contact_id=payload.contact_id,
            lead_id=payload.lead_id,
            deal_id=payload.deal_id,
            task_id=payload.task_id,
            meeting_id=payload.meeting_id,
            email_metadata=payload.metadata,
        )
        self.db.add(email)
        self.db.flush()
        if payload.recipients:
            self._sync_recipients(email, payload.recipients)
        self._log_email_event(email, "draft_saved")
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def update_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID, payload: EmailUpdate, user_id: uuid.UUID) -> Email:
        email = self.get_email(tenant_id, email_id)
        if email.status not in ("draft", "scheduled"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only drafts and scheduled emails can be edited")
        data = payload.model_dump(exclude_unset=True)
        recipients = data.pop("recipients", None)
        metadata = data.pop("metadata", None)
        if "body_html" in data:
            data["body_html"] = sanitize_html(data["body_html"])
            if "body_text" not in data:
                data["body_text"] = html_to_text(data["body_html"])
        if "priority" in data:
            self._validate_priority(data["priority"])
        self._validate_fk(
            tenant_id,
            company_id=data.get("company_id", email.company_id),
            contact_id=data.get("contact_id", email.contact_id),
            lead_id=data.get("lead_id", email.lead_id),
            deal_id=data.get("deal_id", email.deal_id),
            task_id=data.get("task_id", email.task_id),
            meeting_id=data.get("meeting_id", email.meeting_id),
        )
        for field, value in data.items():
            setattr(email, field, value)
        if metadata is not None:
            email.email_metadata = metadata
        email.updated_by_id = user_id
        if recipients is not None:
            self._sync_recipients(email, recipients)
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def send_email(self, tenant_id: uuid.UUID, payload: EmailSendRequest, user_id: uuid.UUID) -> Email:
        if not payload.recipients:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one recipient is required")

        if payload.email_id:
            email = self.get_email(tenant_id, payload.email_id)
            if email.status not in ("draft", "scheduled", "failed"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email cannot be sent")
            update = EmailUpdate(
                subject=payload.subject,
                body_html=payload.body_html,
                body_text=payload.body_text,
                priority=payload.priority,
                recipients=payload.recipients,
                company_id=payload.company_id,
                contact_id=payload.contact_id,
                lead_id=payload.lead_id,
                deal_id=payload.deal_id,
                task_id=payload.task_id,
                meeting_id=payload.meeting_id,
                from_name=payload.from_name,
            )
            email = self.update_email(tenant_id, email.id, update, user_id)
        else:
            create = EmailCreate(
                subject=payload.subject,
                body_html=payload.body_html,
                body_text=payload.body_text,
                priority=payload.priority,
                recipients=payload.recipients,
                company_id=payload.company_id,
                contact_id=payload.contact_id,
                lead_id=payload.lead_id,
                deal_id=payload.deal_id,
                task_id=payload.task_id,
                meeting_id=payload.meeting_id,
                template_id=payload.template_id,
                parent_email_id=payload.parent_email_id,
                from_name=payload.from_name,
            )
            email = self.create_draft(tenant_id, create, user_id)

        return self._deliver_email(tenant_id, email, user_id, include_signature=payload.include_signature)

    def schedule_email(self, tenant_id: uuid.UUID, payload: EmailScheduleRequest, user_id: uuid.UUID) -> Email:
        scheduled_at = payload.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=UTC)
        min_time = datetime.now(UTC) + timedelta(minutes=1)
        if scheduled_at <= min_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled time must be at least 1 minute in the future",
            )

        if payload.email_id:
            update = EmailUpdate(
                subject=payload.subject,
                body_html=payload.body_html,
                body_text=payload.body_text,
                priority=payload.priority,
                recipients=payload.recipients,
                company_id=payload.company_id,
                contact_id=payload.contact_id,
                lead_id=payload.lead_id,
                deal_id=payload.deal_id,
                task_id=payload.task_id,
                meeting_id=payload.meeting_id,
                from_name=payload.from_name,
            )
            email = self.update_email(tenant_id, payload.email_id, update, user_id)
        else:
            create = EmailCreate(
                subject=payload.subject,
                body_html=payload.body_html,
                body_text=payload.body_text,
                priority=payload.priority,
                recipients=payload.recipients,
                company_id=payload.company_id,
                contact_id=payload.contact_id,
                lead_id=payload.lead_id,
                deal_id=payload.deal_id,
                task_id=payload.task_id,
                meeting_id=payload.meeting_id,
                template_id=payload.template_id,
                parent_email_id=payload.parent_email_id,
                from_name=payload.from_name,
            )
            email = self.create_draft(tenant_id, create, user_id)

        email.status = "scheduled"
        email.folder = "scheduled"
        email.scheduled_at = scheduled_at
        self._log_email_event(email, "scheduled", {"scheduled_at": scheduled_at.isoformat()})
        self._log_activity(tenant_id, email, "email", "Email scheduled", f'"{email.subject}" scheduled for delivery', user_id)
        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            actor_id=None,
            type="email_scheduled",
            title="Email scheduled",
            message=f'"{email.subject}" will send at {scheduled_at.strftime("%b %d, %H:%M")}',
            entity_type="email",
            entity_id=email.id,
        )
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def _deliver_email(self, tenant_id: uuid.UUID, email: Email, user_id: uuid.UUID, *, include_signature: bool) -> Email:
        if not email.recipients:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one recipient is required")

        user_settings = self._get_user_settings(tenant_id, user_id) if include_signature else None
        variables = self._build_variables(tenant_id, email)
        subject = self._apply_template_variables(email.subject, variables) or "(no subject)"
        body_html = self._apply_template_variables(email.body_html, variables)
        body_text = self._apply_template_variables(email.body_text, variables) or html_to_text(body_html)
        body_html, body_text = self._apply_signature(body_html, body_text, user_settings)

        email.tracking_token = secrets.token_urlsafe(32)
        body_html = self._inject_tracking(email, body_html)
        email.status = "sending"
        self.db.flush()

        to_addrs = [r.email_address for r in email.recipients if r.recipient_type == "to"]
        cc_addrs = [r.email_address for r in email.recipients if r.recipient_type == "cc"]
        bcc_addrs = [r.email_address for r in email.recipients if r.recipient_type == "bcc"]
        if not to_addrs:
            to_addrs = [r.email_address for r in email.recipients]

        attachment_data: list[tuple[str, str, bytes]] = []
        for att in email.attachments:
            if att.content:
                attachment_data.append((att.filename, att.content_type, att.content))

        try:
            send_crm_email(
                to_addresses=to_addrs,
                cc_addresses=cc_addrs or None,
                bcc_addresses=bcc_addrs or None,
                subject=subject,
                text_body=body_text or "",
                html_body=body_html,
                from_name=email.from_name or (user_settings.default_from_name if user_settings else None),
                attachment_paths=attachment_data or None,
            )
            email.status = "sent"
            email.folder = "sent"
            email.sent_at = utcnow()
            email.subject = subject
            email.body_html = body_html
            email.body_text = body_text
            self._log_email_event(email, "sent")
            self._log_email_event(email, "delivered")
            self._log_activity(tenant_id, email, "email_sent", "Email sent", f'Email "{subject}" was sent', user_id)
            if email.template_id:
                self._log_email_event(email, "template_used", {"template_id": str(email.template_id)})
            notify_user(
                self.db,
                tenant_id=tenant_id,
                user_id=user_id,
                actor_id=None,
                type="email_delivered",
                title="Email delivered",
                message=f'"{subject}" was sent successfully',
                entity_type="email",
                entity_id=email.id,
            )
        except Exception as exc:
            email.status = "failed"
            self._log_email_event(email, "failed", {"error": str(exc)})
            notify_user(
                self.db,
                tenant_id=tenant_id,
                user_id=user_id,
                actor_id=None,
                type="email_failed",
                title="Email failed",
                message=f'Failed to send "{subject}"',
                entity_type="email",
                entity_id=email.id,
                priority="high",
            )
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to send email: {exc}") from exc

        thread = email.thread or self._ensure_thread(tenant_id, subject, email.thread_id)
        thread.last_message_at = utcnow()
        thread.subject = subject
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def reply_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID, payload: EmailReplyRequest, user_id: uuid.UUID) -> Email:
        original = self.get_email(tenant_id, email_id)
        recipients: list[EmailRecipientInput] = list(payload.recipients or [])
        if not recipients:
            if payload.reply_all:
                seen: set[str] = set()
                for r in original.recipients:
                    if r.email_address not in seen:
                        recipients.append(EmailRecipientInput(recipient_type="to", email_address=r.email_address, display_name=r.display_name))
                        seen.add(r.email_address)
                if original.from_email and original.from_email not in seen:
                    recipients.append(EmailRecipientInput(recipient_type="to", email_address=original.from_email))
            elif original.from_email:
                recipients = [EmailRecipientInput(recipient_type="to", email_address=original.from_email)]

        quoted = f"\n\n---\nOn {original.sent_at or original.created_at}, {original.from_email} wrote:\n{original.body_text or ''}"
        body_text = (payload.body_text or html_to_text(payload.body_html) or "") + quoted
        body_html = (payload.body_html or f"<p>{payload.body_text or ''}</p>") + f"<br/><blockquote>{original.body_html or original.body_text or ''}</blockquote>"

        send_req = EmailSendRequest(
            subject=f"Re: {original.subject}" if not original.subject.lower().startswith("re:") else original.subject,
            body_html=body_html,
            body_text=body_text,
            recipients=recipients,
            parent_email_id=original.id,
            company_id=original.company_id,
            contact_id=original.contact_id,
            lead_id=original.lead_id,
            deal_id=original.deal_id,
            task_id=original.task_id,
            meeting_id=original.meeting_id,
            include_signature=payload.include_signature,
        )
        email = self.send_email(tenant_id, send_req, user_id)
        self._log_email_event(original, "replied")
        self.db.commit()
        return email

    def forward_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID, payload: EmailForwardRequest, user_id: uuid.UUID) -> Email:
        original = self.get_email(tenant_id, email_id)
        fwd_html = (payload.body_html or "") + f"<br/><br/>---------- Forwarded message ----------<br/>{original.body_html or original.body_text or ''}"
        fwd_text = (payload.body_text or "") + f"\n\n---------- Forwarded message ----------\n{original.body_text or ''}"
        send_req = EmailSendRequest(
            subject=f"Fwd: {original.subject}",
            body_html=fwd_html,
            body_text=fwd_text,
            recipients=payload.recipients,
            parent_email_id=original.id,
            company_id=original.company_id,
            contact_id=original.contact_id,
            lead_id=original.lead_id,
            deal_id=original.deal_id,
            include_signature=payload.include_signature,
        )
        return self.send_email(tenant_id, send_req, user_id)

    def star_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID, starred: bool) -> Email:
        email = self.get_email(tenant_id, email_id)
        email.is_starred = starred
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def archive_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID, archived: bool) -> Email:
        email = self.get_email(tenant_id, email_id)
        email.archived_at = utcnow() if archived else None
        if archived:
            email.folder = "archive"
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def trash_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID) -> Email:
        email = self.get_email(tenant_id, email_id)
        email.deleted_at = utcnow()
        email.folder = "trash"
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def delete_email(self, tenant_id: uuid.UUID, email_id: uuid.UUID) -> None:
        email = self.get_email(tenant_id, email_id)
        self.db.delete(email)
        self.db.commit()

    def mark_read(self, tenant_id: uuid.UUID, email_id: uuid.UUID, read: bool) -> Email:
        email = self.get_email(tenant_id, email_id)
        email.is_read = read
        self.db.commit()
        return self.get_email(tenant_id, email.id)

    def get_thread(self, tenant_id: uuid.UUID, thread_id: uuid.UUID) -> tuple[EmailThread, list[Email]]:
        thread = self.db.get(EmailThread, thread_id)
        if thread is None or thread.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
        emails = self.repo.list_thread_emails(tenant_id, thread_id)
        return thread, emails

    def get_statistics(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None = None) -> dict:
        now = datetime.now(UTC)
        week_ago = now - timedelta(days=7)
        stats = self.repo.tracking_stats(tenant_id, week_ago)
        sent = stats["sent"] or 1
        return {
            "unread_count": self.repo.unread_count(tenant_id, user_id),
            "drafts_count": self.repo.count_by_folder(tenant_id, "drafts", user_id),
            "scheduled_count": self.repo.count_by_folder(tenant_id, "scheduled", user_id),
            "sent_today": self.repo.sent_count_since(tenant_id, now.replace(hour=0, minute=0, second=0, microsecond=0), user_id),
            "sent_this_week": stats["sent"],
            "open_rate": round(stats["opened"] / sent * 100, 1),
            "click_rate": round(stats["clicked"] / sent * 100, 1),
            "reply_rate": round(stats["replied"] / sent * 100, 1),
            "delivery_rate": round(stats["delivered"] / sent * 100, 1),
        }

    def list_templates(self, tenant_id: uuid.UUID, category: str | None = None) -> list[EmailTemplate]:
        return self.repo.list_templates(tenant_id, category)

    def create_template(self, tenant_id: uuid.UUID, payload: EmailTemplateCreate, user_id: uuid.UUID) -> EmailTemplate:
        template = EmailTemplate(
            tenant_id=tenant_id,
            name=payload.name,
            category=payload.category,
            subject=payload.subject,
            body_html=sanitize_html(payload.body_html) or "",
            body_text=payload.body_text,
            template_variables=payload.variables,
            created_by_id=user_id,
        )
        self.db.add(template)
        self.db.commit()
        return self.repo.get_template(tenant_id, template.id)  # type: ignore[return-value]

    def update_template(self, tenant_id: uuid.UUID, template_id: uuid.UUID, payload: EmailTemplateUpdate) -> EmailTemplate:
        template = self.repo.get_template(tenant_id, template_id)
        if template is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        data = payload.model_dump(exclude_unset=True)
        variables = data.pop("variables", None)
        if "body_html" in data:
            data["body_html"] = sanitize_html(data["body_html"])
        for field, value in data.items():
            setattr(template, field, value)
        if variables is not None:
            template.template_variables = variables
        self.db.commit()
        return self.repo.get_template(tenant_id, template_id)  # type: ignore[return-value]

    def delete_template(self, tenant_id: uuid.UUID, template_id: uuid.UUID) -> None:
        template = self.repo.get_template(tenant_id, template_id)
        if template is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        self.db.delete(template)
        self.db.commit()

    def duplicate_template(self, tenant_id: uuid.UUID, template_id: uuid.UUID, user_id: uuid.UUID) -> EmailTemplate:
        template = self.repo.get_template(tenant_id, template_id)
        if template is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return self.create_template(
            tenant_id,
            EmailTemplateCreate(
                name=f"{template.name} (copy)",
                category=template.category,
                subject=template.subject,
                body_html=template.body_html,
                body_text=template.body_text,
                variables=template.template_variables if isinstance(template.template_variables, list) else None,
            ),
            user_id,
        )

    def get_settings(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> EmailUserSettings:
        settings = self.repo.get_user_settings(tenant_id, user_id)
        if settings is None:
            settings = EmailUserSettings(tenant_id=tenant_id, user_id=user_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_settings(self, tenant_id: uuid.UUID, user_id: uuid.UUID, payload: EmailUserSettingsUpdate) -> EmailUserSettings:
        settings = self.get_settings(tenant_id, user_id)
        data = payload.model_dump(exclude_unset=True)
        if "signature_html" in data:
            data["signature_html"] = sanitize_html(data["signature_html"])
        for field, value in data.items():
            setattr(settings, field, value)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    async def upload_attachment(self, tenant_id: uuid.UUID, email_id: uuid.UUID, file: UploadFile) -> EmailAttachment:
        email = self.get_email(tenant_id, email_id)
        if email.status not in ("draft", "scheduled"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot attach files to sent emails")
        if len(email.attachments) >= self.settings.EMAIL_MAX_ATTACHMENTS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum attachments reached")

        content = await file.read()
        if len(content) > self.settings.EMAIL_MAX_ATTACHMENT_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attachment too large")

        safe_name = re.sub(r"[^\w.\-]", "_", file.filename or "attachment")

        attachment = EmailAttachment(
            email_id=email.id,
            filename=safe_name,
            content_type=file.content_type or "application/octet-stream",
            size_bytes=len(content),
            content=content,
        )
        self.db.add(attachment)
        email.has_attachments = True
        self._log_email_event(email, "attachment_uploaded", {"filename": safe_name})
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def delete_attachment(self, tenant_id: uuid.UUID, email_id: uuid.UUID, attachment_id: uuid.UUID) -> None:
        email = self.get_email(tenant_id, email_id)
        attachment = next((a for a in email.attachments if a.id == attachment_id), None)
        if attachment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
        self.db.delete(attachment)
        email.has_attachments = len(email.attachments) > 1
        self.db.commit()

    def track_open(self, token: str) -> None:
        email = self.repo.get_by_tracking_token(token)
        if email is None:
            return
        self._log_email_event(email, "opened")
        self._log_activity(
            email.tenant_id,
            email,
            "email_opened",
            "Email opened",
            f'"{email.subject}" was opened',
            email.sender_id,
        )
        self.db.commit()

    def track_click(self, token: str, url: str) -> str:
        email = self.repo.get_by_tracking_token(token)
        if email is None:
            return url
        self._log_email_event(email, "clicked", {"url": url})
        self.db.commit()
        return url

    def process_scheduled(self) -> int:
        due = self.repo.get_scheduled_due()
        count = 0
        for email in due:
            try:
                self._deliver_email(email.tenant_id, email, email.sender_id or email.created_by_id, include_signature=True)  # type: ignore[arg-type]
                count += 1
            except HTTPException:
                continue
        return count
