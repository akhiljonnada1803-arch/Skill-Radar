import os
import sys
from app.core.database import SessionLocal
from app.services.content_loader import import_content_to_db, ContentValidationError

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    content_dir = os.path.join(root_dir, "content")
    print(f"Loading and validating content from: {content_dir}")

    db = SessionLocal()
    try:
        results = import_content_to_db(db, content_dir)
        print(f"Content load SUCCESS:")
        print(f"  Domains imported/updated: {results['domains']}")
        print(f"  Skills imported/updated:  {results['skills']}")
    except ContentValidationError as e:
        print(f"Content validation FAILED: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error importing content: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
