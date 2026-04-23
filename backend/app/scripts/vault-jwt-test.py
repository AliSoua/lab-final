#!/usr/bin/env python3
"""
vault-jwt-test.py

Tests Vault JWT/OIDC auth with Keycloak tokens obtained through the lab backend.
Validates that each role (trainee, moderator, admin) gets the correct Vault policy.
"""

import requests
import json
import logging
import sys
import base64
from typing import Dict, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Configuration
BACKEND_URL = "http://localhost:8000"
VAULT_URL = "http://localhost:8200"
API_PREFIX = "/"

# Test users
USERS = [
    {"username": "testadmin", "password": "testadmin123", "expected_role": "lab-admin", "expected_policy": "lab-admin"},
    {"username": "testmoderator", "password": "testmoderator123", "expected_role": "lab-moderator", "expected_policy": "lab-moderator"},
    {"username": "testtrainee", "password": "testtrainee123", "expected_role": "lab-trainee", "expected_policy": "lab-trainee"},
]


class VaultJWTTester:
    def __init__(self):
        self.backend_url = BACKEND_URL.rstrip('/')
        self.vault_url = VAULT_URL.rstrip('/')
        self.api_prefix = API_PREFIX
        self.session = requests.Session()

    def _backend_url(self, endpoint: str) -> str:
        return f"{self.backend_url}{self.api_prefix}{endpoint}"

    def _vault_url(self, path: str) -> str:
        return f"{self.vault_url}/v1{path}"

    def login_backend(self, username: str, password: str) -> Optional[str]:
        """Login to backend and return Keycloak access token."""
        logger.info(f"\n{'='*50}")
        logger.info(f"Testing user: {username}")
        logger.info(f"{'='*50}")
        
        url = self._backend_url("/auth/login")
        payload = {"username": username, "password": password}
        
        try:
            resp = self.session.post(url, json=payload, headers={"Content-Type": "application/json"})
            if resp.status_code != 200:
                logger.error(f"  Backend login failed: {resp.status_code}")
                logger.error(f"  {resp.text}")
                return None
            
            data = resp.json()
            access_token = data.get("access_token")
            if not access_token:
                logger.error("  No access_token in response")
                return None
            
            logger.info(f"  Backend login OK")
            logger.info(f"  Access token: {access_token[:40]}...")
            return access_token
            
        except Exception as e:
            logger.error(f"  Backend login error: {e}")
            return None

    def decode_token(self, token: str) -> Optional[Dict]:
        """Decode JWT payload without verification (for inspection)."""
        try:
            parts = token.split('.')
            if len(parts) != 3:
                return None
            payload = parts[1]
            # Add padding if needed
            padding = 4 - len(payload) % 4
            if padding != 4:
                payload += '=' * padding
            decoded = base64.urlsafe_b64decode(payload)
            return json.loads(decoded)
        except Exception as e:
            logger.error(f"  Token decode error: {e}")
            return None

    def inspect_token(self, token: str) -> None:
        """Log token claims for debugging."""
        claims = self.decode_token(token)
        if not claims:
            logger.warning("  Could not decode token")
            return
        
        logger.info("  Token claims:")
        logger.info(f"    sub: {claims.get('sub')}")
        logger.info(f"    aud: {claims.get('aud')}")
        logger.info(f"    iss: {claims.get('iss')}")
        logger.info(f"    preferred_username: {claims.get('preferred_username')}")
        
        realm_access = claims.get('realm_access', {})
        roles = realm_access.get('roles', [])
        logger.info(f"    realm_access.roles: {roles}")

    def vault_jwt_login(self, token: str, role: str) -> Optional[Dict]:
        """Login to Vault using JWT auth method."""
        logger.info(f"  Attempting Vault login with role: {role}")
        
        url = self._vault_url("/auth/jwt/login")
        payload = {"jwt": token, "role": role}
        
        try:
            resp = self.session.post(url, json=payload)
            if resp.status_code != 200:
                logger.error(f"  Vault JWT login failed: {resp.status_code}")
                try:
                    err = resp.json()
                    logger.error(f"  Error: {err.get('errors', resp.text)}")
                except:
                    logger.error(f"  Response: {resp.text}")
                return None
            
            data = resp.json()
            auth = data.get('auth', {})
            client_token = auth.get('client_token')
            policies = auth.get('policies', [])
            token_ttl = auth.get('lease_duration')
            
            logger.info(f"  Vault login OK")
            logger.info(f"    Vault token: {client_token[:20]}..." if client_token else "    No token!")
            logger.info(f"    Policies: {policies}")
            logger.info(f"    TTL: {token_ttl}s")
            
            return {
                "client_token": client_token,
                "policies": policies,
                "ttl": token_ttl
            }
            
        except Exception as e:
            logger.error(f"  Vault login error: {e}")
            return None

    def _log_response_body(self, resp: requests.Response, label: str) -> None:
        """Log response body for debugging unexpected status codes."""
        try:
            body = resp.json()
            logger.error(f"    {label} body: {json.dumps(body, indent=2)}")
        except json.JSONDecodeError:
            logger.error(f"    {label} body: {resp.text[:500]}")

    def test_vault_access(self, vault_token: str, expected_policy: str) -> Tuple[bool, list]:
        """Test what the Vault token can actually access."""
        logger.info(f"  Testing Vault access with expected policy: {expected_policy}")
        
        headers = {"X-Vault-Token": vault_token}
        results = []
        all_passed = True
        
        # Test 1: Read own token info
        try:
            resp = self.session.get(self._vault_url("/auth/token/lookup-self"), headers=headers)
            if resp.status_code == 200:
                data = resp.json().get('data', {})
                logger.info(f"    Token lookup: OK (policies: {data.get('policies')})")
                results.append(("token_lookup", True))
            else:
                logger.error(f"    Token lookup: FAILED ({resp.status_code})")
                self._log_response_body(resp, "Token lookup")
                results.append(("token_lookup", False))
                all_passed = False
        except Exception as e:
            logger.error(f"    Token lookup: ERROR ({e})")
            results.append(("token_lookup", False))
            all_passed = False
        
        # Test 2: Try to read from secret/data/credentials/lab_connections/ (all roles should read)
        try:
            resp = self.session.get(
                self._vault_url("/secret/data/credentials/lab_connections/test"),
                headers=headers
            )
            # 404 means key doesn't exist but mount and path are valid; 403 means denied
            if resp.status_code in [200, 404]:
                logger.info(f"    Read lab_connections: OK (status: {resp.status_code})")
                results.append(("read_lab_connections", True))
            else:
                logger.error(f"    Read lab_connections: FAILED ({resp.status_code})")
                self._log_response_body(resp, "Read lab_connections")
                results.append(("read_lab_connections", False))
                all_passed = False
        except Exception as e:
            logger.error(f"    Read lab_connections: ERROR ({e})")
            results.append(("read_lab_connections", False))
            all_passed = False
        
        # Test 3: Try to write to secret/data/credentials/lab_connections/ (only moderator/admin)
        try:
            resp = self.session.post(
                self._vault_url("/secret/data/credentials/lab_connections/test"),
                headers={**headers, "Content-Type": "application/json"},
                json={"data": {"test": "value"}}
            )
            if resp.status_code == 200:
                logger.info(f"    Write lab_connections: OK")
                results.append(("write_lab_connections", True))
            elif resp.status_code == 403:
                logger.info(f"    Write lab_connections: DENIED (expected for trainee)")
                results.append(("write_lab_connections", False))
                if expected_policy != "lab-trainee":
                    all_passed = False
            elif resp.status_code == 404:
                # 404 on write means the mount/path doesn't exist (KV v2 not enabled)
                logger.error(f"    Write lab_connections: FAILED (404 - KV v2 mount missing?)")
                self._log_response_body(resp, "Write lab_connections")
                results.append(("write_lab_connections", False))
                all_passed = False
            else:
                logger.error(f"    Write lab_connections: FAILED ({resp.status_code})")
                self._log_response_body(resp, "Write lab_connections")
                results.append(("write_lab_connections", False))
                all_passed = False
        except Exception as e:
            logger.error(f"    Write lab_connections: ERROR ({e})")
            results.append(("write_lab_connections", False))
            all_passed = False
        
        # Test 4: Try to access secret/* (only admin)
        try:
            resp = self.session.get(
                self._vault_url("/secret/data/admin-only-test"),
                headers=headers
            )
            if resp.status_code in [200, 404]:
                logger.info(f"    Read secret/*: OK")
                results.append(("read_secret_all", True))
            elif resp.status_code == 403:
                logger.info(f"    Read secret/*: DENIED (expected for non-admin)")
                results.append(("read_secret_all", False))
                if expected_policy == "lab-admin":
                    all_passed = False
            else:
                logger.error(f"    Read secret/*: FAILED ({resp.status_code})")
                self._log_response_body(resp, "Read secret/*")
                results.append(("read_secret_all", False))
                all_passed = False
        except Exception as e:
            logger.error(f"    Read secret/*: ERROR ({e})")
            results.append(("read_secret_all", False))
            all_passed = False
        
        return all_passed, results

    def run_test(self, user: Dict) -> bool:
        """Run full test for a single user."""
        username = user["username"]
        password = user["password"]
        expected_role = user["expected_role"]
        expected_policy = user["expected_policy"]
        
        # Step 1: Login to backend
        access_token = self.login_backend(username, password)
        if not access_token:
            return False
        
        # Step 2: Inspect token
        self.inspect_token(access_token)
        
        # Step 3: Login to Vault via JWT
        vault_auth = self.vault_jwt_login(access_token, expected_role)
        if not vault_auth:
            return False
        
        # Step 4: Verify policies match
        policies = vault_auth.get("policies", [])
        if expected_policy not in policies:
            logger.error(f"  Policy mismatch! Expected {expected_policy}, got {policies}")
            return False
        
        # Step 5: Test actual Vault access
        passed, results = self.test_vault_access(vault_auth["client_token"], expected_policy)
        
        status = "PASSED" if passed else "FAILED"
        logger.info(f"  Overall: {status}")
        return passed

    def run_all(self) -> None:
        """Run tests for all users."""
        logger.info(f"\n{'#'*60}")
        logger.info("# VAULT JWT AUTH TEST")
        logger.info(f"{'#'*60}")
        logger.info(f"Backend: {BACKEND_URL}")
        logger.info(f"Vault:   {VAULT_URL}")
        
        results = {}
        for user in USERS:
            results[user["username"]] = self.run_test(user)
        
        # Summary
        logger.info(f"\n{'='*60}")
        logger.info("SUMMARY")
        logger.info(f"{'='*60}")
        for username, passed in results.items():
            status = "PASS" if passed else "FAIL"
            logger.info(f"  {username}: {status}")
        
        all_passed = all(results.values())
        logger.info(f"\nOverall: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
        sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    tester = VaultJWTTester()
    tester.run_all()