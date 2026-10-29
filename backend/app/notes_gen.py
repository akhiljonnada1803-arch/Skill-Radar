import os
import sys
import argparse
from app.core.database import SessionLocal
from app.services.notes_gen import run_batch_notes_generation

def main():
    parser = argparse.ArgumentParser(description="SkillRadar AI Study Notes Generator")
    parser.add_argument(
        "--approve",
        action="store_true",
        help="Approve generated notes (simulating curator review C5)"
    )
    args = parser.parse_args()

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    content_dir = os.path.join(root_dir, "content")

    print(f"Generating study notes from: {content_dir} (auto-approve={args.approve})...")
    db = SessionLocal()
    try:
        results = run_batch_notes_generation(db, content_dir, auto_approve=args.approve)
        print("Study notes generation completed:")
        print(f"  Notes generated: {results['generated']}")
        print(f"  Notes approved:  {results['approved']}")
    except Exception as e:
        print(f"Error generating notes: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
