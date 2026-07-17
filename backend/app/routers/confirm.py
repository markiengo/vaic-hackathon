from fastapi import APIRouter

router = APIRouter(prefix="/confirm", tags=["confirm"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "confirm"}
