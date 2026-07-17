from fastapi import APIRouter

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "cases"}
