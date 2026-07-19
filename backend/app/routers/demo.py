"""Demo lifecycle endpoints for the TaxLens hackathon build."""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from scripts.seed_data import seed

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/reset")
async def reset_demo(_=Depends(get_current_user)) -> dict:
    """Wipe and re-seed the demo dataset."""
    summary = await seed(reset=True)
    return {"status": "ok", "summary": summary}
