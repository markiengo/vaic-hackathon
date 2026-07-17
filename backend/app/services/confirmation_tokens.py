"""Signed, stateless confirmation-link tokens.

`docs/03-engineering/03-api-specifications.md`'s `/confirm/{token}` design
needs a token that identifies an exception and expires (7 days), but no
`confirmation_tokens` table exists in the schema and no tool among the 19
generates one explicitly. `draft_merchant_message` needs a real link to put
in the drafted text, so it mints the token here; `send_confirmation_request`
takes that token as an opaque string. The token is self-contained (HMAC-signed
exception_id + expiry) so no new table/migration is needed.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
from dataclasses import dataclass

from app.core.config import settings

DEFAULT_EXPIRY_DAYS = 7


@dataclass(frozen=True)
class ConfirmationToken:
    exception_id: int
    expires_at: int  # unix timestamp


def _sign(payload: str) -> str:
    return hmac.new(
        settings.JWT_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()[:16]


def generate_confirmation_token(exception_id: int, *, expiry_days: int = DEFAULT_EXPIRY_DAYS) -> str:
    expires_at = int(time.time()) + expiry_days * 86400
    payload = f"{exception_id}:{expires_at}"
    signature = _sign(payload)
    raw = f"{payload}:{signature}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")


class InvalidConfirmationToken(ValueError):
    pass


def decode_confirmation_token(token: str) -> ConfirmationToken:
    padded = token + "=" * (-len(token) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        exception_id_str, expires_at_str, signature = raw.split(":")
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidConfirmationToken("malformed token") from exc

    payload = f"{exception_id_str}:{expires_at_str}"
    if not hmac.compare_digest(_sign(payload), signature):
        raise InvalidConfirmationToken("signature mismatch")

    expires_at = int(expires_at_str)
    if expires_at < int(time.time()):
        raise InvalidConfirmationToken("token expired")

    return ConfirmationToken(exception_id=int(exception_id_str), expires_at=expires_at)


__all__ = [
    "ConfirmationToken",
    "InvalidConfirmationToken",
    "DEFAULT_EXPIRY_DAYS",
    "generate_confirmation_token",
    "decode_confirmation_token",
]
