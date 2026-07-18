from urllib.parse import urlencode, parse_qs, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _parse_db_url(db_url: str) -> tuple[str, dict]:
    """Strip asyncpg connect_args from URL query string.

    asyncpg rejects statement_cache_size as a query-string param (str < int TypeError).
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


_db_url, _connect_args = _parse_db_url(settings.DATABASE_URL)

engine = create_async_engine(
    _db_url,
    connect_args=_connect_args,
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
