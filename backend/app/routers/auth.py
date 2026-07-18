from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    TaxLensError,
    check_lockout,
    clear_failed_login,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    record_failed_login,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshRequest,
    RefreshResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    await check_lockout(body.email)

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not user.password_hash:
        await record_failed_login(body.email)
        raise TaxLensError("ERR-AUTH-001", 401, "Email hoặc mật khẩu không đúng")

    if not verify_password(body.password, user.password_hash):
        await record_failed_login(body.email)
        raise TaxLensError("ERR-AUTH-001", 401, "Email hoặc mật khẩu không đúng")

    if not user.is_active:
        raise TaxLensError("ERR-AUTH-002", 401, "Tài khoản đã bị vô hiệu hóa")

    await clear_failed_login(body.email)

    return JSONResponse(content={
        "access_token": create_access_token(user.id, user.role),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    })


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    payload = decode_token(body.refresh_token)

    if payload.get("type") != "refresh":
        raise TaxLensError("ERR-AUTH-001", 401, "Token không phải refresh token")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise TaxLensError("ERR-AUTH-001", 401, "Token thiếu subject")

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise TaxLensError("ERR-AUTH-001", 401, "Tài khoản không tồn tại hoặc đã bị vô hiệu")

    return JSONResponse(content={
        "access_token": create_access_token(user.id, user.role),
        "token_type": "bearer",
    })


@router.get("/me", response_model=MeResponse)
async def get_me(user: User = Depends(get_current_user)) -> JSONResponse:
    return JSONResponse(content={
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "merchant_id": user.merchant_id,
    })
