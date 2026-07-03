import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.notification_ws import set_main_event_loop
from app.db.bootstrap import bootstrap_database

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    set_main_event_loop(asyncio.get_running_loop())
    bootstrap_database()
    logger.info(
        "CORS allowed origins: %s%s",
        settings.cors_origins,
        f" (regex: {settings.cors_origin_regex})" if settings.cors_origin_regex else "",
    )
    yield


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return JSON 500 so CORS headers are applied (plain uvicorn 500 responses omit them)."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    detail = str(exc) if settings.DEBUG else "Internal server error"
    response = JSONResponse(status_code=500, content={"detail": detail})
    origin = request.headers.get("origin")
    if origin:
        allowed = origin in settings.cors_origins
        if not allowed and settings.cors_origin_regex:
            import re

            allowed = bool(re.fullmatch(settings.cors_origin_regex, origin))
        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "api": settings.API_V1_PREFIX,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(f"{settings.API_V1_PREFIX}/meta")
def meta() -> dict[str, str]:
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION}
