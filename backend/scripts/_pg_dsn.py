"""Parse settings.DATABASE_URL into pg_dump/pg_restore/psql CLI arguments.

Shared by backup_demo.py and restore_demo.py so both invoke the same
connection the app itself uses (asyncpg via SQLAlchemy), not a
separately-configured one that could quietly drift.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import unquote, urlparse

from app.core.config import settings


@dataclass(frozen=True)
class PgConnection:
    host: str
    port: int
    user: str
    password: str
    dbname: str

    def cli_args(self) -> list[str]:
        return ["-h", self.host, "-p", str(self.port), "-U", self.user, "-d", self.dbname]

    def env(self) -> dict[str, str]:
        # PGPASSWORD (not a CLI arg) keeps the password out of argv/`ps`.
        merged = dict(os.environ)
        merged["PGPASSWORD"] = self.password
        return merged


def get_pg_connection() -> PgConnection:
    # DATABASE_URL is postgresql+asyncpg://... for SQLAlchemy's async engine;
    # the CLI tools only understand the plain postgresql:// scheme.
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(url)
    if not parsed.hostname or not parsed.path.lstrip("/"):
        raise ValueError(f"DATABASE_URL is missing host or database name: {settings.DATABASE_URL!r}")
    return PgConnection(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=unquote(parsed.username or ""),
        password=unquote(parsed.password or ""),
        dbname=parsed.path.lstrip("/"),
    )
