# app/scripts/setup_keycloak.py
from keycloak import KeycloakAdmin
from keycloak.exceptions import KeycloakConnectionError, KeycloakGetError
from dotenv import load_dotenv
import os
import sys

load_dotenv()

KEYCLOAK_SERVER = os.getenv("KEYCLOAK_SERVER", "http://localhost:8080")
ADMIN_USER = os.getenv("KEYCLOAK_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "admin")

REALM_NAME = "lab-orchestration"
CLIENT_ID = "lab-backend"
ROLES = ["admin", "moderator", "trainee"]

summary = {
    "connected": False,
    "realm_created": False,
    "client_created": False,
    "roles_created": {},
    "users_created": {},
    "roles_assigned": {}
}

# 1️⃣ Connect to Keycloak Master Realm
try:
    master_admin = KeycloakAdmin(
        server_url=KEYCLOAK_SERVER.rstrip("/") + "/",
        username=ADMIN_USER,
        password=ADMIN_PASSWORD,
        realm_name="master",
        verify=True
    )
    summary["connected"] = True
    print(f"[INFO] Connected to Keycloak at {KEYCLOAK_SERVER}")
except KeycloakConnectionError as e:
    print(f"[ERROR] Cannot connect to Keycloak: {e}")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Unexpected error during Keycloak connection: {e}")
    sys.exit(1)

# 2️⃣ Create realm
try:
    master_admin.create_realm({"realm": REALM_NAME, "enabled": True}, skip_exists=True)
    summary["realm_created"] = True
    print(f"[INFO] Realm '{REALM_NAME}' created or already existed.")
except KeycloakGetError as e:
    print(f"[ERROR] Failed to create realm: {e}")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Unexpected error creating realm: {e}")
    sys.exit(1)

# 3️⃣ Authenticate to target realm
try:
    realm_admin = KeycloakAdmin(
        server_url=KEYCLOAK_SERVER.rstrip("/") + "/",
        username=ADMIN_USER,
        password=ADMIN_PASSWORD,
        realm_name=REALM_NAME,
        user_realm_name="master",  # authenticate via master
        verify=True
    )
    print(f"[INFO] Authenticated to realm '{REALM_NAME}'")
except Exception as e:
    print(f"[ERROR] Failed to authenticate to realm '{REALM_NAME}': {e}")
    sys.exit(1)

# 4️⃣ Create client
try:
    realm_admin.create_client(
        {
            "clientId": CLIENT_ID,
            "enabled": True,
            "directAccessGrantsEnabled": True,
            "standardFlowEnabled": True,
            "publicClient": False,
        },
        skip_exists=True
    )
    summary["client_created"] = True
    print(f"[INFO] Client '{CLIENT_ID}' created or already existed.")
except KeycloakGetError as e:
    if e.response_code == 409:
        summary["client_created"] = True
        print(f"[INFO] Client '{CLIENT_ID}' already exists.")
    else:
        print(f"[ERROR] Failed to create client: {e}")
except Exception as e:
    print(f"[ERROR] Unexpected error creating client: {e}")

# 5️⃣ Create roles
for role in ROLES:
    try:
        realm_admin.create_realm_role({"name": role}, skip_exists=True)
        summary["roles_created"][role] = "created or already existed"
        print(f"[INFO] Role '{role}' created or already existed.")
    except KeycloakGetError as e:
        if e.response_code == 409:
            summary["roles_created"][role] = "already exists"
            print(f"[INFO] Role '{role}' already exists.")
        else:
            summary["roles_created"][role] = f"error: {e}"
            print(f"[ERROR] Failed to create role '{role}': {e}")
    except Exception as e:
        summary["roles_created"][role] = f"error: {e}"
        print(f"[ERROR] Unexpected error creating role '{role}': {e}")

# 6️⃣ Create users and assign roles
USERS = [
    {"username": "testadmin", "email": "testadmin@local.test", "firstName": "Test", "lastName": "Admin", "password": "testadmin123", "role": "admin"},
    {"username": "testmoderator", "email": "testmoderator@local.test", "firstName": "Test", "lastName": "Moderator", "password": "testmoderator123", "role": "moderator"},
    {"username": "testtrainee", "email": "testtrainee@local.test", "firstName": "Test", "lastName": "Trainee", "password": "testtrainee123", "role": "trainee"},
]

for user in USERS:
    username = user["username"]
    try:
        # Check if user exists
        existing_user_id = realm_admin.get_user_id(username)
        if existing_user_id:
            user_id = existing_user_id
            summary["users_created"][username] = "already exists"
            print(f"[INFO] User '{username}' already exists.")
        else:
            # Create user
            user_id = realm_admin.create_user(
                {
                    "username": username,
                    "email": user["email"],
                    "firstName": user["firstName"],
                    "lastName": user["lastName"],
                    "enabled": True,
                    "emailVerified": True,
                }
            )
            # Set password
            realm_admin.set_user_password(user_id=user_id, password=user["password"], temporary=False)
            summary["users_created"][username] = "created"
            print(f"[INFO] User '{username}' created.")

        # Assign realm role
        role_obj = realm_admin.get_realm_role(user["role"])
        realm_admin.assign_realm_roles(user_id, [role_obj])
        summary["roles_assigned"][username] = user["role"]
        print(f"[INFO] Assigned role '{user['role']}' to '{username}'.")
    except Exception as e:
        summary["users_created"][username] = f"error: {e}"
        print(f"[ERROR] Failed to create/assign role for user '{username}': {e}")

# 7️⃣ Print summary
print("\n=== Keycloak Setup Summary ===")
print(f"Connected: {summary['connected']}")
print(f"Realm created: {summary['realm_created']}")
print(f"Client created: {summary['client_created']}")
print("Roles status:")
for role, status in summary["roles_created"].items():
    print(f"  - {role}: {status}")
print("Users status:")
for username, status in summary["users_created"].items():
    print(f"  - {username}: {status}")
print("Roles assigned:")
for username, role in summary["roles_assigned"].items():
    print(f"  - {username}: {role}")