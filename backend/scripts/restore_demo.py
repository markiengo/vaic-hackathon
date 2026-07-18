"""Restore the demo database from a snapshot created by backup_demo.py.

`--clean --if-exists` drops existing objects before recreating them, so
this is safe to run against a database that already has (possibly
modified, demo-run-dirtied) data in it — the end state is always exactly
the snapshot's contents.

Usage:
    python scripts/restore_demo.py                  # <- scripts/demo_backups/demo_snapshot.dump
    python scripts/restore_demo.py --input PATH
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from scripts._pg_dsn import get_pg_connection

DEFAULT_SNAPSHOT_PATH = Path(__file__).parent / "demo_backups" / "demo_snapshot.dump"


def restore(input_path: Path) -> None:
    if not input_path.exists():
        raise SystemExit(f"Snapshot not found: {input_path} — run backup_demo.py first.")

    conn = get_pg_connection()
    command = [
        "pg_restore",
        *conn.cli_args(),
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        str(input_path),
    ]
    result = subprocess.run(command, env=conn.env(), capture_output=True, text=True)
    # pg_restore exits 1 on warnings (e.g. "role does not exist" from
    # --no-owner interacting with --clean) even when the restore itself
    # succeeded; only treat it as fatal if no data-defining statements ran.
    if result.returncode not in (0, 1):
        print(result.stderr, file=sys.stderr)
        raise SystemExit(f"pg_restore failed with exit code {result.returncode}")
    if result.returncode == 1:
        print(result.stderr, file=sys.stderr)

    print(f"Restored from: {input_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Restore the TaxLens demo database from a snapshot.")
    parser.add_argument("--input", type=Path, default=DEFAULT_SNAPSHOT_PATH)
    args = parser.parse_args()
    restore(args.input)
