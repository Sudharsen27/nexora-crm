"""Scope helpers for portal data access."""

from __future__ import annotations

from sqlalchemy import or_

from app.core.portal_deps import PortalContext
from app.models.deal import Deal
from app.models.document import Document
from app.models.meeting import Meeting
from app.models.portal import PortalInvoice


def _scope_conditions(ctx: PortalContext, contact_col, company_col):
    conditions = []
    if ctx.portal_user.contact_id:
        conditions.append(contact_col == ctx.portal_user.contact_id)
    if ctx.portal_user.company_id:
        conditions.append(company_col == ctx.portal_user.company_id)
    if not conditions:
        return contact_col == ctx.portal_user.contact_id
    return or_(*conditions)


def scope_deals(ctx: PortalContext):
    return _scope_conditions(ctx, Deal.contact_id, Deal.company_id)


def scope_documents(ctx: PortalContext):
    return _scope_conditions(ctx, Document.contact_id, Document.company_id)


def scope_meetings(ctx: PortalContext):
    return _scope_conditions(ctx, Meeting.contact_id, Meeting.company_id)


def scope_invoices(ctx: PortalContext):
    return _scope_conditions(ctx, PortalInvoice.contact_id, PortalInvoice.company_id)


def can_access_deal(ctx: PortalContext, deal: Deal) -> bool:
    if deal.tenant_id != ctx.tenant.id:
        return False
    if ctx.portal_user.contact_id and deal.contact_id == ctx.portal_user.contact_id:
        return True
    if ctx.portal_user.company_id and deal.company_id == ctx.portal_user.company_id:
        return True
    return False


def can_access_document(ctx: PortalContext, doc: Document) -> bool:
    if doc.tenant_id != ctx.tenant.id or doc.deleted_at is not None:
        return False
    if ctx.portal_user.contact_id and doc.contact_id == ctx.portal_user.contact_id:
        return True
    if ctx.portal_user.company_id and doc.company_id == ctx.portal_user.company_id:
        return True
    return False
