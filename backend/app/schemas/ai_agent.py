"""Pydantic schemas for Enterprise AI Multi-Agent Platform (Phase 17)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AiAgentSummary(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    icon: str
    status: str
    is_enabled: bool
    capabilities: list[str]
    total_executions: int
    success_count: int
    failure_count: int
    total_tokens: int
    avg_duration_ms: float
    last_run_at: datetime | None

    model_config = {"from_attributes": True}


class AiAgentDetail(AiAgentSummary):
    config: dict[str, Any]


class AgentExecuteRequest(BaseModel):
    action: str = Field(..., max_length=80)
    payload: dict[str, Any] = Field(default_factory=dict)


class AgentOrchestrateRequest(BaseModel):
    trigger: str = Field(default="manual", max_length=80)
    agent_slugs: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)


class AiAgentExecutionResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    agent_slug: str | None = None
    agent_name: str | None = None
    action: str
    status: str
    input_payload: dict[str, Any]
    output_payload: dict[str, Any]
    error_message: str | None
    tokens_used: int
    duration_ms: int
    orchestration_id: uuid.UUID | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AiAgentMemoryResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID | None
    memory_key: str
    memory_type: str
    content: dict[str, Any]
    importance: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AiAgentTaskResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    title: str
    description: str | None
    status: str
    priority: str
    payload: dict[str, Any]
    result: dict[str, Any]
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class AiRecommendationResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID | None
    title: str
    description: str
    category: str
    status: str
    priority: str
    entity_type: str | None
    entity_id: str | None
    confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}


class RecommendationUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(pending|accepted|dismissed|expired)$")


class AiInsightResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID | None
    title: str
    summary: str
    severity: str
    category: str
    data: dict[str, Any]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AiUsageResponse(BaseModel):
    usage_date: datetime
    executions: int
    tokens_used: int
    success_count: int
    failure_count: int
    total_duration_ms: int


class AgentsDashboardResponse(BaseModel):
    total_agents: int
    enabled_agents: int
    running_agents: int
    executions_24h: int
    success_rate: float
    tokens_24h: int
    pending_recommendations: int
    open_insights: int
    queued_tasks: int
    agents: list[AiAgentSummary]
    recent_executions: list[AiAgentExecutionResponse]
    recommendations: list[AiRecommendationResponse]
    insights: list[AiInsightResponse]


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    sources: list[str] = Field(default_factory=lambda: ["crm", "documents", "meetings", "activities"])


class KnowledgeSearchResponse(BaseModel):
    query: str
    results: list[dict[str, Any]]
    answer: str
