"""Demo lifecycle endpoints for the TaxLens hackathon build."""

from fastapi import APIRouter, Depends

from app.core.security import require_role
from scripts.seed_data import seed

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/reset")
async def reset_demo(_=Depends(require_role("admin", "ops_staff"))) -> dict:
    """Wipe and re-seed the demo dataset. Restricted to SHB operations staff."""
    summary = await seed(reset=True)
    return {"status": "ok", "summary": summary}
