# app/routers/database/db-admin.py
"""
DB Admin router for database management utilities.
No authentication required — restrict access at the network/proxy level in production.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.connection.postgres_client import (
    get_db,
    drop_db_tables,
    sync_db_tables,
    backup_db_tables,
)   

router = APIRouter(
    prefix="/db-admin",
    tags=["DB Admin"],
    responses={
        500: {"description": "Internal server error during database operation"},
    },
)


@router.post(
    "/drop",
    summary="Drop all tables",
    description="Drops every application table from the database. All data will be permanently lost.",
)
def drop_tables(db: Session = Depends(get_db)):
    """
    Drop all SQLAlchemy-managed tables from the database.
    Tables are dropped in dependency-safe reverse order to avoid FK constraint errors.
    """
    try:
        result = drop_db_tables()
        return {
            "status": "success",
            "message": f"Dropped {len(result['dropped_tables'])} table(s) successfully.",
            **result,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to drop tables: {str(exc)}",
        )


@router.post(
    "/sync",
    summary="Sync all tables",
    description="Drops all tables then recreates them from current SQLAlchemy models. All existing data will be lost.",
)
def sync_tables(db: Session = Depends(get_db)):
    """
    Perform a full schema reset: drop all tables, then recreate from current models.
    Useful during development to apply model changes without running migrations.
    """
    try:
        result = sync_db_tables()
        return {
            "status": "success",
            "message": (
                f"Synced successfully — dropped {len(result['dropped_tables'])} table(s), "
                f"recreated {len(result['created_tables'])} table(s)."
            ),
            **result,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync tables: {str(exc)}",
        )


@router.post(
    "/backup",
    summary="Backup all table data",
    description=(
        "Exports every table's rows to JSON files inside the `backup-db/` directory. "
        "A timestamped subdirectory is created on each call so backups never overwrite each other."
    ),
)
def backup_tables(
    db: Session = Depends(get_db),
    backup_dir: str = Query(
        default="backup-db",
        description="Root directory for backup files (relative to the project root).",
    ),
):
    """
    Dump all table rows to JSON files under backup-db/<timestamp>/.
    A manifest.json is written alongside the table files summarising the backup run.
    Handles UUID, Decimal, Enum, and datetime column types automatically.
    """
    try:
        result = backup_db_tables(backup_dir=backup_dir)
        manifest = result["manifest"]
        return {
            "status": "success",
            "message": (
                f"Backup complete — {manifest['total_tables']} table(s), "
                f"{manifest['total_rows']} row(s) saved to '{result['backup_path']}'."
            ),
            **result,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to backup tables: {str(exc)}",
        )