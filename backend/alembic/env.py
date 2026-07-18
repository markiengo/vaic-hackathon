import asyncio
from logging.config import fileConfig
from urllib.parse import urlencode, parse_qs, urlsplit, urlunsplit

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool

# Import Base and all models so autogenerate can detect them
from app.core.database import Base
import app.models  # noqa: F401 — triggers all model imports via models/__init__.py
from app.core.config import settings

config = context.config

# Override sqlalchemy.url from environment variable.
# configparser treats % as interpolation marker — escape %% so passwords with
# URL-encoded chars (e.g. %3C, %27) don't raise ValueError.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def _extract_connect_args(db_url: str) -> tuple[str, dict]:
    """Strip connect_args (e.g. statement_cache_size) from URL query string.

    asyncpg rejects these as query-string params (compares str < int → TypeError).
    Must be passed as int via connect_args dict instead.
    """
    parsed = urlsplit(db_url)
    query = parse_qs(parsed.query)
    connect_args: dict = {}
    scs = query.pop("statement_cache_size", None)
    if scs is not None:
        connect_args["statement_cache_size"] = int(scs[0])
    clean_url = urlunsplit((
        parsed.scheme, parsed.netloc, parsed.path,
        urlencode(query, doseq=True), parsed.fragment,
    ))
    return clean_url, connect_args


async def run_async_migrations():
    """Async migration runner using run_sync() — SQLAlchemy 2.0 async + Alembic pattern (option b)."""
    # Read directly from settings (not alembic config) — configparser escapes %% back
    # to % when reading but the round-trip is fragile with URL-encoded passwords.
    clean_url, connect_args = _extract_connect_args(settings.DATABASE_URL)
    connectable = create_async_engine(
        clean_url,
        connect_args=connect_args,
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
