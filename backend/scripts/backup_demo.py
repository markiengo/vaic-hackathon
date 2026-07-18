"""Snapshot the demo database so a demo run can be reset in seconds.

Uses `pg_dump -Fc` (custom format: compressed, supports `pg_restore
--clean`) rather than a hand-rolled per-table exporter — 19 tables with FK
constraints and JSONB columns is exactly what pg_dump/pg_restore already
handle correctly.

Usage:
    python scripts/backup_demo.py                  # -> scripts/demo_backups/demo_snapshot.dump
    python scripts/backup_demo.py --output PATH
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from scripts._pg_dsn import get_pg_connection

DEFAULT_SNAPSHOT_PATH = Path(__file__).parent / "demo_backups" / "demo_snapshot.dump"


def backup(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    conn = get_pg_connection()
    command = ["pg_dump", *conn.cli_args(), "-Fc", "--no-owner", "--no-privileges", "-f", str(output)]
    result = subprocess.run(command, env=conn.env(), capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        raise SystemExit(f"pg_dump failed with exit code {result.returncode}")

    size_kb = output.stat().st_size / 1024
    print(f"Backup written: {output} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Snapshot the TaxLens demo database.")
    parser.add_argument("--output", type=Path, default=DEFAULT_SNAPSHOT_PATH)
    args = parser.parse_args()
    backup(args.output)
