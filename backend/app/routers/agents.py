from fastapi import APIRouter

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "agents"}
