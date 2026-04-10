# app/config/connection/postgres_client.py
import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

logger = logging.getLogger(__name__)

# ── Read settings from environment ────────────────────────────────────────────
POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT     = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB       = os.getenv("POSTGRES_DB", "lab_platform")
POSTGRES_USER     = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")

DATABASE_URL = (
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# ── Engine & session factory ───────────────────────────────────────────────────
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # verify connections before use
    echo=False,           # set True to log all SQL statements
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ── Table helpers (called from the lifespan context manager) ───────────────────
def create_db_tables() -> None:
    """Create all tables registered on Base.metadata (if they don't exist)."""
    from app.db.base import Base  # local import avoids circular deps

    # Ensure every model module is imported so their metadata is registered
    import app.models.LabDefinition.core       # noqa: F401
    import app.models.LabDefinition.VMTemplate  # noqa: F401
    import app.models.LabDefinition.LabVM       # noqa: F401

    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created (or already exist).")


def drop_db_tables() -> None:
    """Drop all tables registered on Base.metadata."""
    from app.db.base import Base  # local import avoids circular deps

    import app.models.LabDefinition.core       # noqa: F401
    import app.models.LabDefinition.VMTemplate  # noqa: F401
    import app.models.LabDefinition.LabVM       # noqa: F401

    Base.metadata.drop_all(bind=engine)
    logger.warning("🗑️  Database tables dropped.")


def init_db() -> None:
    """
    Initialize database on application startup.
    
    By default: creates tables if they don't exist.
    
    To recreate fresh tables (WARNING: deletes all data):
    1. Uncomment drop_db_tables() below
    2. Restart application
    3. Re-comment drop_db_tables() to prevent accidental data loss on next restart
    """
    # ──── FRESH START OPTION ────
    # ⚠️  WARNING: Uncommenting the next line will DELETE ALL DATA
    #drop_db_tables()
    # ─────────────────────────────
    
    create_db_tables()


# ── FastAPI dependency ─────────────────────────────────────────────────────────
def get_db():
    """Yield a database session; always closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()