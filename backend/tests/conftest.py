"""Shared test configuration.

External seeded-DB tests are opt-in.  P1's integration suite uses its own
SQLite fixture and never reads or mutates the shared Sprint seed.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Ensure backend dir is on sys.path. Preserve a developer's backend/.env; the
# dummy settings are only for isolated tests when that file is absent.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
_HAS_ENV_FILE = (_BACKEND_DIR / ".env").is_file()
_HAS_EXTERNAL_DATABASE = bool(os.environ.get("DATABASE_URL")) or _HAS_ENV_FILE
if not _HAS_ENV_FILE:
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test-default.db")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
    os.environ.setdefault("JWT_SECRET", "test-only-secret")
    os.environ.setdefault("SEPAY_API_URL", "https://example.invalid/sepay")
    os.environ.setdefault("SEPAY_API_TOKEN", "test-token")
    os.environ.setdefault("SEPAY_WEBHOOK_API_KEY", "test-webhook-key")
    os.environ.setdefault("INVOICE_API_URL", "https://example.invalid/invoices")
    os.environ.setdefault("CASE_API_URL", "https://example.invalid/cases")
    os.environ.setdefault("LLM_PROVIDER", "test")
    os.environ.setdefault("LLM_API_KEY", "test-key")
    os.environ.setdefault("LLM_MODEL_PLANNER", "test-planner")
    os.environ.setdefault("LLM_MODEL_SPECIALIST", "test-specialist")

pytest_plugins = ("tests.p1_db_fixtures",)


@pytest.fixture(scope="session")
async def seeded_db():
    """Seed the configured shared DB only for tests that explicitly request it."""

    if not _HAS_EXTERNAL_DATABASE:
        pytest.skip("external DATABASE_URL is required for shared seed-data tests")
    from scripts.seed_data import seed as seed_fn

    await seed_fn()
    yield
