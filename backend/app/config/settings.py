from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

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
    VAULT_TOKEN: str = "root"

    # Guacamole
    GUACAMOLE_CLIENT_ID: str = "guacamole"
    GUACAMOLE_PUBLIC_URL: str = "http://localhost:8081/guacamole"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

settings = Settings()