import math
import uuid

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Activity, Company, Contact, Deal, Task, TenantMembership
from app.models.company import COMPANY_SORT_FIELDS
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_all_members_except, notify_user


class CompanyService:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self, tenant_id: uuid.UUID):
        return (
            select(Company)
            .options(
                joinedload(Company.owner),
            )
            .where(Company.tenant_id == tenant_id)
        )

    def _validate_owner(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
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
                detail="Owner must be an active member of this organization",
            )

    def _validate_company_code(
        self,
        tenant_id: uuid.UUID,
        company_code: str | None,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        if not company_code:
            return
        query = select(Company.id).where(
            Company.tenant_id == tenant_id,
            Company.company_code == company_code,
        )
        if exclude_id:
            query = query.where(Company.id != exclude_id)
        existing = self.db.scalar(query)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A company with this code already exists",
            )

    def list_companies(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        industry: str | None = None,
        owner_id: uuid.UUID | None = None,
        city: str | None = None,
        country: str | None = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Company], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        sort_field = sort_by if sort_by in COMPANY_SORT_FIELDS else "created_at"
        order_fn = desc if sort_order.lower() == "desc" else asc

        query = self._base_query(tenant_id)

        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                or_(
                    Company.company_name.ilike(term),
                    Company.company_code.ilike(term),
                    Company.email.ilike(term),
                    Company.phone.ilike(term),
                    Company.city.ilike(term),
                    Company.country.ilike(term),
                    Company.website.ilike(term),
                )
            )

        if industry:
            query = query.where(Company.industry == industry.strip().lower())

        if owner_id:
            query = query.where(Company.owner_id == owner_id)

        if city:
            query = query.where(Company.city.ilike(f"%{city.strip()}%"))

        if country:
            query = query.where(Company.country.ilike(f"%{country.strip()}%"))

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_query) or 0

        sort_column = getattr(Company, sort_field)
        companies = list(
            self.db.scalars(
                query.order_by(order_fn(sort_column))
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return companies, total

    def get_company(self, tenant_id: uuid.UUID, company_id: uuid.UUID) -> Company:
        company = self.db.scalar(
            self._base_query(tenant_id).where(Company.id == company_id)
        )
        if company is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        return company

    def create_company(
        self,
        tenant_id: uuid.UUID,
        payload: CompanyCreate,
        created_by_id: uuid.UUID,
    ) -> Company:
        self._validate_owner(tenant_id, payload.owner_id)
        self._validate_company_code(tenant_id, payload.company_code)

        company = Company(
            tenant_id=tenant_id,
            company_name=payload.company_name,
            company_code=payload.company_code,
            industry=payload.industry,
            website=payload.website,
            email=payload.email,
            phone=payload.phone,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            country=payload.country,
            postal_code=payload.postal_code,
            annual_revenue=payload.annual_revenue,
            employee_count=payload.employee_count,
            owner_id=payload.owner_id,
            description=payload.description,
            created_by_id=created_by_id,
        )
        self.db.add(company)
        self.db.flush()
        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=created_by_id,
            entity_type="company",
            entity_id=company.id,
            action="company_created",
            title="Company created",
            description=f'Company "{company.company_name}" was created',
        )
        notify_all_members_except(
            self.db,
            tenant_id=tenant_id,
            actor_id=created_by_id,
            type="company_created",
            title="New company added",
            message=f'Company "{company.company_name}" was created',
            entity_type="company",
            entity_id=company.id,
        )
        self.db.commit()
        return self.get_company(tenant_id, company.id)

    def update_company(
        self,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        payload: CompanyUpdate,
        updated_by_id: uuid.UUID | None = None,
    ) -> Company:
        company = self.get_company(tenant_id, company_id)
        data = payload.model_dump(exclude_unset=True)

        if "owner_id" in data:
            self._validate_owner(tenant_id, data["owner_id"])

        if "company_code" in data:
            self._validate_company_code(tenant_id, data["company_code"], exclude_id=company_id)

        for field, value in data.items():
            setattr(company, field, value)

        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=updated_by_id,
            entity_type="company",
            entity_id=company.id,
            action="company_updated",
            title="Company updated",
            description=f'Company "{company.company_name}" was updated',
        )

        self.db.commit()
        return self.get_company(tenant_id, company_id)

    def delete_company(
        self, tenant_id: uuid.UUID, company_id: uuid.UUID, deleted_by_id: uuid.UUID | None = None
    ) -> None:
        company = self.get_company(tenant_id, company_id)

        contact_count = self.db.scalar(
            select(func.count()).where(Contact.company_id == company_id, Contact.tenant_id == tenant_id)
        ) or 0
        deal_count = self.db.scalar(
            select(func.count()).where(Deal.company_id == company_id, Deal.tenant_id == tenant_id)
        ) or 0
        activity_count = self.db.scalar(
            select(func.count()).where(
                Activity.tenant_id == tenant_id,
                Activity.entity_type == "company",
                Activity.entity_id == company_id,
            )
        ) or 0
        task_count = self.db.scalar(
            select(func.count()).where(
                Task.tenant_id == tenant_id,
                Task.entity_type == "company",
                Task.entity_id == company_id,
            )
        ) or 0

        if contact_count or deal_count or activity_count or task_count:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Cannot delete company with linked contacts, deals, activities, or tasks. "
                    "Remove or reassign them first."
                ),
            )

        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=deleted_by_id,
            entity_type="company",
            entity_id=company.id,
            action="company_deleted",
            title="Company deleted",
            description=f'Company "{company.company_name}" was deleted',
        )
        self.db.delete(company)
        self.db.commit()

    def list_company_deals(self, tenant_id: uuid.UUID, company_id: uuid.UUID) -> list[Deal]:
        self.get_company(tenant_id, company_id)
        return list(
            self.db.scalars(
                select(Deal)
                .options(joinedload(Deal.assigned_to))
                .where(Deal.tenant_id == tenant_id, Deal.company_id == company_id)
                .order_by(desc(Deal.created_at))
            ).all()
        )


def paginate(total: int, page: int, page_size: int) -> dict:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {"total": total, "page": page, "page_size": page_size, "pages": pages}
