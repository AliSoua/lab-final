# app/models/moderator.py
from dataclasses import dataclass

@dataclass
class ModeratorCredentials:
    user_id: str
    esxi_host: str = ""
    username: str = ""