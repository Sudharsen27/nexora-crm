import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.ai import AiChatRequest, AiMetaResponse
from app.services.ai_service import AiService

router = APIRouter(prefix="/tenants/{slug}/ai", tags=["ai"])


@router.get("/meta", response_model=AiMetaResponse)
def ai_meta(
    _: TenantContext = Depends(require_permission("tenant:read")),
) -> AiMetaResponse:
    settings = get_settings()
    return AiMetaResponse(
        enabled=settings.ai_enabled,
        provider=settings.AI_PROVIDER,
        model=settings.AI_MODEL,
        mock_fallback=not settings.ai_enabled,
    )


@router.post("/chat")
async def chat_stream(
    payload: AiChatRequest,
    ctx: TenantContext = Depends(require_permission("tenant:read")),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    settings = get_settings()
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI is not configured. Set OPENAI_API_KEY on the backend.",
        )

    service = AiService(db)
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]

    async def event_stream():
        try:
            async for token in service.stream_chat(ctx.tenant.id, messages):
                yield f"data: {json.dumps({'content': token})}\n\n"
            yield "data: [DONE]\n\n"
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            yield f"data: {json.dumps({'error': detail})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
