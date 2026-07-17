from fastapi import APIRouter

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "audit"}
