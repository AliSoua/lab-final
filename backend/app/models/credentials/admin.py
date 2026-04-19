# app/models/credentials/admin.py
from dataclasses import dataclass


@dataclass
class AdminVCenterCredentials:
    user_id: str
    vcenter_host: str = ""
    username: str = ""