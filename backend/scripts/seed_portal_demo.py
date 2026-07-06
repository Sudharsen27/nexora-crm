"""Seed demo customer portal data for local testing.

Usage (from backend/):
  python -m scripts.seed_portal_demo
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.mixins import utcnow
from app.db.session import SessionLocal
from app.models import Contact, CustomerPortalUser, Deal, Meeting, Tenant
from app.models.portal import Announcement, KnowledgeArticle, PortalInvoice, SupportTicket


def main() -> None:
    db = SessionLocal()
    try:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == "demo"))
        if tenant is None:
            print("No tenant with slug 'demo'. Create an organization first.")
            return

        contact = db.scalar(
            select(Contact).where(Contact.tenant_id == tenant.id).order_by(Contact.created_at).limit(1)
        )
        if contact is None:
            print("No contacts in demo tenant. Create a contact first.")
            return

        email = "customer@example.com"
        portal_user = db.scalar(
            select(CustomerPortalUser).where(
                CustomerPortalUser.tenant_id == tenant.id,
                CustomerPortalUser.email == email,
            )
        )
        if portal_user is None:
            portal_user = CustomerPortalUser(
                tenant_id=tenant.id,
                contact_id=contact.id,
                company_id=contact.company_id,
                email=email,
                password_hash=hash_password("Customer123!"),
                full_name=f"{contact.first_name} {contact.last_name}".strip() or "Demo Customer",
                phone=contact.phone,
                job_title=contact.job_title,
                status="active",
            )
            db.add(portal_user)
            print(f"Created portal user: {email} / Customer123!")

        # Also ensure contact email has portal access if different
        if contact.email and contact.email.lower() != email:
            contact_portal = db.scalar(
                select(CustomerPortalUser).where(
                    CustomerPortalUser.tenant_id == tenant.id,
                    CustomerPortalUser.email == contact.email.lower(),
                )
            )
            if contact_portal is None:
                db.add(
                    CustomerPortalUser(
                        tenant_id=tenant.id,
                        contact_id=contact.id,
                        company_id=contact.company_id,
                        email=contact.email.lower(),
                        password_hash=hash_password("Customer123!"),
                        full_name=f"{contact.first_name} {contact.last_name}".strip() or "Demo Customer",
                        phone=contact.phone,
                        job_title=contact.job_title,
                        status="active",
                    )
                )
                print(f"Created portal user: {contact.email} / Customer123!")

        if not db.scalar(
            select(Deal).where(Deal.tenant_id == tenant.id, Deal.contact_id == contact.id).limit(1)
        ):
            db.add(
                Deal(
                    tenant_id=tenant.id,
                    contact_id=contact.id,
                    company_id=contact.company_id,
                    title="Enterprise Platform License",
                    description="Annual subscription renewal with premium support tier.",
                    stage="proposal",
                    value=Decimal("48000.00"),
                    currency="USD",
                    probability=60,
                    expected_close_date=date.today() + timedelta(days=45),
                )
            )
            db.add(
                Deal(
                    tenant_id=tenant.id,
                    contact_id=contact.id,
                    company_id=contact.company_id,
                    title="Professional Services Package",
                    description="Implementation and onboarding for Q3 rollout.",
                    stage="negotiation",
                    value=Decimal("12500.00"),
                    currency="USD",
                    probability=75,
                    expected_close_date=date.today() + timedelta(days=21),
                )
            )
            print("Created demo deals linked to contact.")

        if not db.scalar(
            select(Meeting).where(Meeting.tenant_id == tenant.id, Meeting.contact_id == contact.id).limit(1)
        ):
            start = utcnow() + timedelta(days=5)
            db.add(
                Meeting(
                    tenant_id=tenant.id,
                    contact_id=contact.id,
                    company_id=contact.company_id,
                    title="Quarterly business review",
                    description="Review open deals, roadmap, and support items.",
                    meeting_type="client_meeting",
                    status="confirmed",
                    start_datetime=start,
                    end_datetime=start + timedelta(hours=1),
                    meeting_url="https://meet.example.com/demo-qbr",
                    location="Video call",
                )
            )
            print("Created demo meeting.")

        if not db.scalar(select(PortalInvoice).where(PortalInvoice.tenant_id == tenant.id).limit(1)):
            db.add(
                PortalInvoice(
                    tenant_id=tenant.id,
                    contact_id=contact.id,
                    company_id=contact.company_id,
                    invoice_number="INV-2026-0042",
                    amount=Decimal("4800.00"),
                    currency="USD",
                    status="sent",
                    due_date=date.today() + timedelta(days=14),
                )
            )
            db.add(
                PortalInvoice(
                    tenant_id=tenant.id,
                    contact_id=contact.id,
                    company_id=contact.company_id,
                    invoice_number="INV-2026-0038",
                    amount=Decimal("1200.00"),
                    currency="USD",
                    status="paid",
                    due_date=date.today() - timedelta(days=10),
                )
            )
            print("Created demo invoices.")

        if not db.scalar(select(Announcement).where(Announcement.tenant_id == tenant.id).limit(1)):
            db.add(
                Announcement(
                    tenant_id=tenant.id,
                    title="Welcome to your customer portal",
                    body="Track deals, download documents, and get support — all in one place.",
                    is_published=True,
                    published_at=utcnow(),
                )
            )

        kb_count = db.scalar(
            select(func.count()).select_from(KnowledgeArticle).where(KnowledgeArticle.tenant_id == tenant.id)
        ) or 0
        if kb_count < 2:
            if not db.scalar(
                select(KnowledgeArticle).where(
                    KnowledgeArticle.tenant_id == tenant.id,
                    KnowledgeArticle.slug == "how-to-upload-documents",
                )
            ):
                db.add(
                    KnowledgeArticle(
                        tenant_id=tenant.id,
                        title="How to upload documents",
                        slug="how-to-upload-documents",
                        summary="Steps to share files with your account team.",
                        body="1. Go to Documents\n2. Click Upload\n3. Select your file\n\nOur team will review uploads within 1 business day.",
                        category="documents",
                        is_published=True,
                    )
                )
            if not db.scalar(
                select(KnowledgeArticle).where(
                    KnowledgeArticle.tenant_id == tenant.id,
                    KnowledgeArticle.slug == "request-a-meeting",
                )
            ):
                db.add(
                    KnowledgeArticle(
                        tenant_id=tenant.id,
                        title="How to request a meeting",
                        slug="request-a-meeting",
                        summary="Schedule time with your account manager.",
                        body="1. Open Calendar\n2. Click Request meeting\n3. Pick your preferred time\n\nWe'll confirm by email within 1 business day.",
                        category="meetings",
                        is_published=True,
                    )
                )

        if portal_user and not db.scalar(
            select(SupportTicket).where(
                SupportTicket.tenant_id == tenant.id,
                SupportTicket.portal_user_id == portal_user.id,
            ).limit(1)
        ):
            db.add(
                SupportTicket(
                    tenant_id=tenant.id,
                    portal_user_id=portal_user.id,
                    contact_id=contact.id,
                    subject="Question about invoice INV-2026-0042",
                    description="Could you confirm the payment terms and due date for the latest invoice?",
                    status="open",
                    priority="medium",
                    category="billing",
                )
            )
            print("Created demo support ticket.")

        db.commit()
        print("\nPortal demo seed complete.")
        print("Login at http://localhost:3000/portal/login")
        print("  Org slug: demo")
        print("  Password: Customer123!")
        print("  Emails:")
        print("    - customer@example.com")
        if contact.email:
            print(f"    - {contact.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
