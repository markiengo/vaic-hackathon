from redis.asyncio import Redis, ConnectionPool
from redis.exceptions import RedisError

from app.core.config import settings

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=20,
            decode_responses=True,
        )
    return _pool


async def get_redis() -> Redis:
    return Redis(connection_pool=get_pool())


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.disconnect()
        _pool = None
