from fastapi import APIRouter

router = APIRouter(prefix="/pos", tags=["pos"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "router": "pos"}
