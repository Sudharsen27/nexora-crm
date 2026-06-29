import math
import uuid

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Contact, Company, Lead, TenantMembership
from app.models.contact import CONTACT_SORT_FIELDS
from app.schemas.contact import ContactCreate, ContactUpdate


class ContactService:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self, tenant_id: uuid.UUID):
        return (
            select(Contact)
            .options(
                joinedload(Contact.assigned_to),
                joinedload(Contact.lead),
                joinedload(Contact.linked_company),
            )
            .where(Contact.tenant_id == tenant_id)
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

    def _validate_lead(self, tenant_id: uuid.UUID, lead_id: uuid.UUID | None) -> Lead | None:
        if lead_id is None:
            return None
        lead = self.db.scalar(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == tenant_id))
        if lead is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lead not found in this organization")
        existing = self.db.scalar(
            select(Contact).where(Contact.tenant_id == tenant_id, Contact.lead_id == lead_id)
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A contact already exists for this lead",
            )
        return lead

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

    def list_contacts(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        company: str | None = None,
        company_id: uuid.UUID | None = None,
        assigned_to_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Contact], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        sort_field = sort_by if sort_by in CONTACT_SORT_FIELDS else "created_at"
        order_fn = desc if sort_order.lower() == "desc" else asc

        query = self._base_query(tenant_id)

        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                or_(
                    Contact.first_name.ilike(term),
                    Contact.last_name.ilike(term),
                    Contact.email.ilike(term),
                    Contact.company.ilike(term),
                    Contact.phone.ilike(term),
                )
            )

        if company:
            query = query.where(Contact.company.ilike(f"%{company.strip()}%"))

        if company_id:
            query = query.where(Contact.company_id == company_id)

        if assigned_to_id:
            query = query.where(Contact.assigned_to_id == assigned_to_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_query) or 0

        sort_column = getattr(Contact, sort_field)
        contacts = list(
            self.db.scalars(
                query.order_by(order_fn(sort_column))
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return contacts, total

    def get_contact(self, tenant_id: uuid.UUID, contact_id: uuid.UUID) -> Contact:
        contact = self.db.scalar(
            self._base_query(tenant_id).where(Contact.id == contact_id)
        )
        if contact is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        return contact

    def create_contact(
        self,
        tenant_id: uuid.UUID,
        payload: ContactCreate,
        created_by_id: uuid.UUID,
    ) -> Contact:
        self._validate_assignee(tenant_id, payload.assigned_to_id)
        self._validate_lead(tenant_id, payload.lead_id)
        self._validate_company(tenant_id, payload.company_id)

        contact = Contact(
            tenant_id=tenant_id,
            lead_id=payload.lead_id,
            company_id=payload.company_id,
            first_name=payload.first_name,
            last_name=payload.last_name or "",
            email=payload.email,
            phone=payload.phone,
            company=payload.company,
            job_title=payload.job_title,
            notes=payload.notes,
            assigned_to_id=payload.assigned_to_id,
            created_by_id=created_by_id,
        )
        self.db.add(contact)
        self.db.commit()
        return self.get_contact(tenant_id, contact.id)

    def update_contact(
        self,
        tenant_id: uuid.UUID,
        contact_id: uuid.UUID,
        payload: ContactUpdate,
    ) -> Contact:
        contact = self.get_contact(tenant_id, contact_id)

        if payload.lead_id != contact.lead_id:
            if payload.lead_id is not None:
                self._validate_lead(tenant_id, payload.lead_id)

        self._validate_company(tenant_id, payload.company_id)
        self._validate_assignee(tenant_id, payload.assigned_to_id)

        contact.first_name = payload.first_name
        contact.last_name = payload.last_name or ""
        contact.email = payload.email
        contact.phone = payload.phone
        contact.company = payload.company
        contact.job_title = payload.job_title
        contact.notes = payload.notes
        contact.lead_id = payload.lead_id
        contact.company_id = payload.company_id
        contact.assigned_to_id = payload.assigned_to_id

        self.db.commit()
        return self.get_contact(tenant_id, contact_id)

    def delete_contact(self, tenant_id: uuid.UUID, contact_id: uuid.UUID) -> None:
        contact = self.get_contact(tenant_id, contact_id)
        self.db.delete(contact)
        self.db.commit()

    def convert_lead(
        self,
        tenant_id: uuid.UUID,
        lead_id: uuid.UUID,
        created_by_id: uuid.UUID,
    ) -> Contact:
        lead = self.db.scalar(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == tenant_id))
        if lead is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

        if lead.status == "converted":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lead has already been converted",
            )

        existing = self.db.scalar(
            select(Contact).where(Contact.tenant_id == tenant_id, Contact.lead_id == lead_id)
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A contact already exists for this lead",
            )

        contact = Contact(
            tenant_id=tenant_id,
            lead_id=lead.id,
            first_name=lead.first_name,
            last_name=lead.last_name or "",
            email=lead.email,
            phone=lead.phone,
            company=lead.company,
            job_title=lead.job_title,
            notes=lead.notes,
            assigned_to_id=lead.assigned_to_id,
            created_by_id=created_by_id,
        )
        lead.status = "converted"

        self.db.add(contact)
        self.db.commit()
        return self.get_contact(tenant_id, contact.id)


def paginate(total: int, page: int, page_size: int) -> dict:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {"total": total, "page": page, "page_size": page_size, "pages": pages}
