"""JWT auth, bcrypt password hashing, Redis rolling-window lockout, RBAC.

Error code catalogue (28 codes from docs/03-engineering/05-api-reference.md §13):
  MERCHANT : ERR-MERCHANT-001 (404), ERR-MERCHANT-002 (409)
  AUTH     : ERR-AUTH-001 (401), ERR-AUTH-002 (401), ERR-AUTH-003 (403)
  RECON    : ERR-RECON-001 (409), ERR-RECON-002 (422)
  RUN      : ERR-RUN-001 (404), ERR-RUN-002 (409)
  EXCEPTION: ERR-EXCEPTION-001 (404), ERR-EXCEPTION-002 (409)
  TAX      : ERR-TAX-001 (404), ERR-TAX-002 (400), ERR-TAX-003 (422)
  CASE     : ERR-CASE-001 (404), ERR-CASE-002 (409)
  POS      : ERR-POS-001 (422), ERR-POS-002 (404), ERR-POS-003 (409),
             ERR-POS-004 (404), ERR-POS-005 (422)
  TOKEN    : ERR-TOKEN-001 (404), ERR-TOKEN-002 (410)
  WEBHOOK  : ERR-WEBHOOK-001 (401), ERR-WEBHOOK-002 (422)
  GEN      : ERR-GEN-001 (400), ERR-GEN-002 (500), ERR-GEN-003 (503)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ---------------------------------------------------------------------------
# TaxLensError
# ---------------------------------------------------------------------------


class TaxLensError(Exception):
    """Domain exception — converted to JSON error response by the handler in main.py.

    Response shape (D.7):
        {"error": {"code": "ERR-XXX-NNN", "message": "...", "details": {}}}
    """

    def __init__(
        self,
        code: str,
        status_code: int,
        message: str,
        details: dict | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.message = message
        self.details = details or {}


# ---------------------------------------------------------------------------
# Password helpers  (SEC-PASS-001: bcrypt cost ≥12)
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT helpers  (SEC-AUTH-001: access 15 min, refresh 7 days, HS256)
# ---------------------------------------------------------------------------


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_EXPIRE_MINUTES
    )
    payload = {"sub": user_id, "role": role, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT.  Raises TaxLensError ERR-AUTH-001 on any failure."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise TaxLensError("ERR-AUTH-001", 401, "Token đã hết hạn")
    except JWTError:
        raise TaxLensError("ERR-AUTH-001", 401, "Token không hợp lệ")


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    token: str = Depends(_oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Decode JWT and return the matching active User row."""
    from app.models.user import User  # local import avoids circular at module load

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise TaxLensError("ERR-AUTH-001", 401, "Token không đúng loại")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise TaxLensError("ERR-AUTH-001", 401, "Token thiếu subject")

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise TaxLensError("ERR-AUTH-001", 401, "Tài khoản không tồn tại hoặc đã bị vô hiệu")

    return user


def require_role(*roles: str):
    """Factory: returns a FastAPI dependency that enforces one of the given roles."""

    async def dependency(user=Depends(get_current_user)):
        if user.role not in roles:
            raise TaxLensError(
                "ERR-AUTH-003",
                403,
                "Không đủ quyền truy cập",
                {"required_roles": list(roles), "user_role": user.role},
            )
        return user

    return dependency


# ---------------------------------------------------------------------------
# Redis rolling-window lockout  (SEC-PASS-003: 5 failures → 15 min)  (D.1)
# ---------------------------------------------------------------------------

_LOCKOUT_TTL = 900  # 15 minutes in seconds
_MAX_FAILURES = 5


async def check_lockout(email: str) -> None:
    """Raise ERR-AUTH-001 (401) if account is currently locked out."""
    redis = await get_redis()
    locked = await redis.exists(f"lockout:{email}")
    if locked:
        raise TaxLensError("ERR-AUTH-001", 401, "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần")


async def record_failed_login(email: str) -> None:
    """Increment failure counter; lock account after MAX_FAILURES within TTL window."""
    redis = await get_redis()
    key = f"failed:{email}"
    count = await redis.incr(key)
    await redis.expire(key, _LOCKOUT_TTL)  # rolling window — reset on each failure
    if count >= _MAX_FAILURES:
        await redis.set(f"lockout:{email}", "1", ex=_LOCKOUT_TTL)
        await redis.delete(key)


async def clear_failed_login(email: str) -> None:
    """Clear failure counter on successful login."""
    redis = await get_redis()
    await redis.delete(f"failed:{email}")
