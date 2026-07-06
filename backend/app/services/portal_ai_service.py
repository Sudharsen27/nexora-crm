"""Portal-scoped AI assistant."""

from __future__ import annotations

import json
import logging
import re
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.portal_deps import PortalContext
from app.db.mixins import utcnow
from app.models.deal import DEAL_STAGE_LABELS, OPEN_DEAL_STAGES, Deal
from app.models.document import Document
from app.models.meeting import Meeting
from app.models.portal import SupportTicket
from app.services.ai_service import SYSTEM_PROMPT, AiService
from app.services.portal_scope import scope_deals, scope_documents, scope_meetings

logger = logging.getLogger(__name__)


class PortalAiService(AiService):
    def __init__(self, db: Session):
        super().__init__(db)

    def _portal_context(self, ctx: PortalContext) -> str:
        tid = ctx.tenant.id
        open_deals = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(Deal.tenant_id == tid, scope_deals(ctx), Deal.stage.in_(OPEN_DEAL_STAGES))
        ) or 0
        docs = self.db.scalar(
            select(func.count())
            .select_from(Document)
            .where(Document.tenant_id == tid, Document.deleted_at.is_(None), scope_documents(ctx))
        ) or 0
        meetings = self.db.scalar(
            select(func.count())
            .select_from(Meeting)
            .where(Meeting.tenant_id == tid, scope_meetings(ctx))
        ) or 0
        tickets = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(SupportTicket.tenant_id == tid, SupportTicket.portal_user_id == ctx.portal_user.id)
        ) or 0
        company = ctx.company.name if ctx.company else (ctx.contact.company or "N/A")
        return f"""Customer portal context:
- Customer: {ctx.portal_user.full_name} ({ctx.portal_user.email})
- Organization: {ctx.tenant.name}
- Company: {company}
- Open deals visible to customer: {open_deals}
- Shared documents: {docs}
- Meetings: {meetings}
- Support tickets: {tickets}
Only discuss data this customer is allowed to see. Be helpful and professional."""

    def _gather_facts(self, ctx: PortalContext) -> dict:
        tid = ctx.tenant.id
        now = utcnow()

        deals = self.db.scalars(
            select(Deal)
            .where(Deal.tenant_id == tid, scope_deals(ctx), Deal.stage.in_(OPEN_DEAL_STAGES))
            .order_by(Deal.updated_at.desc())
            .limit(10)
        ).all()

        meetings = self.db.scalars(
            select(Meeting)
            .where(
                Meeting.tenant_id == tid,
                scope_meetings(ctx),
                Meeting.start_datetime >= now,
                Meeting.status.in_(("scheduled", "confirmed")),
            )
            .order_by(Meeting.start_datetime)
            .limit(5)
        ).all()

        tickets = self.db.scalars(
            select(SupportTicket)
            .where(
                SupportTicket.tenant_id == tid,
                SupportTicket.portal_user_id == ctx.portal_user.id,
            )
            .order_by(SupportTicket.updated_at.desc())
            .limit(5)
        ).all()

        doc_count = self.db.scalar(
            select(func.count())
            .select_from(Document)
            .where(Document.tenant_id == tid, Document.deleted_at.is_(None), scope_documents(ctx))
        ) or 0

        return {"deals": deals, "meetings": meetings, "tickets": tickets, "doc_count": doc_count}

    def _local_reply(self, ctx: PortalContext, user_message: str) -> str:
        """Answer common portal questions from scoped CRM data (no external LLM)."""
        facts = self._gather_facts(ctx)
        q = user_message.lower().strip()
        name = ctx.portal_user.full_name.split()[0] if ctx.portal_user.full_name else "there"

        if re.search(r"\b(deal|pipeline|proposal|opportunit)", q):
            deals = facts["deals"]
            if not deals:
                return (
                    f"Hi {name}, you don't have any open deals linked to your account right now. "
                    "Your account manager can associate deals with your contact in the CRM."
                )
            lines = [f"Hi {name}, here are your **open deals** ({len(deals)}):\n"]
            for d in deals:
                stage = DEAL_STAGE_LABELS.get(d.stage, d.stage)
                value = f"{d.currency} {d.value:,.2f}" if d.value is not None else "—"
                close = d.expected_close_date.isoformat() if d.expected_close_date else "TBD"
                lines.append(f"- **{d.title}** - {stage}, {value}, {d.probability}% likely, close {close}")
            lines.append("\nOpen **Deals** in the sidebar for full details and timeline.")
            return "\n".join(lines)

        if re.search(r"\b(meeting|calendar|schedule|call)", q):
            meetings = facts["meetings"]
            if not meetings:
                return (
                    f"Hi {name}, no upcoming meetings are scheduled. "
                    "Go to **Calendar** → **Request meeting** to propose a time with your account team."
                )
            lines = [f"Hi {name}, your **upcoming meetings**:\n"]
            for m in meetings:
                when = m.start_datetime.astimezone(UTC).strftime("%b %d, %Y at %H:%M UTC")
                lines.append(f"- **{m.title}** - {when} ({m.status})")
                if m.meeting_url:
                    lines.append(f"  Join: {m.meeting_url}")
            return "\n".join(lines)

        if re.search(r"\b(ticket|support|help|issue)", q):
            tickets = facts["tickets"]
            if not tickets:
                return (
                    f"Hi {name}, you have no support tickets yet. "
                    "Open **Support** → **New ticket** to reach your account team."
                )
            lines = [f"Hi {name}, your **support tickets**:\n"]
            for t in tickets:
                lines.append(f"- **{t.subject}** - {t.status} ({t.priority} priority)")
            lines.append("\nClick a ticket in **Support** to view replies and add messages.")
            return "\n".join(lines)

        if re.search(r"\b(document|upload|file|download)", q):
            count = facts["doc_count"]
            return (
                f"Hi {name}, you have **{count} document(s)** shared with your account.\n\n"
                "To upload: go to **Documents** → **Upload**.\n"
                "To download: click the download icon next to any file.\n"
                "Our team reviews new uploads within 1 business day."
            )

        if re.search(r"\b(invoice|payment|bill)", q):
            return (
                f"Hi {name}, view **Invoices & payments** in the sidebar for billing history. "
                "For payment questions, open a **Support** ticket under the billing category."
            )

        # General summary
        deals_n = len(facts["deals"])
        meetings_n = len(facts["meetings"])
        tickets_n = len(facts["tickets"])
        return (
            f"Hi {name}, I'm your portal assistant for **{ctx.tenant.name}**.\n\n"
            f"**At a glance:**\n"
            f"- Open deals: {deals_n}\n"
            f"- Upcoming meetings: {meetings_n}\n"
            f"- Support tickets: {tickets_n}\n"
            f"- Documents: {facts['doc_count']}\n\n"
            "Ask me about deals, meetings, documents, invoices, or support — "
            "or use the sidebar to navigate directly."
        )

    async def _stream_text(self, text: str) -> AsyncIterator[str]:
        """Yield local reply in small chunks for a natural streaming feel."""
        words = text.split(" ")
        buf = ""
        for i, word in enumerate(words):
            buf += (" " if i else "") + word
            if len(buf) >= 24 or i == len(words) - 1:
                yield buf
                buf = ""

    async def _stream_llm(
        self,
        ctx: PortalContext,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        portal_ctx = self._portal_context(ctx)
        system_message = {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nYou are assisting a **customer** in the self-service portal.\n\n{portal_ctx}",
        }
        payload = {
            "model": self.settings.AI_MODEL,
            "messages": [system_message, *messages],
            "stream": True,
            "temperature": self.settings.AI_TEMPERATURE,
            "max_tokens": self.settings.AI_MAX_TOKENS,
        }
        headers = {
            "Authorization": f"Bearer {self.settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                self._api_url(),
                headers=headers,
                json=payload,
            ) as response:
                if response.status_code >= 400:
                    body = await response.aread()
                    logger.warning("Portal LLM error %s: %s", response.status_code, body[:300])
                    raise httpx.HTTPStatusError(
                        "LLM error",
                        request=response.request,
                        response=response,
                    )
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    content = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                    if content:
                        yield content

    async def stream_chat(
        self,
        ctx: PortalContext,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        user_message = ""
        for m in reversed(messages):
            if m.get("role") == "user" and m.get("content"):
                user_message = m["content"]
                break

        if self.settings.ai_enabled:
            try:
                async for token in self._stream_llm(ctx, messages):
                    yield token
                return
            except (httpx.HTTPError, httpx.HTTPStatusError):
                logger.info("Portal AI falling back to local assistant")

        reply = self._local_reply(ctx, user_message)
        async for chunk in self._stream_text(reply):
            yield chunk
