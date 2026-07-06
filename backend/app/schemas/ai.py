"""Pydantic schemas for Nexora AI chat API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AiChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str = Field(min_length=1, max_length=32000)


class AiChatRequest(BaseModel):
    messages: list[AiChatMessage] = Field(min_length=1, max_length=50)


class AiMetaResponse(BaseModel):
    enabled: bool
    provider: str
    model: str
    mock_fallback: bool
