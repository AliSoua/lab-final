# app/config/connection/postgres_client.py
import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
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
# Note: Uses asyncpg driver
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

# ── Table helpers ──────────────────────────────────────────────────────────────
def create_db_tables() -> None:
    """Create all tables (synchronous)."""
    from app.db.base import Base
    
    # LabDefinition models
    import app.models.LabDefinition.core
    import app.models.LabDefinition.VMTemplate
    import app.models.LabDefinition.LabVM
    import app.models.LabDefinition.LabGuideBlock
    
    # LabInstance models - ADD THESE
    import app.models.LabInstance.core
    import app.models.LabInstance.LabInstanceVM
    import app.models.LabInstance.LabInstanceEvent
    
    # User model (if exists)
    import app.models.user

    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created (or already exist).")


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


# ── Async helper for Celery (NEW) ──────────────────────────────────────────────
async def get_async_db():
    """Yield an async database session (for Celery tasks)."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Export for Celery tasks
async_session = AsyncSessionLocal