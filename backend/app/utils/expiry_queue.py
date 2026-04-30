# backend/app/utils/expiry_queue.py
"""
Expiry queue backed by Redis Sorted Set.

On instance launch:   zadd(lab_instance_expiry, expires_at_timestamp, instance_id)
On enforcer run:      zrangebyscore(lab_instance_expiry, -inf, now) → pop & terminate
"""

import logging
from datetime import datetime, timezone
from typing import List
from uuid import UUID

import redis
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Re-use the same Redis instance Celery uses (broker)
_redis_client: redis.Redis | None = None

KEY = "lab_instance_expiry"


def _get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.CELERY_BROKER_URL,
            decode_responses=True,
        )
    return _redis_client


def _ensure_aware(dt: datetime) -> datetime:
    """
    Ensure a datetime is timezone-aware (UTC).
    Naive datetimes are treated as UTC.
    Aware datetimes are converted to UTC.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def register_instance_expiry(instance_id: UUID | str, expires_at: datetime) -> None:
    """
    Register an instance expiry in the Redis ZSET.
    MUST be called after the instance row is committed and expires_at is known.
    """
    r = _get_redis()
    aware_dt = _ensure_aware(expires_at)
    score = aware_dt.timestamp()
    r.zadd(KEY, {str(instance_id): score})
    logger.debug(
        "Registered expiry | instance=%s expires_at=%s score=%s",
        instance_id,
        aware_dt.isoformat(),
        score,
    )


def remove_instance_expiry(instance_id: UUID | str) -> None:
    """
    Remove an instance from the expiry queue.
    Call on manual termination or deletion to prevent enforcer races.
    """
    r = _get_redis()
    r.zrem(KEY, str(instance_id))
    logger.debug("Removed expiry | instance=%s", instance_id)


def pop_expired_instances(batch_size: int = 100) -> List[str]:
    """
    Atomically fetch and remove up to `batch_size` expired instance IDs.
    Uses a Lua script for atomicity across multiple workers.

    Returns:
        List of instance_id strings. Empty list if nothing expired.
    """
    r = _get_redis()
    now = datetime.now(timezone.utc).timestamp()

    lua = """
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])

    local items = redis.call('ZRANGEBYSCORE', key, '-inf', now, 'LIMIT', 0, limit)
    if #items > 0 then
        redis.call('ZREM', key, unpack(items))
    end
    return items
    """
    result = r.eval(lua, 1, KEY, now, batch_size)
    return result if result else []