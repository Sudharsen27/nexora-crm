from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.ai_agent import (
    AgentExecuteRequest,
    AgentOrchestrateRequest,
    AgentsDashboardResponse,
    AiAgentDetail,
    AiAgentExecutionResponse,
    AiAgentMemoryResponse,
    AiAgentSummary,
    AiAgentTaskResponse,
    AiInsightResponse,
    AiRecommendationResponse,
    AiUsageResponse,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    RecommendationUpdateRequest,
)
from app.services.ai_agent_service import AiAgentService

router = APIRouter(prefix="/tenants/{slug}/agents", tags=["agents"])


@router.get("/dashboard", response_model=AgentsDashboardResponse)
def get_agents_dashboard(
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> AgentsDashboardResponse:
    return AiAgentService(db).get_dashboard(ctx)


@router.get("", response_model=list[AiAgentSummary])
def list_agents(
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> list[AiAgentSummary]:
    return AiAgentService(db).list_agents(ctx)


@router.get("/executions", response_model=list[AiAgentExecutionResponse])
def list_executions(
    agent_id: UUID | None = None,
    limit: int = Query(50, le=200),
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> list[AiAgentExecutionResponse]:
    return AiAgentService(db).list_executions(ctx, agent_id=agent_id, limit=limit)


@router.get("/recommendations", response_model=list[AiRecommendationResponse])
def list_recommendations(
    status_filter: str | None = Query(None, alias="status"),
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> list[AiRecommendationResponse]:
    return AiAgentService(db).list_recommendations(ctx, status_filter)


@router.patch("/recommendations/{rec_id}", response_model=AiRecommendationResponse)
def update_recommendation(
    rec_id: UUID,
    payload: RecommendationUpdateRequest,
    ctx: TenantContext = Depends(require_permission("agent:write")),
    db: Session = Depends(get_db),
) -> AiRecommendationResponse:
    return AiAgentService(db).update_recommendation(ctx, rec_id, payload)


@router.get("/insights", response_model=list[AiInsightResponse])
def list_insights(
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> list[AiInsightResponse]:
    return AiAgentService(db).list_insights(ctx)


@router.post("/insights/{insight_id}/read", response_model=AiInsightResponse)
def mark_insight_read(
    insight_id: UUID,
    ctx: TenantContext = Depends(require_permission("agent:write")),
    db: Session = Depends(get_db),
) -> AiInsightResponse:
    return AiAgentService(db).mark_insight_read(ctx, insight_id)


@router.get("/memory", response_model=list[AiAgentMemoryResponse])
def list_memory(
    agent_id: UUID | None = None,
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> list[AiAgentMemoryResponse]:
    return AiAgentService(db).list_memory(ctx, agent_id)


@router.get("/tasks", response_model=list[AiAgentTaskResponse])
def list_tasks(
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> list[AiAgentTaskResponse]:
    return AiAgentService(db).list_tasks(ctx)


@router.get("/usage", response_model=list[AiUsageResponse])
def list_usage(
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> list[AiUsageResponse]:
    return AiAgentService(db).list_usage(ctx)


@router.post("/orchestrate", response_model=list[AiAgentExecutionResponse])
def orchestrate_agents(
    payload: AgentOrchestrateRequest,
    ctx: TenantContext = Depends(require_permission("agent:execute")),
    db: Session = Depends(get_db),
) -> list[AiAgentExecutionResponse]:
    return AiAgentService(db).orchestrate(ctx, payload)


@router.post("/knowledge/search", response_model=KnowledgeSearchResponse)
def knowledge_search(
    payload: KnowledgeSearchRequest,
    ctx: TenantContext = Depends(require_permission("agent:execute")),
    db: Session = Depends(get_db),
) -> KnowledgeSearchResponse:
    return AiAgentService(db).knowledge_search(ctx, payload)


@router.get("/{agent_id}", response_model=AiAgentDetail)
def get_agent(
    agent_id: UUID,
    ctx: TenantContext = Depends(require_permission("agent:read")),
    db: Session = Depends(get_db),
) -> AiAgentDetail:
    return AiAgentService(db).get_agent(ctx, agent_id)


@router.post("/{agent_id}/execute", response_model=AiAgentExecutionResponse)
def execute_agent(
    agent_id: UUID,
    payload: AgentExecuteRequest,
    ctx: TenantContext = Depends(require_permission("agent:execute")),
    db: Session = Depends(get_db),
) -> AiAgentExecutionResponse:
    return AiAgentService(db).execute_agent(ctx, agent_id, payload)


@router.patch("/{agent_id}/toggle", response_model=AiAgentDetail)
def toggle_agent(
    agent_id: UUID,
    enabled: bool = Query(...),
    ctx: TenantContext = Depends(require_permission("agent:write")),
    db: Session = Depends(get_db),
) -> AiAgentDetail:
    return AiAgentService(db).toggle_agent(ctx, agent_id, enabled)
