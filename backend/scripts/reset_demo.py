"""
reset_demo.py — Wipe all TaxLens data and re-seed the M001 demo dataset.

Safety gates:
  - Aborts immediately if ENVIRONMENT=production (exit code 1, no DB touched).
  - Designed for local dev and staging only. Never run on prod.

Usage:
  cd backend
  PYTHONPATH=. python scripts/reset_demo.py
"""

import asyncio
import sys
import time

# ---------------------------------------------------------------------------
# Safety gate — must run before any DB import so Pydantic settings validate env
# ---------------------------------------------------------------------------
import os

_env = os.environ.get("ENVIRONMENT", "development")
if _env == "production":
    print(
        "ERROR: reset_demo.py refused to run — ENVIRONMENT=production.\n"
        "This script drops and recreates all demo data. Never run it on production.",
        file=sys.stderr,
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Imports (after safety gate so we don't initialise DB connections on prod)
# ---------------------------------------------------------------------------
from scripts.seed_data import seed  # noqa: E402  (after sys.exit guard)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ts() -> str:
    return time.strftime("%H:%M:%S")


# ---------------------------------------------------------------------------
# Main reset logic
# ---------------------------------------------------------------------------

async def reset_demo() -> None:
    t0 = time.perf_counter()
    print(f"[{_ts()}] reset_demo starting — ENVIRONMENT={_env}")
    print(f"[{_ts()}] Step 1: deleting all TaxLens rows (FK-safe order) …")

    # seed(reset=True) calls reset_all() internally (FK-safe DELETE per table)
    # then re-inserts the full M001 demo dataset (Salon Hoa).
    print(f"[{_ts()}] Step 2: seeding M001 demo dataset …")
    counts = await seed(reset=True)

    elapsed = time.perf_counter() - t0
    print(f"[{_ts()}] Done. Elapsed: {elapsed:.1f}s")
    if elapsed > 30:
        print(
            f"WARNING: reset took {elapsed:.1f}s which exceeds the 30s threshold.\n"
            "Consider optimising seed_data.py or checking DB connection latency.",
            file=sys.stderr,
        )

    print(f"[{_ts()}] Seeded counts: {counts}")


if __name__ == "__main__":
    asyncio.run(reset_demo())
