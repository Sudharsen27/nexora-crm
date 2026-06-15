import math
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Lead, TenantMembership, User
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadService:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self, tenant_id: uuid.UUID):
        return (
            select(Lead)
            .options(joinedload(Lead.assigned_to))
            .where(Lead.tenant_id == tenant_id)
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

    def list_leads(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        status_filter: str | None = None,
        source: str | None = None,
        assigned_to_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Lead], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)

        query = self._base_query(tenant_id)

        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                or_(
                    Lead.first_name.ilike(term),
                    Lead.last_name.ilike(term),
                    Lead.email.ilike(term),
                    Lead.company.ilike(term),
                    Lead.phone.ilike(term),
                )
            )

        if status_filter:
            query = query.where(Lead.status == status_filter)

        if source:
            query = query.where(Lead.source == source)

        if assigned_to_id:
            query = query.where(Lead.assigned_to_id == assigned_to_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_query) or 0

        leads = list(
            self.db.scalars(
                query.order_by(Lead.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return leads, total

    def get_lead(self, tenant_id: uuid.UUID, lead_id: uuid.UUID) -> Lead:
        lead = self.db.scalar(
            self._base_query(tenant_id).where(Lead.id == lead_id)
        )
        if lead is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
        return lead

    def create_lead(
        self,
        tenant_id: uuid.UUID,
        payload: LeadCreate,
        created_by_id: uuid.UUID,
    ) -> Lead:
        self._validate_assignee(tenant_id, payload.assigned_to_id)

        lead = Lead(
            tenant_id=tenant_id,
            first_name=payload.first_name,
            last_name=payload.last_name or "",
            email=payload.email,
            phone=payload.phone,
            company=payload.company,
            job_title=payload.job_title,
            status=payload.status,
            source=payload.source,
            estimated_value=payload.estimated_value,
            notes=payload.notes,
            assigned_to_id=payload.assigned_to_id,
            created_by_id=created_by_id,
        )
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        return self.get_lead(tenant_id, lead.id)

    def update_lead(
        self,
        tenant_id: uuid.UUID,
        lead_id: uuid.UUID,
        payload: LeadUpdate,
    ) -> Lead:
        lead = self.get_lead(tenant_id, lead_id)
        data = payload.model_dump(exclude_unset=True)

        if "assigned_to_id" in data:
            self._validate_assignee(tenant_id, data["assigned_to_id"])

        if "first_name" in data or "last_name" in data:
            first = data.get("first_name", lead.first_name)
            last = data.get("last_name", lead.last_name)
            if not first and not last:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="First name or last name is required",
                )

        for field, value in data.items():
            setattr(lead, field, value)

        self.db.commit()
        return self.get_lead(tenant_id, lead_id)

    def delete_lead(self, tenant_id: uuid.UUID, lead_id: uuid.UUID) -> None:
        lead = self.get_lead(tenant_id, lead_id)
        self.db.delete(lead)
        self.db.commit()


def paginate(total: int, page: int, page_size: int) -> dict:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {"total": total, "page": page, "page_size": page_size, "pages": pages}
