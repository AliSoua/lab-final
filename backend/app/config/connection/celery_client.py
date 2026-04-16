# app/config/connection/celery_client.py
"""
Celery Connection Client
========================

Centralized Celery broker connection management following the platform's
connection client pattern.

This client provides:
- Singleton Celery application instance
- Connection pooling to Redis broker
- Health check capabilities
- Graceful shutdown handling

USAGE:
    from app.config.connection.celery_client import celery_client
    
    # Access the Celery app
    app = celery_client.get_app()
    
    # Send a task
    celery_client.send_task(
        "app.tasks.LabInstance.provisioning.provision_lab_instance",
        args=[instance_id]
    )
    
    # Health check
    is_healthy = await celery_client.health_check()
"""

import os
import logging
from typing import Optional, Any, Dict
from contextlib import asynccontextmanager

from celery import Celery
from celery.result import AsyncResult
from celery.schedules import crontab

logger = logging.getLogger(__name__)


class CeleryClient:
    """
    Singleton client for Celery broker connections.
    
    Manages the Celery application lifecycle and provides
    convenient methods for task execution and monitoring.
    """
    
    _instance: Optional["CeleryClient"] = None
    _celery_app: Optional[Celery] = None
    
    def __new__(cls) -> "CeleryClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self._broker_url = os.getenv(
            "CELERY_BROKER_URL", 
            "redis://localhost:6379/0"
        )
        self._backend_url = os.getenv(
            "CELERY_RESULT_BACKEND", 
            "redis://localhost:6379/0"
        )
        self._initialized = True
    
    def get_app(self) -> Celery:
        """
        Get or create the Celery application instance.
        
        Returns:
            Configured Celery application
        """
        if self._celery_app is None:
            self._celery_app = self._create_app()
        return self._celery_app
    
    def _create_app(self) -> Celery:
        """
        Create and configure the Celery application.
        
        Returns:
            Configured Celery app
        """
        app = Celery(
            "platform_lab_tasks",
            broker=self._broker_url,
            backend=self._backend_url,
            include=[
                "app.tasks.LabInstance.provisioning",
                "app.tasks.LabInstance.cleanup",
                "app.tasks.LabInstance.monitoring",
            ]
        )
        
        # Configuration
        app.conf.update(
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
            task_track_started=True,
            task_time_limit=3600,
            task_soft_time_limit=3300,
            worker_prefetch_multiplier=1,
            worker_max_tasks_per_child=100,
            result_expires=86400,
            timezone="UTC",
            enable_utc=True,
            
            # Task routing
            task_routes={
                "app.tasks.LabInstance.provisioning.*": {"queue": "lab.provisioning"},
                "app.tasks.LabInstance.cleanup.*": {"queue": "lab.cleanup"},
                "app.tasks.LabInstance.monitoring.*": {"queue": "lab.monitoring"},
            },
            
            # Beat schedule (periodic tasks)
            beat_schedule={
                "check-expiring-instances": {
                    "task": "app.tasks.LabInstance.monitoring.check_expiring_instances",
                    "schedule": 60.0,
                },
                "check-inactive-instances": {
                    "task": "app.tasks.LabInstance.monitoring.check_inactive_instances",
                    "schedule": 300.0,
                },
                "collect-system-metrics": {
                    "task": "app.tasks.LabInstance.monitoring.collect_system_metrics",
                    "schedule": 30.0,
                },
                "archive-old-instances": {
                    "task": "app.tasks.LabInstance.cleanup.archive_old_instances",
                    "schedule": crontab(hour=2, minute=0),
                },
            },
        )
        
        logger.info(f"Celery app initialized with broker: {self._broker_url}")
        return app
    
    def send_task(
        self,
        task_name: str,
        args: Optional[tuple] = None,
        kwargs: Optional[Dict[str, Any]] = None,
        countdown: Optional[int] = None,
        queue: Optional[str] = None,
        priority: Optional[int] = None
    ) -> AsyncResult:
        """
        Send a task to Celery for execution.
        
        Args:
            task_name: Full dotted path to the task function
            args: Positional arguments for the task
            kwargs: Keyword arguments for the task
            countdown: Delay execution by N seconds
            queue: Specific queue to send to (optional)
            priority: Task priority (0-9, lower is higher priority)
            
        Returns:
            AsyncResult object for tracking task status
        """
        app = self.get_app()
        
        options = {}
        if countdown:
            options["countdown"] = countdown
        if queue:
            options["queue"] = queue
        if priority:
            options["priority"] = priority
            
        return app.send_task(
            task_name,
            args=args,
            kwargs=kwargs,
            **options
        )
    
    def delay_task(
        self,
        task_name: str,
        *args,
        **kwargs
    ) -> AsyncResult:
        """
        Convenience method to delay a task (immediate execution).
        
        Args:
            task_name: Full dotted path to the task
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            AsyncResult object
        """
        return self.send_task(task_name, args=args, kwargs=kwargs)
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the status of a previously submitted task.
        
        Args:
            task_id: The Celery task ID
            
        Returns:
            Dict with status, result, and traceback info
        """
        app = self.get_app()
        result = AsyncResult(task_id, app=app)
        
        return {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
            "date_done": result.date_done.isoformat() if result.date_done else None,
            "successful": result.successful() if result.ready() else None,
        }
    
    async def health_check(self) -> bool:
        """
        Check if the Celery broker is reachable.
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            app = self.get_app()
            # Try to ping the broker
            with app.connection() as conn:
                conn.ensure_connection(max_retries=1)
                return True
        except Exception as e:
            logger.error(f"Celery health check failed: {e}")
            return False
    
    def get_inspector(self):
        """
        Get Celery inspector for monitoring workers and queues.
        
        Returns:
            Celery inspector instance
        """
        app = self.get_app()
        return app.control.inspect()
    
    def purge_queues(self) -> int:
        """
        Purge all task queues (emergency use only).
        
        Returns:
            Number of tasks purged
        """
        app = self.get_app()
        return app.control.purge()
    
    def shutdown(self) -> None:
        """Graceful shutdown - close connections."""
        if self._celery_app:
            # Close broker connection
            self._celery_app.close()
            logger.info("Celery connections closed")


# Global singleton instance
celery_client = CeleryClient()


# Convenience function for imports
def get_celery_app() -> Celery:
    """
    Get the configured Celery application.
    
    Returns:
        Celery application instance
    """
    return celery_client.get_app()