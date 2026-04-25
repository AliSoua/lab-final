# backend/app/utils/db_session.py
from contextlib import contextmanager
from typing import Generator

from sqlalchemy.orm import Session
from app.config.connection.postgres_client import SessionLocal


@contextmanager
def background_session() -> Generator[Session, None, None]:
    """
    Yield a synchronous SQLAlchemy Session for background/Celery work.

    - Opens a new Session from the global SessionLocal.
    - Rolls back on any exception (so the worker doesn't leave a
      dangling transaction).
    - Always closes on exit (so the connection is returned to the pool).
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()