from fastapi import APIRouter

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "sales"}
