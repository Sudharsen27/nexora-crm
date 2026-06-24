from fastapi import APIRouter

from app.api.v1 import activities, auth, companies, contacts, dashboard, deals, leads, tasks, tenants, users

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
