import uuid
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.mixins import utcnow
from app.models import Company, Contact, Deal, Lead, TenantMembership
from app.models.deal import (
    DEAL_STAGE_LABELS,
    DEAL_STAGES,
    OPEN_DEAL_STAGES,
    STAGE_DEFAULT_PROBABILITY,
)
from app.schemas.deal import DealCreate, DealMove, DealUpdate, default_probability_for_stage
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_deal_event, notify_user


class DealPipelineFilters:
    def __init__(
        self,
        *,
        q: str | None = None,
        owner_id: uuid.UUID | None = None,
        company_id: uuid.UUID | None = None,
        stage: str | None = None,
        close_date_from: date | None = None,
        close_date_to: date | None = None,
        value_min: Decimal | None = None,
        value_max: Decimal | None = None,
    ):
        self.q = q
        self.owner_id = owner_id
        self.company_id = company_id
        self.stage = stage
        self.close_date_from = close_date_from
        self.close_date_to = close_date_to
        self.value_min = value_min
        self.value_max = value_max


class DealService:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self, tenant_id: uuid.UUID):
        return (
            select(Deal)
            .options(
                joinedload(Deal.assigned_to),
                joinedload(Deal.company),
                joinedload(Deal.contact),
            )
            .where(Deal.tenant_id == tenant_id)
        )

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

    def _validate_lead(self, tenant_id: uuid.UUID, lead_id: uuid.UUID | None) -> None:
        if lead_id is None:
            return
        lead = self.db.scalar(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == tenant_id))
        if lead is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lead not found in this organization")

    def _validate_company(self, tenant_id: uuid.UUID, company_id: uuid.UUID | None) -> None:
        if company_id is None:
            return
        company = self.db.scalar(
            select(Company).where(Company.id == company_id, Company.tenant_id == tenant_id)
        )
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company not found in this organization",
            )

    def _validate_contact(self, tenant_id: uuid.UUID, contact_id: uuid.UUID | None) -> None:
        if contact_id is None:
            return
        contact = self.db.scalar(
            select(Contact).where(Contact.id == contact_id, Contact.tenant_id == tenant_id)
        )
        if contact is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contact not found in this organization",
            )

    def _next_position(self, tenant_id: uuid.UUID, stage: str) -> int:
        max_pos = self.db.scalar(
            select(func.coalesce(func.max(Deal.position), -1)).where(
                Deal.tenant_id == tenant_id, Deal.stage == stage
            )
        )
        return (max_pos or -1) + 1

    def _apply_stage_side_effects(self, deal: Deal, old_stage: str, new_stage: str) -> None:
        terminal = {"won", "lost"}
        if new_stage in terminal and old_stage not in terminal:
            deal.closed_at = utcnow()
        elif new_stage not in terminal and old_stage in terminal:
            deal.closed_at = None
        if new_stage in STAGE_DEFAULT_PROBABILITY:
            deal.probability = STAGE_DEFAULT_PROBABILITY[new_stage]

    def _apply_filters(self, query, filters: DealPipelineFilters | None):
        if filters is None:
            return query
        if filters.q:
            term = f"%{filters.q.strip()}%"
            query = query.where(
                or_(Deal.title.ilike(term), Deal.description.ilike(term))
            )
        if filters.owner_id:
            query = query.where(Deal.assigned_to_id == filters.owner_id)
        if filters.company_id:
            query = query.where(Deal.company_id == filters.company_id)
        if filters.stage:
            query = query.where(Deal.stage == filters.stage)
        if filters.close_date_from:
            query = query.where(Deal.expected_close_date >= filters.close_date_from)
        if filters.close_date_to:
            query = query.where(Deal.expected_close_date <= filters.close_date_to)
        if filters.value_min is not None:
            query = query.where(Deal.value >= filters.value_min)
        if filters.value_max is not None:
            query = query.where(Deal.value <= filters.value_max)
        return query

    def _log_deal(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        action: str,
        title: str,
        description: str,
        actor_id: uuid.UUID | None,
        metadata: dict | None = None,
    ) -> None:
        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=actor_id,
            entity_type="deal",
            entity_id=deal_id,
            action=action,
            title=title,
            description=description,
            metadata=metadata,
        )

    def _notify_deal(
        self,
        tenant_id: uuid.UUID,
        deal: Deal,
        action: str,
        title: str,
        message: str,
        actor_id: uuid.UUID | None,
    ) -> None:
        notify_deal_event(
            self.db,
            tenant_id=tenant_id,
            deal=deal,
            action=action,
            title=title,
            message=message,
            actor_id=actor_id,
        )

    def _group_deals_by_stage(self, deals: list[Deal]) -> list[dict]:
        by_stage: dict[str, list[Deal]] = {stage: [] for stage in DEAL_STAGES}
        for deal in deals:
            if deal.stage in by_stage:
                by_stage[deal.stage].append(deal)
        return [
            {
                "slug": stage,
                "label": DEAL_STAGE_LABELS[stage],
                "deals": by_stage[stage],
            }
            for stage in DEAL_STAGES
        ]

    def get_board(self, tenant_id: uuid.UUID) -> tuple[list[dict], int]:
        return self.get_pipeline(tenant_id, None)

    def get_pipeline(
        self, tenant_id: uuid.UUID, filters: DealPipelineFilters | None
    ) -> tuple[list[dict], int]:
        query = self._base_query(tenant_id)
        query = self._apply_filters(query, filters)
        deals = list(
            self.db.scalars(
                query.order_by(Deal.stage, Deal.position, Deal.created_at)
            ).all()
        )
        return self._group_deals_by_stage(deals), len(deals)

    def get_statistics(self, tenant_id: uuid.UUID) -> dict:
        today = date.today()
        month_start = today.replace(day=1)

        pipeline_value = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage.in_(OPEN_DEAL_STAGES),
            )
        ) or Decimal("0")

        won_revenue = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "won",
            )
        ) or Decimal("0")

        lost_revenue = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "lost",
            )
        ) or Decimal("0")

        open_deals = list(
            self.db.scalars(
                select(Deal).where(
                    Deal.tenant_id == tenant_id,
                    Deal.stage.in_(OPEN_DEAL_STAGES),
                )
            ).all()
        )
        forecast_revenue = Decimal("0")
        for deal in open_deals:
            if deal.value:
                forecast_revenue += deal.value * Decimal(deal.probability) / Decimal("100")

        deals_this_month = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.created_at >= func.date_trunc("month", func.now()),
            )
        ) or 0

        won_count = self.db.scalar(
            select(func.count()).select_from(Deal).where(
                Deal.tenant_id == tenant_id, Deal.stage == "won"
            )
        ) or 0

        lost_count = self.db.scalar(
            select(func.count()).select_from(Deal).where(
                Deal.tenant_id == tenant_id, Deal.stage == "lost"
            )
        ) or 0

        closed_total = won_count + lost_count
        conversion_rate = (won_count / closed_total * 100) if closed_total > 0 else 0.0

        avg_deal_size = self.db.scalar(
            select(func.coalesce(func.avg(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.value.isnot(None),
            )
        ) or Decimal("0")

        open_count = self.db.scalar(
            select(func.count()).select_from(Deal).where(
                Deal.tenant_id == tenant_id,
                Deal.stage.in_(OPEN_DEAL_STAGES),
            )
        ) or 0

        stage_breakdown = []
        for stage in DEAL_STAGES:
            count = self.db.scalar(
                select(func.count()).select_from(Deal).where(
                    Deal.tenant_id == tenant_id, Deal.stage == stage
                )
            ) or 0
            value = self.db.scalar(
                select(func.coalesce(func.sum(Deal.value), 0)).where(
                    Deal.tenant_id == tenant_id, Deal.stage == stage
                )
            ) or Decimal("0")
            stage_breakdown.append(
                {
                    "stage": stage,
                    "label": DEAL_STAGE_LABELS[stage],
                    "count": count,
                    "value": float(value),
                }
            )

        return {
            "pipeline_value": pipeline_value,
            "won_revenue": won_revenue,
            "lost_revenue": lost_revenue,
            "forecast_revenue": forecast_revenue,
            "deals_this_month": deals_this_month,
            "conversion_rate": round(conversion_rate, 2),
            "average_deal_size": avg_deal_size,
            "open_deal_count": open_count,
            "won_deal_count": won_count,
            "lost_deal_count": lost_count,
            "stage_breakdown": stage_breakdown,
        }

    def get_deal(self, tenant_id: uuid.UUID, deal_id: uuid.UUID) -> Deal:
        deal = self.db.scalar(self._base_query(tenant_id).where(Deal.id == deal_id))
        if deal is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
        return deal

    def create_deal(
        self,
        tenant_id: uuid.UUID,
        payload: DealCreate,
        created_by_id: uuid.UUID,
    ) -> Deal:
        self._validate_assignee(tenant_id, payload.assigned_to_id)
        self._validate_lead(tenant_id, payload.lead_id)
        self._validate_company(tenant_id, payload.company_id)
        self._validate_contact(tenant_id, payload.contact_id)

        probability = (
            payload.probability
            if payload.probability is not None
            else default_probability_for_stage(payload.stage)
        )

        deal = Deal(
            tenant_id=tenant_id,
            title=payload.title,
            description=payload.description,
            stage=payload.stage,
            position=self._next_position(tenant_id, payload.stage),
            value=payload.value,
            currency=payload.currency,
            probability=probability,
            expected_close_date=payload.expected_close_date,
            lead_id=payload.lead_id,
            company_id=payload.company_id,
            contact_id=payload.contact_id,
            assigned_to_id=payload.assigned_to_id,
            created_by_id=created_by_id,
        )
        if deal.stage in ("won", "lost"):
            deal.closed_at = utcnow()
        self.db.add(deal)
        self.db.flush()

        self._log_deal(
            tenant_id,
            deal.id,
            "deal_created",
            "Deal created",
            f'Deal "{deal.title}" was created in {DEAL_STAGE_LABELS[deal.stage]}',
            created_by_id,
            {"stage": deal.stage},
        )
        self._notify_deal(
            tenant_id,
            deal,
            "deal_created",
            "New deal created",
            f'Deal "{deal.title}" was created',
            created_by_id,
        )
        self.db.commit()
        return self.get_deal(tenant_id, deal.id)

    def update_deal(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        payload: DealUpdate,
        updated_by_id: uuid.UUID | None = None,
    ) -> Deal:
        deal = self.get_deal(tenant_id, deal_id)
        data = payload.model_dump(exclude_unset=True)

        if "assigned_to_id" in data:
            self._validate_assignee(tenant_id, data["assigned_to_id"])
        if "lead_id" in data:
            self._validate_lead(tenant_id, data["lead_id"])
        if "company_id" in data:
            self._validate_company(tenant_id, data["company_id"])
        if "contact_id" in data:
            self._validate_contact(tenant_id, data["contact_id"])

        old_stage = deal.stage
        for field, value in data.items():
            setattr(deal, field, value)

        if "stage" in data and data["stage"] != old_stage:
            deal.position = self._next_position(tenant_id, deal.stage)
            self._apply_stage_side_effects(deal, old_stage, deal.stage)
            action = (
                "deal_won" if deal.stage == "won"
                else "deal_lost" if deal.stage == "lost"
                else "deal_stage_changed"
            )
            self._log_deal(
                tenant_id,
                deal.id,
                action,
                DEAL_STAGE_LABELS.get(deal.stage, "Stage changed"),
                f'Deal moved from {DEAL_STAGE_LABELS[old_stage]} to {DEAL_STAGE_LABELS[deal.stage]}',
                updated_by_id,
                {"from_stage": old_stage, "to_stage": deal.stage},
            )
            self._notify_deal(
                tenant_id,
                deal,
                action,
                DEAL_STAGE_LABELS.get(deal.stage, "Deal stage changed"),
                f'"{deal.title}" moved to {DEAL_STAGE_LABELS[deal.stage]}',
                updated_by_id,
            )
        else:
            self._log_deal(
                tenant_id,
                deal.id,
                "deal_updated",
                "Deal updated",
                f'Deal "{deal.title}" was updated',
                updated_by_id,
            )

        self.db.commit()
        return self.get_deal(tenant_id, deal_id)

    def update_stage(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        stage: str,
        updated_by_id: uuid.UUID | None = None,
    ) -> Deal:
        deal = self.get_deal(tenant_id, deal_id)
        if deal.stage == stage:
            return deal
        position = self._next_position(tenant_id, stage)
        return self.move_deal(
            tenant_id,
            deal_id,
            DealMove(stage=stage, position=position),
            updated_by_id=updated_by_id,
        )

    def update_position(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        position: int,
        updated_by_id: uuid.UUID | None = None,
    ) -> Deal:
        deal = self.get_deal(tenant_id, deal_id)
        return self.move_deal(
            tenant_id,
            deal_id,
            DealMove(stage=deal.stage, position=position),
            updated_by_id=updated_by_id,
        )

    def move_deal(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        payload: DealMove,
        updated_by_id: uuid.UUID | None = None,
    ) -> Deal:
        deal = self.get_deal(tenant_id, deal_id)
        source_stage = deal.stage
        target_stage = payload.stage
        target_position = payload.position

        if source_stage == target_stage:
            stage_deals = list(
                self.db.scalars(
                    select(Deal)
                    .where(Deal.tenant_id == tenant_id, Deal.stage == target_stage)
                    .order_by(Deal.position)
                ).all()
            )
            stage_deals = [d for d in stage_deals if d.id != deal_id]
            stage_deals.insert(min(target_position, len(stage_deals)), deal)
            for index, item in enumerate(stage_deals):
                item.position = index
        else:
            source_deals = list(
                self.db.scalars(
                    select(Deal)
                    .where(
                        Deal.tenant_id == tenant_id,
                        Deal.stage == source_stage,
                        Deal.id != deal_id,
                    )
                    .order_by(Deal.position)
                ).all()
            )
            for index, item in enumerate(source_deals):
                item.position = index

            target_deals = list(
                self.db.scalars(
                    select(Deal)
                    .where(Deal.tenant_id == tenant_id, Deal.stage == target_stage)
                    .order_by(Deal.position)
                ).all()
            )
            deal.stage = target_stage
            self._apply_stage_side_effects(deal, source_stage, target_stage)
            target_deals.insert(min(target_position, len(target_deals)), deal)
            for index, item in enumerate(target_deals):
                item.position = index

            if target_stage == "won":
                action = "deal_won"
                title = "Deal won"
            elif target_stage == "lost":
                action = "deal_lost"
                title = "Deal lost"
            else:
                action = "deal_stage_changed"
                title = "Deal stage changed"
            self._log_deal(
                tenant_id,
                deal.id,
                action,
                title,
                f'Deal moved from {DEAL_STAGE_LABELS[source_stage]} to {DEAL_STAGE_LABELS[target_stage]}',
                updated_by_id,
                {"from_stage": source_stage, "to_stage": target_stage},
            )
            self._notify_deal(
                tenant_id,
                deal,
                action,
                title,
                f'"{deal.title}" moved to {DEAL_STAGE_LABELS[target_stage]}',
                updated_by_id,
            )

        self.db.commit()
        return self.get_deal(tenant_id, deal_id)

    def duplicate_deal(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        created_by_id: uuid.UUID,
    ) -> Deal:
        source = self.get_deal(tenant_id, deal_id)
        duplicate = Deal(
            tenant_id=tenant_id,
            title=f"{source.title} (copy)",
            description=source.description,
            stage=source.stage,
            position=self._next_position(tenant_id, source.stage),
            value=source.value,
            currency=source.currency,
            probability=source.probability,
            expected_close_date=source.expected_close_date,
            lead_id=source.lead_id,
            company_id=source.company_id,
            contact_id=source.contact_id,
            assigned_to_id=source.assigned_to_id,
            created_by_id=created_by_id,
        )
        self.db.add(duplicate)
        self.db.flush()
        self._log_deal(
            tenant_id,
            duplicate.id,
            "deal_created",
            "Deal duplicated",
            f'Deal duplicated from "{source.title}"',
            created_by_id,
            {"source_deal_id": str(source.id)},
        )
        self.db.commit()
        return self.get_deal(tenant_id, duplicate.id)

    def delete_deal(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        deleted_by_id: uuid.UUID | None = None,
    ) -> None:
        deal = self.get_deal(tenant_id, deal_id)
        stage = deal.stage
        title = deal.title
        self._log_deal(
            tenant_id,
            deal.id,
            "deal_deleted",
            "Deal deleted",
            f'Deal "{title}" was deleted',
            deleted_by_id,
        )
        self.db.delete(deal)
        self.db.flush()

        remaining = list(
            self.db.scalars(
                select(Deal)
                .where(Deal.tenant_id == tenant_id, Deal.stage == stage)
                .order_by(Deal.position)
            ).all()
        )
        for index, item in enumerate(remaining):
            item.position = index

        self.db.commit()
