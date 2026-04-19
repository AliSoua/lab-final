# app/config/connection/postgres_client.py
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

load_dotenv()
logger = logging.getLogger(__name__)

# ── Read settings from environment ────────────────────────────────────────────
POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT     = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB       = os.getenv("POSTGRES_DB", "lab_platform")
POSTGRES_USER     = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")

# ── Synchronous (for FastAPI, existing code) ───────────────────────────────────
DATABASE_URL = (
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ── ASYNC (for Celery tasks) ───────────────────────────────────────────────────
ASYNC_DATABASE_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Import helper (centralises model loading) ─────────────────────────────────
def _import_all_models():
    """Import every model so SQLAlchemy's metadata is fully populated."""
    from app.db.base import Base

    import app.models.LabDefinition.core
    import app.models.LabDefinition.LabVM
    import app.models.LabDefinition.LabGuide
    import app.models.LabInstance.core
    import app.models.LabInstance.LabInstanceVM
    import app.models.LabInstance.LabInstanceEvent
    import app.models.user

    return Base


# ── Table helpers ──────────────────────────────────────────────────────────────
def create_db_tables() -> None:
    """Create all tables (skips existing ones)."""
    Base = _import_all_models()
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created (or already exist).")


def drop_db_tables() -> dict:
    """
    Drop ALL application tables from the database using CASCADE.
 
    Bypasses SQLAlchemy's default DROP TABLE (which fails on FK dependencies)
    by issuing a single raw SQL statement that drops all managed tables at once
    with CASCADE, removing dependent constraints automatically.
 
    Returns a summary dict with the list of dropped table names.
    """
    Base = _import_all_models()
    table_names = [t.name for t in Base.metadata.sorted_tables]
 
    if not table_names:
        logger.warning("⚠️  No tables found in metadata to drop.")
        return {"dropped_tables": []}
 
    # Build a comma-separated quoted list and drop everything in one shot
    tables_str = ", ".join(f'"{name}"' for name in table_names)
    with engine.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {tables_str} CASCADE"))
 
    logger.warning("⚠️  All database tables dropped (CASCADE): %s", table_names)
    return {"dropped_tables": table_names}


def sync_db_tables() -> dict:
    """
    Sync tables: drop everything, then recreate from current models.

    Equivalent to a full schema reset. All existing data will be lost.
    Returns a summary dict with the recreated table names.
    """
    drop_result = drop_db_tables()
    Base = _import_all_models()
    Base.metadata.create_all(bind=engine)
    table_names = [t.name for t in Base.metadata.sorted_tables]
    logger.info("🔄 Database tables synced (dropped & recreated): %s", table_names)
    return {
        "dropped_tables": drop_result["dropped_tables"],
        "created_tables": table_names,
    }


def backup_db_tables(backup_dir: str = "backup-db") -> dict:
    """
    Backup all table data to JSON files inside *backup_dir*.

    One file is written per table:  <backup_dir>/<timestamp>/<table>.json
    A manifest.json is also written with metadata about the backup run.

    Returns a summary dict with the backup path and per-table row counts.
    """
    Base = _import_all_models()
    inspector = inspect(engine)

    # Build timestamped subdirectory so backups never overwrite each other
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    backup_path = Path(backup_dir) / timestamp
    backup_path.mkdir(parents=True, exist_ok=True)

    summary: dict[str, int] = {}

    with engine.connect() as conn:
        for table in Base.metadata.sorted_tables:
            table_name = table.name

            # Skip tables that don't actually exist yet in the DB
            if table_name not in inspector.get_table_names():
                logger.warning("⚠️  Table '%s' not found in DB – skipping backup.", table_name)
                continue

            rows = conn.execute(text(f'SELECT * FROM "{table_name}"')).mappings().all()
            serializable_rows = []

            for row in rows:
                clean = {}
                for k, v in dict(row).items():
                    if isinstance(v, datetime):
                        clean[k] = v.isoformat()
                    elif hasattr(v, "__str__") and not isinstance(v, (str, int, float, bool, type(None))):
                        # Handles UUID, Decimal, Enum, etc.
                        clean[k] = str(v)
                    else:
                        clean[k] = v
                serializable_rows.append(clean)

            file_path = backup_path / f"{table_name}.json"
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(serializable_rows, f, indent=2, ensure_ascii=False)

            summary[table_name] = len(serializable_rows)
            logger.info("💾 Backed up table '%s' → %d rows", table_name, len(serializable_rows))

    # Write manifest
    manifest = {
        "timestamp": timestamp,
        "database": POSTGRES_DB,
        "tables": summary,
        "total_tables": len(summary),
        "total_rows": sum(summary.values()),
    }
    with open(backup_path / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info("✅ Backup complete → %s  (%d tables, %d rows total)",
                backup_path, len(summary), sum(summary.values()))

    return {
        "backup_path": str(backup_path),
        "manifest": manifest,
    }


def init_db() -> None:
    """Initialize database on application startup."""
    create_db_tables()


# ── FastAPI dependency (synchronous) ───────────────────────────────────────────
def get_db():
    """Yield a database session (synchronous)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Async helper for Celery ────────────────────────────────────────────────────
async def get_async_db():
    """Yield an async database session (for Celery tasks)."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Export for Celery tasks
async_session = AsyncSessionLocal