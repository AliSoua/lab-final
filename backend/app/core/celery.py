# app/core/celery.py
"""
Celery Application Entry Point
===============================

This module exports the Celery app for worker startup.
It uses the connection client singleton to ensure consistent
configuration across the application.
"""

from app.config.connection.celery_client import celery_client

# Export the Celery app for worker commands
celery_app = celery_client.get_app()

# Also export for imports
__all__ = ["celery_app"]