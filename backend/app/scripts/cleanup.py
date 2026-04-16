# cleanup.py - Delete stale instances
import asyncio
from app.config.connection.postgres_client import async_session
from app.models.LabInstance import LabInstance, LabInstanceEvent
from sqlalchemy import delete

async def cleanup():
    async with async_session() as db:
        # Delete events first (FK constraint)
        await db.execute(delete(LabInstanceEvent))
        # Delete instances
        await db.execute(delete(LabInstance))
        await db.commit()
        print("✓ All lab instances cleaned up")

asyncio.run(cleanup())