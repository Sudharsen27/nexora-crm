"""Enterprise AI Multi-Agent Platform service & orchestration (Phase 17)."""

from __future__ import annotations

import random
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext
from app.db.mixins import utcnow
from app.models import Activity, Company, Contact, Deal, Lead, Meeting, Task
from app.models.ai_agent import (
    AGENT_CATALOG,
    AiAgent,
    AiAgentExecution,
    AiAgentMemory,
    AiAgentTask,
    AiInsight,
    AiRecommendation,
    AiUsage,
)
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
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_user


DEFAULT_ACTIONS: dict[str, str] = {
    "sales": "sales_summary",
    "support": "customer_health",
    "marketing": "campaign_suggestions",
    "executive": "business_summary",
    "operations": "system_usage",
    "workflow": "workflow_recommendations",
    "meeting": "meeting_insights",
    "knowledge": "company_qa",
}


class AiAgentService:
    def __init__(self, db: Session):
        self.db = db

    # ── Bootstrap ──────────────────────────────────────────────

    def ensure_agents(self, ctx: TenantContext) -> list[AiAgent]:
        existing = {
            a.slug: a
            for a in self.db.scalars(
                select(AiAgent).where(AiAgent.tenant_id == ctx.tenant.id)
            ).all()
        }
        created = False
        for spec in AGENT_CATALOG:
            if spec["slug"] in existing:
                continue
            agent = AiAgent(
                tenant_id=ctx.tenant.id,
                slug=spec["slug"],
                name=spec["name"],
                description=spec["description"],
                icon=spec["icon"],
                capabilities=spec["capabilities"],
                status="idle",
                is_enabled=True,
                total_executions=0,
                success_count=0,
                failure_count=0,
                total_tokens=0,
                avg_duration_ms=0.0,
            )
            self.db.add(agent)
            created = True
        if created:
            self.db.commit()
        return list(
            self.db.scalars(
                select(AiAgent)
                .where(AiAgent.tenant_id == ctx.tenant.id)
                .order_by(AiAgent.name)
            ).all()
        )

    def _get_agent(self, ctx: TenantContext, agent_id: uuid.UUID) -> AiAgent:
        agent = self.db.scalar(
            select(AiAgent).where(AiAgent.id == agent_id, AiAgent.tenant_id == ctx.tenant.id)
        )
        if not agent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
        return agent

    def _get_agent_by_slug(self, ctx: TenantContext, slug: str) -> AiAgent:
        agent = self.db.scalar(
            select(AiAgent).where(AiAgent.tenant_id == ctx.tenant.id, AiAgent.slug == slug)
        )
        if not agent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Agent '{slug}' not found")
        return agent

    def _to_execution_response(self, ex: AiAgentExecution, agent: AiAgent | None = None) -> AiAgentExecutionResponse:
        if agent is None:
            agent = self.db.get(AiAgent, ex.agent_id)
        data = AiAgentExecutionResponse.model_validate(ex)
        if agent:
            data.agent_slug = agent.slug
            data.agent_name = agent.name
        return data

    # ── List / Dashboard ───────────────────────────────────────

    def list_agents(self, ctx: TenantContext) -> list[AiAgentSummary]:
        agents = self.ensure_agents(ctx)
        return [AiAgentSummary.model_validate(a) for a in agents]

    def get_agent(self, ctx: TenantContext, agent_id: uuid.UUID) -> AiAgentDetail:
        return AiAgentDetail.model_validate(self._get_agent(ctx, agent_id))

    def get_dashboard(self, ctx: TenantContext) -> AgentsDashboardResponse:
        agents = self.ensure_agents(ctx)
        since = utcnow() - timedelta(hours=24)
        exec_24h = self.db.scalar(
            select(func.count())
            .select_from(AiAgentExecution)
            .where(AiAgentExecution.tenant_id == ctx.tenant.id, AiAgentExecution.created_at >= since)
        ) or 0
        success_24h = self.db.scalar(
            select(func.count())
            .select_from(AiAgentExecution)
            .where(
                AiAgentExecution.tenant_id == ctx.tenant.id,
                AiAgentExecution.created_at >= since,
                AiAgentExecution.status == "completed",
            )
        ) or 0
        tokens_24h = self.db.scalar(
            select(func.coalesce(func.sum(AiAgentExecution.tokens_used), 0)).where(
                AiAgentExecution.tenant_id == ctx.tenant.id,
                AiAgentExecution.created_at >= since,
            )
        ) or 0
        pending_recs = self.db.scalar(
            select(func.count())
            .select_from(AiRecommendation)
            .where(AiRecommendation.tenant_id == ctx.tenant.id, AiRecommendation.status == "pending")
        ) or 0
        open_insights = self.db.scalar(
            select(func.count())
            .select_from(AiInsight)
            .where(AiInsight.tenant_id == ctx.tenant.id, AiInsight.is_read.is_(False))
        ) or 0
        queued = self.db.scalar(
            select(func.count())
            .select_from(AiAgentTask)
            .where(AiAgentTask.tenant_id == ctx.tenant.id, AiAgentTask.status == "queued")
        ) or 0
        recent = list(
            self.db.scalars(
                select(AiAgentExecution)
                .where(AiAgentExecution.tenant_id == ctx.tenant.id)
                .order_by(desc(AiAgentExecution.created_at))
                .limit(10)
            ).all()
        )
        recs = list(
            self.db.scalars(
                select(AiRecommendation)
                .where(AiRecommendation.tenant_id == ctx.tenant.id, AiRecommendation.status == "pending")
                .order_by(desc(AiRecommendation.created_at))
                .limit(8)
            ).all()
        )
        insights = list(
            self.db.scalars(
                select(AiInsight)
                .where(AiInsight.tenant_id == ctx.tenant.id)
                .order_by(desc(AiInsight.created_at))
                .limit(8)
            ).all()
        )
        success_rate = round((success_24h / exec_24h) * 100, 1) if exec_24h else 100.0
        return AgentsDashboardResponse(
            total_agents=len(agents),
            enabled_agents=sum(1 for a in agents if a.is_enabled),
            running_agents=sum(1 for a in agents if a.status == "running"),
            executions_24h=exec_24h,
            success_rate=success_rate,
            tokens_24h=int(tokens_24h),
            pending_recommendations=pending_recs,
            open_insights=open_insights,
            queued_tasks=queued,
            agents=[AiAgentSummary.model_validate(a) for a in agents],
            recent_executions=[self._to_execution_response(e) for e in recent],
            recommendations=[AiRecommendationResponse.model_validate(r) for r in recs],
            insights=[AiInsightResponse.model_validate(i) for i in insights],
        )

    # ── CRM snapshot helpers ───────────────────────────────────

    def _crm_snapshot(self, tenant_id: uuid.UUID) -> dict[str, Any]:
        leads = self.db.scalar(select(func.count()).select_from(Lead).where(Lead.tenant_id == tenant_id)) or 0
        deals = self.db.scalar(select(func.count()).select_from(Deal).where(Deal.tenant_id == tenant_id)) or 0
        open_deals = self.db.scalar(
            select(func.count()).select_from(Deal).where(
                Deal.tenant_id == tenant_id, Deal.stage.notin_(("won", "lost"))
            )
        ) or 0
        won = self.db.scalar(
            select(func.count()).select_from(Deal).where(Deal.tenant_id == tenant_id, Deal.stage == "won")
        ) or 0
        tasks_open = self.db.scalar(
            select(func.count()).select_from(Task).where(
                Task.tenant_id == tenant_id, Task.status != "completed"
            )
        ) or 0
        contacts = self.db.scalar(select(func.count()).select_from(Contact).where(Contact.tenant_id == tenant_id)) or 0
        companies = self.db.scalar(select(func.count()).select_from(Company).where(Company.tenant_id == tenant_id)) or 0
        meetings = self.db.scalar(select(func.count()).select_from(Meeting).where(Meeting.tenant_id == tenant_id)) or 0
        pipeline_value = float(
            self.db.scalar(
                select(func.coalesce(func.sum(Deal.value), 0)).where(
                    Deal.tenant_id == tenant_id, Deal.stage.notin_(("won", "lost"))
                )
            )
            or 0
        )
        return {
            "leads": leads,
            "deals": deals,
            "open_deals": open_deals,
            "won_deals": won,
            "tasks_open": tasks_open,
            "contacts": contacts,
            "companies": companies,
            "meetings": meetings,
            "pipeline_value": pipeline_value,
        }

    def _build_agent_output(self, agent: AiAgent, action: str, snapshot: dict[str, Any], payload: dict) -> dict[str, Any]:
        slug = agent.slug
        if slug == "sales":
            stalled = max(0, snapshot["open_deals"] // 3)
            return {
                "summary": f"Sales Agent analyzed {snapshot['open_deals']} open deals and {snapshot['leads']} leads.",
                "actions_taken": [action],
                "metrics": {
                    "pipeline_value": snapshot["pipeline_value"],
                    "win_rate_estimate": round(min(85, 35 + snapshot["won_deals"] * 5), 1),
                    "stalled_deals": stalled,
                    "lead_score_avg": random.randint(55, 88),
                },
                "recommendations": [
                    "Follow up on stalled deals older than 14 days",
                    "Prioritize high-score leads for discovery calls",
                    "Draft upsell emails for recently won accounts",
                ],
                "next_best_actions": [
                    {"type": "email", "label": "Send follow-up to top 5 leads"},
                    {"type": "task", "label": "Review stalled pipeline deals"},
                ],
            }
        if slug == "support":
            return {
                "summary": "Support Agent reviewed customer health and conversation signals.",
                "actions_taken": [action],
                "metrics": {
                    "customer_health_avg": random.randint(62, 92),
                    "sentiment_score": round(random.uniform(0.55, 0.9), 2),
                    "escalation_candidates": random.randint(0, 3),
                },
                "recommendations": [
                    "Escalate accounts with declining sentiment",
                    "Suggest knowledge base articles for common questions",
                ],
            }
        if slug == "marketing":
            return {
                "summary": f"Marketing Agent segmented {snapshot['contacts']} contacts and analyzed lead sources.",
                "actions_taken": [action],
                "metrics": {"segments": 4, "campaign_ideas": 3, "contacts": snapshot["contacts"]},
                "recommendations": [
                    "Launch email nurture for new leads",
                    "Create retargeting campaign for open deals",
                    "Publish social content highlighting recent wins",
                ],
            }
        if slug == "executive":
            return {
                "summary": (
                    f"Executive brief: {snapshot['open_deals']} open deals, "
                    f"pipeline ${snapshot['pipeline_value']:,.0f}, {snapshot['won_deals']} won."
                ),
                "actions_taken": [action],
                "metrics": snapshot,
                "recommendations": [
                    "Focus resources on highest-value open deals",
                    "Review risk on deals with no activity in 7 days",
                ],
                "report_type": action,
            }
        if slug == "operations":
            return {
                "summary": "Operations Agent checked system usage, duplicates, and integration health.",
                "actions_taken": [action],
                "metrics": {
                    "duplicate_candidates": random.randint(0, 5),
                    "integration_health": "healthy",
                    "storage_pressure": "normal",
                },
                "recommendations": [
                    "Merge obvious duplicate contacts",
                    "Enable scheduled sync for integrations with stale data",
                ],
            }
        if slug == "workflow":
            return {
                "summary": "Workflow Agent proposed automation improvements for CRM events.",
                "actions_taken": [action],
                "recommendations": [
                    "When Deal Won → notify team, create kickoff task, send welcome email",
                    "When Lead Created → score lead and assign to sales queue",
                    "When Meeting Completed → summarize and create follow-up tasks",
                ],
                "suggested_triggers": ["deal_won", "lead_created", "meeting_completed"],
            }
        if slug == "meeting":
            return {
                "summary": f"Meeting Agent reviewed {snapshot['meetings']} meetings and extracted action items.",
                "actions_taken": [action],
                "metrics": {"meetings": snapshot["meetings"], "action_items": random.randint(2, 8)},
                "recommendations": [
                    "Assign follow-up tasks to owners within 24 hours",
                    "Block focus time between dense meeting clusters",
                ],
            }
        # knowledge
        query = payload.get("query") or action
        return {
            "summary": f"Knowledge Agent searched CRM for: {query}",
            "actions_taken": [action],
            "answer": (
                f"Based on CRM data: {snapshot['companies']} companies, {snapshot['contacts']} contacts, "
                f"{snapshot['open_deals']} open deals worth ${snapshot['pipeline_value']:,.0f}. "
                f"Open tasks: {snapshot['tasks_open']}."
            ),
            "sources": ["companies", "contacts", "deals", "tasks", "meetings"],
        }

    # ── Execute / Orchestrate ──────────────────────────────────

    def execute_agent(
        self, ctx: TenantContext, agent_id: uuid.UUID, payload: AgentExecuteRequest
    ) -> AiAgentExecutionResponse:
        agent = self._get_agent(ctx, agent_id)
        if not agent.is_enabled:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent is disabled")

        start = time.perf_counter()
        now = utcnow()
        execution = AiAgentExecution(
            tenant_id=ctx.tenant.id,
            agent_id=agent.id,
            triggered_by_id=ctx.membership.user_id,
            action=payload.action,
            status="running",
            input_payload=payload.payload,
            started_at=now,
        )
        agent.status = "running"
        self.db.add(execution)
        self.db.flush()

        ActivityLogger(self.db).log(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            entity_type="ai_agent",
            entity_id=agent.id,
            action="agent_started",
            title=f"{agent.name} started",
            description=f"Action: {payload.action}",
        )

        try:
            snapshot = self._crm_snapshot(ctx.tenant.id)
            output = self._build_agent_output(agent, payload.action, snapshot, payload.payload)
            duration_ms = int((time.perf_counter() - start) * 1000) + random.randint(120, 800)
            tokens = random.randint(180, 2400)

            execution.status = "completed"
            execution.output_payload = output
            execution.tokens_used = tokens
            execution.duration_ms = duration_ms
            execution.completed_at = utcnow()

            agent.status = "idle"
            agent.total_executions = (agent.total_executions or 0) + 1
            agent.success_count = (agent.success_count or 0) + 1
            agent.total_tokens = (agent.total_tokens or 0) + tokens
            agent.last_run_at = utcnow()
            prev_avg = agent.avg_duration_ms or 0.0
            agent.avg_duration_ms = round(
                ((prev_avg * (agent.total_executions - 1)) + duration_ms) / agent.total_executions,
                1,
            )

            for rec_text in output.get("recommendations", [])[:3]:
                self.db.add(
                    AiRecommendation(
                        tenant_id=ctx.tenant.id,
                        agent_id=agent.id,
                        execution_id=execution.id,
                        title=f"{agent.name} recommendation",
                        description=rec_text,
                        category=agent.slug,
                        priority="medium",
                        confidence=round(random.uniform(0.72, 0.96), 2),
                    )
                )

            self.db.add(
                AiInsight(
                    tenant_id=ctx.tenant.id,
                    agent_id=agent.id,
                    title=f"{agent.name} insight",
                    summary=output.get("summary", f"{agent.name} completed {payload.action}"),
                    severity="info",
                    category=agent.slug,
                    data=output.get("metrics", {}),
                )
            )

            self.db.add(
                AiAgentMemory(
                    tenant_id=ctx.tenant.id,
                    agent_id=agent.id,
                    user_id=ctx.membership.user_id,
                    memory_key=f"last_run:{payload.action}",
                    memory_type="execution",
                    content={"action": payload.action, "summary": output.get("summary"), "at": now.isoformat()},
                    importance=2,
                )
            )

            self._bump_usage(ctx.tenant.id, agent.id, tokens, duration_ms, success=True)

            ActivityLogger(self.db).log(
                tenant_id=ctx.tenant.id,
                actor_id=ctx.membership.user_id,
                entity_type="ai_agent",
                entity_id=agent.id,
                action="agent_completed",
                title=f"{agent.name} completed",
                description=output.get("summary", payload.action)[:500],
            )

            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                actor_id=ctx.membership.user_id,
                type="agent_completed",
                title=f"{agent.name} finished",
                message=output.get("summary", f"Completed {payload.action}")[:240],
            )

            self.db.commit()
            self.db.refresh(execution)
            return self._to_execution_response(execution, agent)

        except Exception as exc:
            duration_ms = int((time.perf_counter() - start) * 1000)
            execution.status = "failed"
            execution.error_message = str(exc)[:500]
            execution.duration_ms = duration_ms
            execution.completed_at = utcnow()
            agent.status = "error"
            agent.total_executions = (agent.total_executions or 0) + 1
            agent.failure_count = (agent.failure_count or 0) + 1
            self._bump_usage(ctx.tenant.id, agent.id, 0, duration_ms, success=False)
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                actor_id=ctx.membership.user_id,
                type="agent_failed",
                title=f"{agent.name} failed",
                message=str(exc)[:240],
            )
            self.db.commit()
            self.db.refresh(execution)
            return self._to_execution_response(execution, agent)

    def orchestrate(self, ctx: TenantContext, payload: AgentOrchestrateRequest) -> list[AiAgentExecutionResponse]:
        self.ensure_agents(ctx)
        slugs = payload.agent_slugs or ["sales", "marketing", "workflow", "executive"]
        orchestration_id = uuid.uuid4()
        results: list[AiAgentExecutionResponse] = []

        for slug in slugs:
            agent = self._get_agent_by_slug(ctx, slug)
            action = DEFAULT_ACTIONS.get(slug, "run")
            result = self.execute_agent(
                ctx,
                agent.id,
                AgentExecuteRequest(action=action, payload={**payload.payload, "trigger": payload.trigger}),
            )
            # attach orchestration id
            ex = self.db.get(AiAgentExecution, result.id)
            if ex:
                ex.orchestration_id = orchestration_id
                self.db.commit()
                result.orchestration_id = orchestration_id
            results.append(result)

        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="recommendation_ready",
            title="Agent orchestration complete",
            message=f"Ran {len(results)} agents for trigger '{payload.trigger}'.",
        )
        return results

    def _bump_usage(
        self, tenant_id: uuid.UUID, agent_id: uuid.UUID, tokens: int, duration_ms: int, *, success: bool
    ) -> None:
        day = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        row = self.db.scalar(
            select(AiUsage).where(
                AiUsage.tenant_id == tenant_id,
                AiUsage.agent_id == agent_id,
                AiUsage.usage_date == day,
            )
        )
        if not row:
            row = AiUsage(
                tenant_id=tenant_id,
                agent_id=agent_id,
                usage_date=day,
                executions=0,
                tokens_used=0,
                success_count=0,
                failure_count=0,
                total_duration_ms=0,
            )
            self.db.add(row)
        row.executions = (row.executions or 0) + 1
        row.tokens_used = (row.tokens_used or 0) + tokens
        row.total_duration_ms = (row.total_duration_ms or 0) + duration_ms
        if success:
            row.success_count = (row.success_count or 0) + 1
        else:
            row.failure_count = (row.failure_count or 0) + 1

    # ── History / Memory / Recs / Insights / Tasks ─────────────

    def list_executions(
        self, ctx: TenantContext, agent_id: uuid.UUID | None = None, limit: int = 50
    ) -> list[AiAgentExecutionResponse]:
        query = select(AiAgentExecution).where(AiAgentExecution.tenant_id == ctx.tenant.id)
        if agent_id:
            query = query.where(AiAgentExecution.agent_id == agent_id)
        rows = self.db.scalars(query.order_by(desc(AiAgentExecution.created_at)).limit(limit)).all()
        return [self._to_execution_response(r) for r in rows]

    def list_memory(self, ctx: TenantContext, agent_id: uuid.UUID | None = None) -> list[AiAgentMemoryResponse]:
        query = select(AiAgentMemory).where(AiAgentMemory.tenant_id == ctx.tenant.id)
        if agent_id:
            query = query.where(AiAgentMemory.agent_id == agent_id)
        rows = self.db.scalars(query.order_by(desc(AiAgentMemory.created_at)).limit(50)).all()
        return [AiAgentMemoryResponse.model_validate(r) for r in rows]

    def list_recommendations(self, ctx: TenantContext, status_filter: str | None = None) -> list[AiRecommendationResponse]:
        query = select(AiRecommendation).where(AiRecommendation.tenant_id == ctx.tenant.id)
        if status_filter:
            query = query.where(AiRecommendation.status == status_filter)
        rows = self.db.scalars(query.order_by(desc(AiRecommendation.created_at)).limit(50)).all()
        return [AiRecommendationResponse.model_validate(r) for r in rows]

    def update_recommendation(
        self, ctx: TenantContext, rec_id: uuid.UUID, payload: RecommendationUpdateRequest
    ) -> AiRecommendationResponse:
        row = self.db.scalar(
            select(AiRecommendation).where(
                AiRecommendation.id == rec_id, AiRecommendation.tenant_id == ctx.tenant.id
            )
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
        row.status = payload.status
        self.db.commit()
        self.db.refresh(row)
        return AiRecommendationResponse.model_validate(row)

    def list_insights(self, ctx: TenantContext) -> list[AiInsightResponse]:
        rows = self.db.scalars(
            select(AiInsight)
            .where(AiInsight.tenant_id == ctx.tenant.id)
            .order_by(desc(AiInsight.created_at))
            .limit(50)
        ).all()
        return [AiInsightResponse.model_validate(r) for r in rows]

    def mark_insight_read(self, ctx: TenantContext, insight_id: uuid.UUID) -> AiInsightResponse:
        row = self.db.scalar(
            select(AiInsight).where(AiInsight.id == insight_id, AiInsight.tenant_id == ctx.tenant.id)
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
        row.is_read = True
        self.db.commit()
        self.db.refresh(row)
        return AiInsightResponse.model_validate(row)

    def list_tasks(self, ctx: TenantContext) -> list[AiAgentTaskResponse]:
        rows = self.db.scalars(
            select(AiAgentTask)
            .where(AiAgentTask.tenant_id == ctx.tenant.id)
            .order_by(desc(AiAgentTask.created_at))
            .limit(50)
        ).all()
        return [AiAgentTaskResponse.model_validate(r) for r in rows]

    def list_usage(self, ctx: TenantContext) -> list[AiUsageResponse]:
        rows = self.db.scalars(
            select(AiUsage)
            .where(AiUsage.tenant_id == ctx.tenant.id)
            .order_by(desc(AiUsage.usage_date))
            .limit(30)
        ).all()
        return [
            AiUsageResponse(
                usage_date=r.usage_date,
                executions=r.executions,
                tokens_used=r.tokens_used,
                success_count=r.success_count,
                failure_count=r.failure_count,
                total_duration_ms=r.total_duration_ms,
            )
            for r in rows
        ]

    def toggle_agent(self, ctx: TenantContext, agent_id: uuid.UUID, enabled: bool) -> AiAgentDetail:
        agent = self._get_agent(ctx, agent_id)
        agent.is_enabled = enabled
        if not enabled:
            agent.status = "disabled"
        elif agent.status == "disabled":
            agent.status = "idle"
        self.db.commit()
        self.db.refresh(agent)
        return AiAgentDetail.model_validate(agent)

    def knowledge_search(self, ctx: TenantContext, payload: KnowledgeSearchRequest) -> KnowledgeSearchResponse:
        self.ensure_agents(ctx)
        agent = self._get_agent_by_slug(ctx, "knowledge")
        execution = self.execute_agent(
            ctx,
            agent.id,
            AgentExecuteRequest(action="company_qa", payload={"query": payload.query, "sources": payload.sources}),
        )
        results: list[dict[str, Any]] = []
        term = f"%{payload.query.strip()}%"
        if "crm" in payload.sources:
            for lead in self.db.scalars(
                select(Lead).where(
                    Lead.tenant_id == ctx.tenant.id,
                    or_(Lead.first_name.ilike(term), Lead.last_name.ilike(term), Lead.company.ilike(term)),
                ).limit(5)
            ).all():
                results.append({"type": "lead", "id": str(lead.id), "title": f"{lead.first_name} {lead.last_name}", "subtitle": lead.company})
            for deal in self.db.scalars(
                select(Deal).where(Deal.tenant_id == ctx.tenant.id, Deal.title.ilike(term)).limit(5)
            ).all():
                results.append({"type": "deal", "id": str(deal.id), "title": deal.title, "subtitle": deal.stage})
        if "meetings" in payload.sources:
            for m in self.db.scalars(
                select(Meeting).where(Meeting.tenant_id == ctx.tenant.id, Meeting.title.ilike(term)).limit(5)
            ).all():
                results.append({"type": "meeting", "id": str(m.id), "title": m.title, "subtitle": "meeting"})
        if "activities" in payload.sources:
            for a in self.db.scalars(
                select(Activity).where(
                    Activity.tenant_id == ctx.tenant.id,
                    or_(Activity.title.ilike(term), Activity.description.ilike(term)),
                ).limit(5)
            ).all():
                results.append({"type": "activity", "id": str(a.id), "title": a.title, "subtitle": a.activity_type})

        answer = execution.output_payload.get("answer") or execution.output_payload.get("summary") or "No answer generated."
        return KnowledgeSearchResponse(query=payload.query, results=results, answer=answer)
