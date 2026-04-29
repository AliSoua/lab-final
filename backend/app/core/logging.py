# backend/app/core/logging.py
"""
Structured logging utilities for the lab platform.

Provides contextual log binding so task_id, instance_id, and trainee_id
appear on every log line without manual formatting.
"""

import logging
import sys


class ContextFilter(logging.Filter):
    """
    Injects contextual fields into every LogRecord.
    Falls back to 'N/A' when context is not set.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        record.task_id = getattr(record, "task_id", "N/A")
        record.instance_id = getattr(record, "instance_id", "N/A")
        record.trainee_id = getattr(record, "trainee_id", "N/A")
        return True


def configure_logging() -> None:
    """
    Configure root logger with structured formatter and context filter.
    Call once at application startup (main.py or Celery worker init).
    """
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s "
        "task=%(task_id)s instance=%(instance_id)s trainee=%(trainee_id)s %(message)s"
    )
    handler.setFormatter(formatter)
    handler.addFilter(ContextFilter())

    root = logging.getLogger()
    # Avoid adding duplicate handlers if called multiple times
    if not root.handlers:
        root.addHandler(handler)
    root.setLevel(logging.INFO)


def log_task(
    logger: logging.Logger,
    *,
    task_id: str,
    instance_id: str,
    trainee_id: str,
) -> logging.LoggerAdapter:
    """
    Return a LoggerAdapter with task context bound.

    Usage:
        task_logger = log_task(logger, task_id="...", instance_id="...", trainee_id="...")
        task_logger.info("Something happened")  # context auto-injected
    """
    return logging.LoggerAdapter(
        logger,
        {
            "task_id": str(task_id),
            "instance_id": str(instance_id),
            "trainee_id": str(trainee_id),
        },
    )


def log_monitor_task(
    logger: logging.Logger,
    *,
    task_id: str,
    monitor_name: str = "monitor",
) -> logging.LoggerAdapter:
    """
    Return a LoggerAdapter for system-level monitoring tasks.

    Monitoring tasks don't target a specific instance/trainee.
    instance_id and trainee_id are set to the monitor name for traceability.

    Usage:
        task_logger = log_monitor_task(logger, task_id="...", monitor_name="session_timeout")
        task_logger.info("Scanning for expired instances")
    """
    return logging.LoggerAdapter(
        logger,
        {
            "task_id": str(task_id),
            "instance_id": f"monitor:{monitor_name}",
            "trainee_id": "system",
        },
    )