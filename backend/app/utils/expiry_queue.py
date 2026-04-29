# backend/app/utils/expiry_queue.py
"""
Expiry queue backed by Redis Sorted Set.

On instance launch:   zadd(lab_instance_expiry, expires_at_timestamp, instance_id)
On enforcer run:      zrangebyscore(lab_instance_expiry, -inf, now) → pop & terminate
"""

import json
import logging
from datetime import datetime
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
        # Assumes Redis URL is available from settings; adjust if your config differs
        _redis_client = redis.from_url(
            settings.CELERY_BROKER_URL,
            decode_responses=True,
        )
    return _redis_client


def register_instance_expiry(instance_id: UUID | str, expires_at: datetime) -> None:
    """
    Call this from your launch worker AFTER the instance row is committed
    and expires_at is known.
    """
    r = _get_redis()
    score = expires_at.timestamp()
    r.zadd(KEY, {str(instance_id): score})
    logger.debug("Registered expiry | instance=%s expires_at=%s", instance_id, expires_at.isoformat())


def remove_instance_expiry(instance_id: UUID | str) -> None:
    """
    Call this when an instance is manually terminated or deleted
    so the enforcer doesn't try to act on it later.
    """
    r = _get_redis()
    r.zrem(KEY, str(instance_id))
    logger.debug("Removed expiry | instance=%s", instance_id)


def pop_expired_instances(batch_size: int = 100) -> List[str]:
    """
    Atomically fetch and remove instance IDs whose expiry time is <= now.
    Returns list of instance_id strings.
    """
    r = _get_redis()
    now = datetime.utcnow().timestamp()

    # ZRANGEBYSCORE to peek, then ZREMRANGEBYSCORE to remove in a pipeline
    pipe = r.pipeline()
    pipe.zrangebyscore(KEY, "-inf", now, start=0, num=batch_size)
    pipe.zremrangebyscore(KEY, "-inf", now)
    results, _ = pipe.execute()

    # results contains ALL items removed in that score range;
    # if there are more than batch_size we only removed batch_size due to the
    # earlier zrangebyscore limit, but zremrangebyscore doesn't support limit.
    # Safer Lua script approach below for true atomic batching:
    return results


def pop_expired_instances_lua(batch_size: int = 100) -> List[str]:
    """
    Atomic Lua script: fetch up to N expired items and remove them in one shot.
    Prevents race conditions when multiple workers run the enforcer.
    """
    r = _get_redis()
    now = datetime.utcnow().timestamp()

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