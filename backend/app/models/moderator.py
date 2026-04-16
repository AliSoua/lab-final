# app/models/moderator.py
from dataclasses import dataclass

@dataclass
class Moderator:
    user_id: str
    esxi_host: str = ""
    username: str = ""
    password: str = ""