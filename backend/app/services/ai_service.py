"""OpenAI-compatible LLM streaming for Nexora AI Assistant."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.ai_context import build_crm_context

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Nexora AI, an enterprise CRM assistant embedded in Nexora CRM.
You help sales and operations teams with deals, leads, contacts, tasks, meetings, forecasts, and recommendations.

Guidelines:
- Be concise, professional, and actionable.
- Use markdown for structure (headings, bullets, bold) when helpful.
- Base answers on the CRM context provided when relevant.
- If data is missing, say what you would need and suggest next steps in the CRM.
- Never invent specific deal names or dollar amounts not present in the context unless clearly labeled as an estimate or example.
- For forecasts and risk analysis, explain assumptions briefly.
"""


class AiService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def _api_url(self) -> str:
        base = self.settings.AI_BASE_URL.rstrip("/")
        return f"{base}/chat/completions"

    async def stream_chat(
        self,
        tenant_id,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        if not self.settings.ai_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI is not configured. Set OPENAI_API_KEY on the backend.",
            )

        crm_context = build_crm_context(self.db, tenant_id)
        system_message = {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\n---\nCRM CONTEXT\n{crm_context}",
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

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    self._api_url(),
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code >= 400:
                        body = await response.aread()
                        logger.error("LLM API error %s: %s", response.status_code, body[:500])
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="AI provider returned an error. Check API key and model name.",
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
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content")
                        if content:
                            yield content
        except httpx.HTTPError as exc:
            logger.exception("LLM request failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI provider unreachable: {exc}",
            ) from exc
