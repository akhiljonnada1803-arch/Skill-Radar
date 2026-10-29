"""
CLI Entry Point for Ingestion (T2.7, AGENTS.md §4)
Usage:
  python -m app.ingest --source all
  python -m app.ingest --source arxiv
  python -m app.ingest --source rss
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.services.ingestion.runner import IngestionManager

def main():
    parser = argparse.ArgumentParser(description="SkillRadar AI Ingestion CLI")
    parser.add_argument(
        "--source",
        choices=["all", "arxiv", "rss"],
        default="all",
        help="Source to ingest (default: all)"
    )
    args = parser.parse_args()

    print(f"Starting ingestion run for source: {args.source}...")
    db = SessionLocal()
    try:
        manager = IngestionManager(db)
        runs = manager.run_all(source_filter=args.source)

        total_fetched = sum(r.items_fetched for r in runs)
        total_failed = sum(r.items_failed for r in runs)

        print("\n--- Ingestion Run Summary ---")
        for r in runs:
            print(f"Source ID {r.source_id}: Status={r.status}, Fetched={r.items_fetched}, Failed={r.items_failed}")
            if r.error_summary:
                print(f"  Error: {r.error_summary}")

        print(f"\nTotal items fetched & persisted: {total_fetched}")
        print(f"Total items failed: {total_failed}")
        print("Ingestion run completed successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    main()
