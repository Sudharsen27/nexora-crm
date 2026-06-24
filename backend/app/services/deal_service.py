import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.db.mixins import utcnow
from app.models import Company, Deal, Lead, TenantMembership
from app.models.deal import DEAL_STAGE_LABELS, DEAL_STAGES
from app.schemas.deal import DealCreate, DealMove, DealUpdate


class DealService:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self, tenant_id: uuid.UUID):
        return (
            select(Deal)
            .options(joinedload(Deal.assigned_to))
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

    def get_board(self, tenant_id: uuid.UUID) -> tuple[list[dict], int]:
        deals = list(
            self.db.scalars(
                self._base_query(tenant_id).order_by(Deal.stage, Deal.position, Deal.created_at)
            ).all()
        )
        by_stage: dict[str, list[Deal]] = {stage: [] for stage in DEAL_STAGES}
        for deal in deals:
            by_stage[deal.stage].append(deal)

        columns = [
            {
                "slug": stage,
                "label": DEAL_STAGE_LABELS[stage],
                "deals": by_stage[stage],
            }
            for stage in DEAL_STAGES
        ]
        return columns, len(deals)

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

        deal = Deal(
            tenant_id=tenant_id,
            title=payload.title,
            description=payload.description,
            stage=payload.stage,
            position=self._next_position(tenant_id, payload.stage),
            value=payload.value,
            currency=payload.currency,
            expected_close_date=payload.expected_close_date,
            lead_id=payload.lead_id,
            company_id=payload.company_id,
            assigned_to_id=payload.assigned_to_id,
            created_by_id=created_by_id,
        )
        if deal.stage in ("won", "lost"):
            deal.closed_at = utcnow()
        self.db.add(deal)
        self.db.commit()
        return self.get_deal(tenant_id, deal.id)

    def update_deal(
        self,
        tenant_id: uuid.UUID,
        deal_id: uuid.UUID,
        payload: DealUpdate,
    ) -> Deal:
        deal = self.get_deal(tenant_id, deal_id)
        data = payload.model_dump(exclude_unset=True)

        if "assigned_to_id" in data:
            self._validate_assignee(tenant_id, data["assigned_to_id"])
        if "lead_id" in data:
            self._validate_lead(tenant_id, data["lead_id"])
        if "company_id" in data:
            self._validate_company(tenant_id, data["company_id"])

        old_stage = deal.stage
        for field, value in data.items():
            setattr(deal, field, value)

        if "stage" in data and data["stage"] != old_stage:
            deal.position = self._next_position(tenant_id, deal.stage)
            self._apply_stage_side_effects(deal, old_stage, deal.stage)

        self.db.commit()
        return self.get_deal(tenant_id, deal_id)

    def move_deal(self, tenant_id: uuid.UUID, deal_id: uuid.UUID, payload: DealMove) -> Deal:
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

        self.db.commit()
        return self.get_deal(tenant_id, deal_id)

    def delete_deal(self, tenant_id: uuid.UUID, deal_id: uuid.UUID) -> None:
        deal = self.get_deal(tenant_id, deal_id)
        stage = deal.stage
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
