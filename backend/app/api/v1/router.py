from fastapi import APIRouter

from app.api.v1 import auth, contacts, deals, leads, tenants, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(tenants.router)
api_router.include_router(users.router)
api_router.include_router(leads.router)
api_router.include_router(deals.router)
api_router.include_router(contacts.router)
