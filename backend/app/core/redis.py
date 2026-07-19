from redis.asyncio import Redis, ConnectionPool

from app.core.config import settings

_pool: ConnectionPool | None = None


class _InMemoryRedis:
    """In-process async Redis stand-in for local development without a real Redis server."""

    def __init__(self) -> None:
        self._data: dict[str, str] = {}

    async def exists(self, *names: str) -> int:
        return sum(1 for n in names if n in self._data)

    async def incr(self, name: str) -> int:
        current = int(self._data.get(name, "0")) + 1
        self._data[name] = str(current)
        return current

    async def expire(self, name: str, time: int) -> int:
        return 1 if name in self._data else 0

    async def set(self, name: str, value: str, *, ex=None, **kwargs) -> bool:
        self._data[name] = str(value)
        return True

    async def delete(self, *names: str) -> int:
        count = 0
        for n in names:
            if n in self._data:
                del self._data[n]
                count += 1
        return count


def get_pool() -> ConnectionPool | None:
    global _pool
    if _pool is None and not settings.REDIS_URL.startswith("memory://"):
        _pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=20,
            decode_responses=True,
        )
    return _pool


async def get_redis() -> Redis | _InMemoryRedis:
    if settings.REDIS_URL.startswith("memory://"):
        return _InMemoryRedis()
    return Redis(connection_pool=get_pool())


async def close_pool() -> None:
    global _pool
    if _pool is not None and not isinstance(_pool, _InMemoryRedis):
        await _pool.disconnect()
    _pool = None
