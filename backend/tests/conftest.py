"""Shared test fixtures for integration tests against Supabase."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure backend dir is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import AsyncSessionLocal
from scripts.seed_data import seed as seed_fn


@pytest.fixture(autouse=True, scope="session")
async def _setup_db():
    """Ensure DB is seeded before any tests run."""
    await seed_fn()
    yield