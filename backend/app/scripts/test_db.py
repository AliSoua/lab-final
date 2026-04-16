import asyncio
from sqlalchemy import text

from app.config.connection.postgres_client import async_session

async def test_async():
    print("Testing async connection...")

    async with async_session() as session:
        result = await session.execute(text("SELECT 1"))
        print(f"✓ Async DB connected: {result.scalar()}")

        result = await session.execute(
            text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'lab_instances'
                )
            """)
        )
        print(f"✓ Lab instances table exists: {result.scalar()}")

if __name__ == "__main__":
    asyncio.run(test_async())