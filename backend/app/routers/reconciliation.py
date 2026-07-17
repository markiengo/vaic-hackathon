from fastapi import APIRouter

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "reconciliation"}
