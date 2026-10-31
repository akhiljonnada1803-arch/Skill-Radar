"""
Migrates all local PostgreSQL data into the remote Neon PostgreSQL instance.
Follows strict topological foreign-key order.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, select
from sqlalchemy.dialects.postgresql import insert
from app.models import Base
from app.core.config import settings

LOCAL_URL = settings.DATABASE_URL
NEON_URL = "postgresql://neondb_owner:npg_T0XPWA1MftIj@ep-autumn-shadow-b45ad4ci.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

def migrate():
    print(f"Connecting to Local DB: {LOCAL_URL}")
    local_engine = create_engine(LOCAL_URL)
    
    print(f"Connecting to Neon DB...")
    neon_engine = create_engine(NEON_URL)
    
    # Ensure tables exist on Neon
    Base.metadata.create_all(bind=neon_engine)
    print("Tables verified on Neon.")

    tables = Base.metadata.sorted_tables
    
    with local_engine.connect() as local_conn, neon_engine.connect() as neon_conn:
        for table in tables:
            rows = local_conn.execute(select(table)).mappings().all()
            if not rows:
                print(f"  - {table.name}: 0 rows (skipped)")
                continue

            print(f"  - {table.name}: copying {len(rows)} rows...")
            row_dicts = [dict(r) for r in rows]
            
            # Batch insert in chunks of 100
            chunk_size = 100
            for i in range(0, len(row_dicts), chunk_size):
                chunk = row_dicts[i:i + chunk_size]
                stmt = insert(table).values(chunk).on_conflict_do_nothing()
                neon_conn.execute(stmt)
                neon_conn.commit()

            print(f"    [OK] {table.name}: completed")

    print("\n[SUCCESS] Database migration to Neon finished successfully!")

if __name__ == "__main__":
    migrate()
