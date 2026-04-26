from pydantic_settings import BaseSettings
import socket

def get_host_ip():
    """Obtient l'IP de la machine physique (pas localhost ou 127.x.x.x)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("[IP_ADDRESS]", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        import logging
        logging.warning("Impossible de récupérer l'IP hôte, utilisation de localhost")
        return "localhost"

class Settings(BaseSettings):

    # Host IP
    HOST_IP: str = get_host_ip()

    # Celery
    CELERY_BROKER_URL: str = f"redis://{HOST_IP}:6379/0"
    CELERY_RESULT_BACKEND: str = f"redis://{HOST_IP}:6379/0"

    # PostgreSQL
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "lab_platform"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"

    # Keycloak
    KEYCLOAK_SERVER: str = "http://keycloak:8080"
    KEYCLOAK_REALM: str = "lab-orchestration"
    KEYCLOAK_CLIENT_ID: str = "lab-backend"
    KEYCLOAK_CLIENT_SECRET: str = ""
    KEYCLOAK_ADMIN_USER: str = "admin"
    KEYCLOAK_ADMIN_PASSWORD: str = "admin"

    # Vault
    VAULT_ADDR: str = "http://vault:8200"

    # Guacamole
    GUACAMOLE_CLIENT_ID: str = "guacamole"
    GUACAMOLE_PUBLIC_URL: str = f"http://{HOST_IP}:8081/guacamole"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

settings = Settings()