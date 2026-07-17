from fastapi import APIRouter

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "transactions"}
