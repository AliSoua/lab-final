#!/usr/bin/env python3
"""
auth_refresh_test.py

Token Refresh & Expiry Test for Keycloak.
Tests timing: Login → Wait 4min → Refresh → Wait 1min → Verify old expired, new valid

Timeline:
T+0:00  - Login (Access Token 1: expires at T+5:00)
T+4:00  - Refresh (Access Token 2: expires at T+9:00, Refresh Token 2: expires at T+34:00)
T+5:00  - Check: Token 1 EXPIRED, Token 2 VALID
T+9:00  - Token 2 would expire (if not refreshed again)

Keycloak Default Settings:
- Access Token Lifespan: 5 minutes
- Refresh Token Lifespan: 30 minutes
"""

import requests
import json
import base64
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s.%(msecs)03d - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"
TEST_USER = {"username": "testadmin", "password": "testadmin123"}

# Timing configuration (in seconds)
WAIT_BEFORE_REFRESH = 4 * 60      # 4 minutes
WAIT_AFTER_REFRESH = 1 * 60       # 1 minute (total 5 min from login)


def decode_jwt(token: str) -> Optional[Dict]:
    """Decode JWT payload without verification"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
        return json.loads(base64.urlsafe_b64decode(payload))
    except Exception as e:
        logger.error(f"JWT decode failed: {e}")
        return None


def get_token_expiry(token: str) -> Optional[datetime]:
    """Extract expiry time from token"""
    payload = decode_jwt(token)
    if payload and "exp" in payload:
        return datetime.fromtimestamp(payload["exp"])
    return None


def get_token_info(token: str) -> Dict:
    """Get human-readable token info"""
    payload = decode_jwt(token)
    if not payload:
        return {"error": "Invalid token"}
    
    exp = payload.get("exp")
    iat = payload.get("iat")
    
    info = {
        "subject": payload.get("sub", "unknown")[:8] + "...",
        "issued_at": datetime.fromtimestamp(iat).strftime('%H:%M:%S') if iat else "unknown",
        "expires_at": datetime.fromtimestamp(exp).strftime('%H:%M:%S') if exp else "unknown",
        "issuer": payload.get("iss", "unknown"),
    }
    
    # Calculate remaining time
    if exp:
        remaining = exp - int(time.time())
        info["expires_in"] = f"{remaining}s ({remaining//60}m {remaining%60}s)"
    
    return info


def test_access_token(base_url: str, token: str, label: str) -> Tuple[bool, int]:
    """Test if access token is valid. Returns (is_valid, http_status)"""
    logger.info(f"Testing {label}...")
    
    try:
        resp = requests.get(
            f"{base_url}/auth/check",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=5
        )
        
        is_valid = resp.status_code == 200 and resp.json().get("logged_in")
        logger.info(f"{label}: HTTP {resp.status_code}, logged_in={resp.json().get('logged_in')}")
        return is_valid, resp.status_code
        
    except Exception as e:
        logger.error(f"Request failed for {label}: {e}")
        return False, 0


def format_time_remaining(target_time: datetime) -> str:
    """Format time remaining until target"""
    now = datetime.now()
    diff = target_time - now
    total_seconds = int(diff.total_seconds())
    
    if total_seconds <= 0:
        return "EXPIRED"
    
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes}m {seconds}s"


def wait_with_countdown(seconds: int, reason: str):
    """Wait with visual countdown"""
    logger.info(f"\\n⏳ {reason}")
    logger.info(f"   Waiting {seconds//60} minutes {seconds%60} seconds...")
    
    # Log every 30 seconds
    for remaining in range(seconds, 0, -1):
        if remaining % 30 == 0 or remaining <= 10:
            logger.info(f"   ... {remaining//60}m {remaining%60}s remaining")
        time.sleep(1)
    
    logger.info("   ✅ Wait complete")


def main():
    start_time = datetime.now()
    logger.info("=" * 70)
    logger.info("KEYCLOAK TOKEN EXPIRY & REFRESH TEST")
    logger.info("=" * 70)
    logger.info(f"Start time: {start_time.strftime('%H:%M:%S')}")
    logger.info(f"Test duration: ~{WAIT_BEFORE_REFRESH//60 + WAIT_AFTER_REFRESH//60 + 1} minutes")
    logger.info("")
    logger.info("Timeline:")
    logger.info(f"  T+0:00  - Login (Token 1 expires ~T+5:00)")
    logger.info(f"  T+4:00  - Refresh (Token 2 expires ~T+9:00)")
    logger.info(f"  T+5:00  - Verify Token 1 EXPIRED, Token 2 VALID")
    logger.info("")

    # ============ STEP 1: LOGIN ============
    logger.info("=" * 70)
    logger.info("STEP 1: LOGIN (T+0:00)")
    logger.info("=" * 70)
    
    logger.info(f"Sending login request for {TEST_USER['username']}...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json=TEST_USER,
        headers={"Content-Type": "application/json", "Accept": "application/json"}
    )
    
    if resp.status_code != 200:
        logger.error(f"Login failed: HTTP {resp.status_code}")
        return False
    
    data = resp.json()
    token1_access = data["access_token"]
    token1_refresh = data["refresh_token"]
    
    token1_exp = get_token_expiry(token1_access)
    token1_info = get_token_info(token1_access)
    
    logger.info("✅ Login successful")
    logger.info(f"   Access Token 1:  {token1_access[:40]}...")
    logger.info(f"   Refresh Token 1: {token1_refresh[:40]}...")
    logger.info(f"   Expires at:      {token1_info['expires_at']}")
    logger.info(f"   Time remaining:  {format_time_remaining(token1_exp)}")
    logger.info(f"   Full token info: {json.dumps(token1_info, indent=2)}")
    
    # Quick validation
    valid, status = test_access_token(BASE_URL, token1_access, "Token 1 (initial)")
    if not valid:
        logger.error("Fresh token doesn't work! Aborting.")
        return False
    logger.info("✅ Token 1 is valid immediately after login")

    # ============ STEP 2: WAIT 4 MINUTES ============
    logger.info("")
    logger.info("=" * 70)
    logger.info("STEP 2: WAIT 4 MINUTES (T+0:00 → T+4:00)")
    logger.info("=" * 70)
    logger.info(f"Current time: {datetime.now().strftime('%H:%M:%S')}")
    logger.info(f"Token 1 still has: {format_time_remaining(token1_exp)}")
    
    wait_with_countdown(WAIT_BEFORE_REFRESH, "Waiting 4 minutes before refresh...")
    
    # Check token 1 status after 4 minutes
    logger.info("")
    logger.info(f"Time is now: {datetime.now().strftime('%H:%M:%S')} (T+4:00)")
    logger.info(f"Token 1 expires at: {token1_exp.strftime('%H:%M:%S') if token1_exp else 'unknown'}")
    logger.info(f"Token 1 remaining: {format_time_remaining(token1_exp)}")
    
    valid, status = test_access_token(BASE_URL, token1_access, "Token 1 (after 4min)")
    logger.info(f"✅ Token 1 still valid after 4 minutes: {valid}")

    # ============ STEP 3: REFRESH ============
    logger.info("")
    logger.info("=" * 70)
    logger.info("STEP 3: REFRESH TOKEN (T+4:00)")
    logger.info("=" * 70)
    
    logger.info("Sending refresh request with Token 1's refresh token...")
    resp = requests.post(
        f"{BASE_URL}/auth/refresh",
        json={"refresh_token": token1_refresh},
        headers={"Content-Type": "application/json", "Accept": "application/json"}
    )
    
    if resp.status_code != 200:
        logger.error(f"Refresh failed: HTTP {resp.status_code}")
        logger.error(f"Response: {resp.text}")
        return False
    
    data = resp.json()
    token2_access = data["access_token"]
    token2_refresh = data["refresh_token"]
    
    token2_exp = get_token_expiry(token2_access)
    token2_info = get_token_info(token2_access)
    
    rotation = token1_refresh != token2_refresh
    
    logger.info("✅ Refresh successful")
    logger.info(f"   Access Token 2:  {token2_access[:40]}...")
    logger.info(f"   Refresh Token 2: {token2_refresh[:40]}...")
    logger.info(f"   Expires at:      {token2_info['expires_at']}")
    logger.info(f"   Time remaining:  {format_time_remaining(token2_exp)}")
    logger.info(f"   Token rotation:  {'ENABLED' if rotation else 'DISABLED'}")
    logger.info(f"   Full token info: {json.dumps(token2_info, indent=2)}")
    
    # Validate new token works
    valid, status = test_access_token(BASE_URL, token2_access, "Token 2 (initial)")
    if not valid:
        logger.error("New token doesn't work!")
        return False
    logger.info("✅ Token 2 is valid immediately after refresh")

    # ============ STEP 4: WAIT 1 MORE MINUTE ============
    logger.info("")
    logger.info("=" * 70)
    logger.info("STEP 4: WAIT 1 MINUTE (T+4:00 → T+5:00)")
    logger.info("=" * 70)
    logger.info(f"Current time: {datetime.now().strftime('%H:%M:%S')}")
    logger.info(f"Token 1 expires in: {format_time_remaining(token1_exp)}")
    logger.info(f"Token 2 expires in: {format_time_remaining(token2_exp)}")
    
    wait_with_countdown(WAIT_AFTER_REFRESH, "Waiting 1 minute for Token 1 to expire...")
    
    # ============ STEP 5: FINAL VERIFICATION ============
    logger.info("")
    logger.info("=" * 70)
    logger.info("STEP 5: FINAL VERIFICATION (T+5:00)")
    logger.info("=" * 70)
    logger.info(f"Current time: {datetime.now().strftime('%H:%M:%S')}")
    logger.info("")
    
    # Check Token 1 (should be EXPIRED)
    logger.info("Testing Token 1 (original, should be EXPIRED):")
    logger.info(f"   Expiry was: {token1_exp.strftime('%H:%M:%S') if token1_exp else 'unknown'}")
    logger.info(f"   Time since login: ~5 minutes")
    
    valid1, status1 = test_access_token(BASE_URL, token1_access, "Token 1 (final)")
    
    if valid1:
        logger.warning("⚠️  Token 1 still valid! (Clock skew or longer expiry?)")
    else:
        logger.info("✅ Token 1 correctly EXPIRED")
        logger.info(f"   HTTP {status1} (expected 401)")
    
    # Check Token 2 (should be VALID)
    logger.info("")
    logger.info("Testing Token 2 (refreshed, should be VALID):")
    logger.info(f"   Expires at: {token2_exp.strftime('%H:%M:%S') if token2_exp else 'unknown'}")
    logger.info(f"   Time remaining: {format_time_remaining(token2_exp)}")
    
    valid2, status2 = test_access_token(BASE_URL, token2_access, "Token 2 (final)")
    
    if valid2:
        logger.info("✅ Token 2 correctly VALID")
        logger.info(f"   Valid for another {format_time_remaining(token2_exp)}")
    else:
        logger.error(f"❌ Token 2 invalid! HTTP {status2}")
    
    # ============ SUMMARY ============
    logger.info("")
    logger.info("=" * 70)
    logger.info("TEST SUMMARY")
    logger.info("=" * 70)
    
    elapsed = datetime.now() - start_time
    logger.info(f"Total test duration: {elapsed}")
    logger.info("")
    logger.info("Results:")
    logger.info(f"  Token 1 (original, ~5min old):  {'✅ EXPIRED' if not valid1 else '⚠️ STILL VALID'}")
    logger.info(f"  Token 2 (refreshed, ~1min old): {'✅ VALID' if valid2 else '❌ INVALID'}")
    logger.info("")
    
    if not valid1 and valid2:
        logger.info("🎉 SUCCESS: Token expiry and refresh working correctly!")
        logger.info("   • Old tokens expire as expected")
        logger.info("   • New tokens from refresh have extended lifetime")
        logger.info("   • Continuous session possible with periodic refresh")
        return True
    else:
        logger.warning("⚠️  Unexpected results:")
        if valid1:
            logger.warning("   - Token 1 should have expired by now")
        if not valid2:
            logger.warning("   - Token 2 should still be valid")
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\\n\\n⚠️  Test interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.exception("Test failed with exception")
        sys.exit(1)