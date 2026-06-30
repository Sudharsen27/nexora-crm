from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

REFRESH_COOKIE = "nexora_refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    samesite = settings.COOKIE_SAMESITE
    secure = settings.COOKIE_SECURE
    if samesite == "none" and not secure:
        secure = True
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path="/", domain=settings.COOKIE_DOMAIN)


def _auth_response(user: User, access_token: str, expires_in: int) -> AuthResponse:
    return AuthResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    service = AuthService(db)
    user = service.register(payload.email, payload.password, payload.full_name)
    access_token, refresh_token, expires_in = service.issue_tokens(
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    _set_refresh_cookie(response, refresh_token)
    return _auth_response(user, access_token, expires_in)


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    service = AuthService(db)
    user = service.authenticate(payload.email, payload.password)
    service.log_user_login(user.id)
    access_token, refresh_token, expires_in = service.issue_tokens(
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    _set_refresh_cookie(response, refresh_token)
    return _auth_response(user, access_token, expires_in)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(
    request: Request,
    response: Response,
    payload: RefreshRequest | None = None,
    db: Session = Depends(get_db),
) -> TokenResponse:
    refresh_value = request.cookies.get(REFRESH_COOKIE)
    if not refresh_value and payload and payload.refresh_token:
        refresh_value = payload.refresh_token
    if not refresh_value:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    service = AuthService(db)
    access_token, new_refresh, expires_in, _user = service.refresh_access_token(refresh_value)
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    refresh_value = request.cookies.get(REFRESH_COOKIE)
    if refresh_value:
        AuthService(db).revoke_refresh_token(refresh_value)
    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    settings = get_settings()
    service = AuthService(db)
    result = service.request_password_reset(payload.email)
    return ForgotPasswordResponse(
        message="If an account exists for that email, password reset instructions have been sent.",
        reset_url=result.dev_reset_url,
        email_sent=result.email_sent,
        email_configured=settings.email_enabled,
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    AuthService(db).reset_password(payload.token, payload.password)
    return MessageResponse(message="Password updated. You can sign in with your new password.")
