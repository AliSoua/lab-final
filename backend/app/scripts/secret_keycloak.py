# backend/app/scripts/secret_keycloak.py
from keycloak import KeycloakAdmin
from dotenv import load_dotenv
import os

load_dotenv()

KEYCLOAK_SERVER = os.getenv("KEYCLOAK_SERVER", "http://keycloak:8080")
ADMIN_USER = os.getenv("KEYCLOAK_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "admin")
REALM_NAME = "lab-orchestration"
CLIENT_ID = "lab-backend"

try:
    # Authenticate via master but access the target realm
    admin = KeycloakAdmin(
        server_url=KEYCLOAK_SERVER.rstrip("/") + "/",
        username=ADMIN_USER,
        password=ADMIN_PASSWORD,
        realm_name=REALM_NAME,        # Target realm
        user_realm_name="master",     # Authenticate via master
        verify=True
    )
    
    # Get client internal ID
    client_id_internal = admin.get_client_id(CLIENT_ID)
    
    if not client_id_internal:
        print(f"[ERROR] Client '{CLIENT_ID}' not found in realm '{REALM_NAME}'")
        exit(1)
    
    # Get client secret
    client_secret = admin.get_client_secrets(client_id_internal)
    secret_value = client_secret.get("value", "N/A")
    
    print("\n=== Keycloak Client Secret ===")
    print(f"Realm: {REALM_NAME}")
    print(f"Client ID: {CLIENT_ID}")
    print(f"Client Secret: {secret_value}")
    print("==============================\n")
    
except Exception as e:
    print(f"[ERROR] Failed to retrieve client secret: {e}")
    import traceback
    traceback.print_exc()
    exit(1)