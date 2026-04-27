#!/usr/bin/env python3
"""
auth_test.py

Authentication test script for Keycloak-based backend.
Tests: Login → Check Auth → Logout

API Structure:
  POST /auth/login  → { access_token, refresh_token, expires_in, token_type }
  GET  /auth/check  → { logged_in: bool, user: { sub, preferred_username, ... } }
  POST /auth/logout → { message: "Logged out successfully" }

Note: Roles are embedded in the JWT token (realm_access.roles), not in /auth/check
"""

import requests
import json
import logging
import sys
import base64
from typing import Dict, Optional, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = "http://localhost:8000"
API_PREFIX = "/"

TEST_USERS = [
    {"username": "testadmin", "password": "testadmin123", "expected_role": "admin"},
    {"username": "testmoderator", "password": "testmoderator123", "expected_role": "moderator"},
    {"username": "testtrainee", "password": "testtrainee123", "expected_role": "trainee"}
]


def decode_jwt_payload(token: str) -> Optional[Dict]:
    """Decode JWT payload without verification to extract roles"""
    try:
        # Split token and get payload (middle part)
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Add padding if needed
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        
        # Decode base64
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        logger.info(f"JWT decode error: {e}")
        return None


def extract_roles_from_jwt(token: str) -> List[str]:
    """Extract realm roles from Keycloak JWT token"""
    payload = decode_jwt_payload(token)
    if not payload:
        return []
    
    realm_access = payload.get("realm_access", {})
    if isinstance(realm_access, dict):
        return realm_access.get("roles", [])
    return []


class AuthAPIClient:
    """Authentication API Client for Keycloak-backed backend"""
    
    def __init__(self, base_url: str = BASE_URL, api_prefix: str = API_PREFIX):
        self.base_url = base_url.rstrip('/')
        self.api_prefix = api_prefix
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.decoded_token: Optional[Dict] = None
        self.session = requests.Session()
        
    def _get_url(self, endpoint: str) -> str:
        return f"{self.base_url}{self.api_prefix}{endpoint}"
    
    def _get_headers(self, auth: bool = True) -> Dict:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    def login(self, username: str, password: str) -> bool:
        """Authenticate and store tokens"""
        logger.info(f"\\n🔐 Login: {username}")
        
        url = self._get_url("auth/login")
        payload = {"username": username, "password": password}
        
        try:
            response = self.session.post(
                url, json=payload, headers=self._get_headers(auth=False)
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.refresh_token = data.get("refresh_token")
                
                # Decode JWT to extract roles (since /auth/check doesn't return them)
                self.decoded_token = decode_jwt_payload(self.access_token)
                roles = extract_roles_from_jwt(self.access_token)
                
                logger.info(f"✅ Login successful")
                logger.info(f"   Token type: {data.get('token_type', 'Bearer')}")
                logger.info(f"   Expires in: {data.get('expires_in')}s")
                logger.info(f"   Extracted roles from JWT: {roles}")
                
                return True
            else:
                logger.error(f"❌ Login failed: {response.status_code}")
                logger.error(f"   {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.error("❌ Connection error: Is backend running?")
            return False
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False
    
    def check_auth(self) -> Optional[Dict]:
        """
        Verify token and get user info.
        Note: This endpoint returns basic profile, NOT roles.
        Roles come from JWT (extracted during login).
        """
        if not self.access_token:
            logger.warning("⚠️  No access token")
            return None
        
        logger.info("\\n🔍 Checking auth status...")
        url = self._get_url("auth/check")
        
        try:
            response = self.session.get(url, headers=self._get_headers())
            
            if response.status_code == 200:
                data = response.json()
                
                # Check logged_in flag
                if not data.get("logged_in"):
                    logger.warning("⚠️  logged_in is false")
                    return None
                
                # Extract user from nested structure
                user = data.get("user", {})
                
                # Get roles from decoded JWT (not from this endpoint)
                jwt_roles = extract_roles_from_jwt(self.access_token)
                
                user_data = {
                    "sub": user.get("sub"),
                    "username": user.get("preferred_username"),
                    "email": user.get("email"),
                    "full_name": user.get("name"),
                    "first_name": user.get("given_name"),
                    "last_name": user.get("family_name"),
                    "email_verified": user.get("email_verified"),
                    "roles": jwt_roles  # From JWT, not from /auth/check
                }
                
                logger.info("✅ Auth check successful")
                logger.info(f"   User ID: {user_data['sub']}")
                logger.info(f"   Username: {user_data['username']}")
                logger.info(f"   Email: {user_data['email']}")
                logger.info(f"   Full Name: {user_data['full_name']}")
                logger.info(f"   Roles (from JWT): {user_data['roles']}")
                
                return user_data
                
            elif response.status_code == 401:
                logger.error("❌ Auth check failed: Token invalid/expired (401)")
                return None
            else:
                logger.error(f"❌ Auth check failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Auth check error: {e}")
            return None
    
    def logout(self) -> bool:
        """Logout and invalidate tokens"""
        if not self.access_token:
            logger.warning("⚠️  No token to logout")
            return False
        
        logger.info("\\n🚪 Logging out...")
        url = self._get_url("auth/logout")
        
        payload = {"refresh_token": self.refresh_token} if self.refresh_token else {}
        
        try:
            response = self.session.post(url, json=payload, headers=self._get_headers())
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Logout: {data.get('message')}")
                
                self.access_token = None
                self.refresh_token = None
                self.decoded_token = None
                return True
            else:
                logger.error(f"❌ Logout failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Logout error: {e}")
            return False


def test_auth_flow(user_config: Dict) -> bool:
    """Test complete flow: Login → Check Auth → Logout"""
    username = user_config["username"]
    password = user_config["password"]
    expected_role = user_config["expected_role"]
    
    logger.info("\\n" + "=" * 70)
    logger.info(f"🧪 Testing: {username} (Expected: {expected_role})")
    logger.info("=" * 70)
    
    client = AuthAPIClient()
    
    # Step 1: Login
    if not client.login(username, password):
        return False
    
    # Step 2: Check Auth
    user_data = client.check_auth()
    if not user_data:
        client.logout()
        return False
    
    # Validate role from JWT
    if expected_role not in user_data.get("roles", []):
        logger.warning(f"⚠️  Role '{expected_role}' not found in JWT roles: {user_data.get('roles')}")
    else:
        logger.info(f"✅ Role validation passed: {expected_role}")
    
    # Step 3: Logout
    if not client.logout():
        return False
    
    logger.info(f"\\n✅ Flow completed for {username}")
    return True


def main():
    logger.info("\\n🚀 Keycloak Auth Test Suite")
    logger.info("Flow: Login → Check Auth → Logout")
    logger.info("Note: Roles extracted from JWT (not /auth/check endpoint)")
    
    results = []
    
    for user in TEST_USERS:
        success = test_auth_flow(user)
        results.append({
            "username": user["username"],
            "success": success
        })
    
    logger.info("\\n" + "=" * 70)
    logger.info("📊 TEST SUMMARY")
    logger.info("=" * 70)
    
    for r in results:
        status = "✅ PASS" if r["success"] else "❌ FAIL"
        logger.info(f"{status} - {r['username']}")
    
    passed = sum(1 for r in results if r["success"])
    logger.info(f"\\nTotal: {passed}/{len(results)} passed")
    
    return passed == len(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)