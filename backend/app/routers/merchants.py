from fastapi import APIRouter

router = APIRouter(prefix="/merchants", tags=["merchants"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "merchants"}
