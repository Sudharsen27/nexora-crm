from fastapi import APIRouter

from app.api.v1 import activities, analytics, ai, auth, calendar, companies, contacts, dashboard, deals, documents, emails, leads, meetings, notifications, tasks, tenants, users, workflows

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(tenants.router)
api_router.include_router(users.router)
api_router.include_router(leads.router)
api_router.include_router(deals.router)
api_router.include_router(contacts.router)
api_router.include_router(companies.router)
api_router.include_router(activities.router)
api_router.include_router(tasks.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(notifications.router)
api_router.include_router(meetings.router)
api_router.include_router(calendar.router)
api_router.include_router(emails.router)
api_router.include_router(emails.tracking_router)
api_router.include_router(workflows.router)
api_router.include_router(documents.router)
api_router.include_router(ai.router)
