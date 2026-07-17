from fastapi import APIRouter

router = APIRouter(prefix="/tax", tags=["tax"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "tax"}
