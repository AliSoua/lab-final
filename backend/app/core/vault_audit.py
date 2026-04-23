# app/core/vault_audit.py
import json
import logging

audit_logger = logging.getLogger("vault.audit")


def audit_log(action: str, actor: str, target: str, success: bool, detail: str = "") -> None:
    """Emit a structured audit log entry for Vault operations."""
    audit_logger.info(
        json.dumps({
            "action": action,
            "actor": actor,
            "target": target,
            "success": success,
            "detail": detail,
        })
    )