#!/usr/bin/env python3
"""
lab-instance-test.py

Tests Lab Instance API endpoints:
- List available public labs
- Create lab instance
- Get instance details
- Monitor provisioning status
- Stop/Cleanup instance
"""

import requests
import json
import logging
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

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

# Test trainee user credentials
USER = {
    "username": "testtrainee",  # Change to your test user
    "password": "testtrainee123"  # Change to your test password
}


class LabInstanceAPIClient:
    def __init__(self):
        self.base_url = BASE_URL.rstrip('/')
        self.api_prefix = API_PREFIX
        self.access_token: Optional[str] = None
        self.session = requests.Session()
        logger.info(f"Initialized LabInstance client: {self.base_url}")

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

    def login(self) -> bool:
        logger.info(f"Logging in as {USER['username']}...")
        url = self._get_url("/auth/login")
        payload = {
            "username": USER["username"],
            "password": USER["password"]
        }
        
        try:
            response = self.session.post(
                url,
                json=payload,
                headers=self._get_headers(auth=False)
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                logger.info("✓ Login successful")
                return True
            else:
                logger.error(f"✗ Login failed: {response.status_code}")
                logger.error(response.text)
                return False
                
        except Exception as e:
            logger.error(f"✗ Login error: {e}")
            return False

    def check_auth(self) -> bool:
        logger.info("Checking auth...")
        url = self._get_url("/auth/check")
        
        try:
            response = self.session.get(url, headers=self._get_headers())
            if response.status_code == 200:
                user = response.json().get("user", {})
                logger.info(f"✓ Auth valid - User: {user.get('preferred_username')}")
                logger.info(f"  Roles: {user.get('realm_access', {}).get('roles', [])}")
                return True
            return False
        except Exception as e:
            logger.error(f"✗ Auth check failed: {e}")
            return False

    def list_public_labs(self, limit: int = 100) -> List[Dict]:
        """
        List available public lab definitions.
        Returns labs that can be instantiated.
        """
        logger.info("Fetching available public labs...")
        url = self._get_url("/lab-definitions/public")
        params = {"limit": limit}
        
        try:
            response = self.session.get(
                url, 
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                labs = response.json()
                logger.info(f"✓ Found {len(labs)} public labs")
                
                for lab in labs:
                    logger.info(f"  - {lab['name']} (slug: {lab['slug']}, duration: {lab['duration_minutes']}min)")
                
                return labs
            else:
                logger.error(f"✗ Failed to fetch labs: {response.status_code}")
                logger.error(response.text)
                return []
                
        except Exception as e:
            logger.error(f"✗ Error fetching labs: {e}")
            return []

    def create_lab_instance(self, lab_definition_id: str, user_notes: str = "") -> Optional[Dict]:
        """
        Create a new lab instance from a lab definition.
        Triggers background provisioning.
        """
        logger.info(f"Creating lab instance for definition: {lab_definition_id}")
        url = self._get_url("/lab-instances/")
        
        payload = {
            "lab_definition_id": lab_definition_id,
            "user_notes": user_notes
        }
        
        try:
            response = self.session.post(
                url,
                json=payload,
                headers=self._get_headers()
            )
            
            if response.status_code == 201:
                data = response.json()
                logger.info("✓ Lab instance created successfully!")
                logger.info(f"  Instance ID: {data.get('id')}")
                logger.info(f"  Status: {data.get('status')}")
                logger.info(f"  Expires at: {data.get('expires_at')}")
                return data
            elif response.status_code == 400:
                logger.error("✗ Bad request - validation failed")
                logger.error(response.text)
                return None
            elif response.status_code == 403:
                logger.error("✗ Forbidden - concurrent limit reached or lab unavailable")
                logger.error(response.text)
                return None
            elif response.status_code == 409:
                logger.error("✗ Conflict - already have active instance of this lab")
                logger.error(response.text)
                return None
            else:
                logger.error(f"✗ Failed: {response.status_code}")
                logger.error(response.text)
                return None
                
        except Exception as e:
            logger.error(f"✗ Error creating instance: {e}")
            return None

    def get_my_instances(self, status: str = None) -> List[Dict]:
        """
        List my lab instances.
        """
        logger.info("Fetching my lab instances...")
        url = self._get_url("/lab-instances/")
        params = {}
        if status:
            params["status"] = status
            
        try:
            response = self.session.get(
                url,
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                instances = response.json()
                total_count = response.headers.get('X-Total-Count', 'unknown')
                logger.info(f"✓ Found {len(instances)} instances (total: {total_count})")
                
                for inst in instances:
                    logger.info(f"  - {inst.get('name', 'Unknown')} | "
                              f"Status: {inst.get('status')} | "
                              f"Progress: {inst.get('percent_complete')}% | "
                              f"Remaining: {inst.get('remaining_minutes')}min")
                
                return instances
            else:
                logger.error(f"✗ Failed: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return []

    def get_instance_details(self, instance_id: str) -> Optional[Dict]:
        """
        Get detailed information about a lab instance.
        """
        logger.info(f"Fetching instance details: {instance_id}")
        url = self._get_url(f"/lab-instances/{instance_id}")
        
        try:
            response = self.session.get(
                url,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Instance details retrieved")
                logger.info(f"  Status: {data.get('status')}")
                logger.info(f"  Status message: {data.get('status_message')}")
                logger.info(f"  Progress: {data.get('current_step')}/{data.get('total_steps')} steps")
                logger.info(f"  Percent: {data.get('percent_complete')}%")
                logger.info(f"  Remaining: {data.get('remaining_minutes')} minutes")
                
                # Show VMs if available
                vms = data.get('vms', [])
                if vms:
                    logger.info(f"  VMs ({len(vms)}):")
                    for vm in vms:
                        logger.info(f"    - {vm.get('name')}: {vm.get('vm_status')} | IP: {vm.get('ip_address')}")
                
                # Show access URLs if running
                access_urls = data.get('access_urls', {})
                if access_urls:
                    logger.info(f"  Access URLs:")
                    for key, url in access_urls.items():
                        logger.info(f"    - {key}: {url}")
                
                return data
            elif response.status_code == 404:
                logger.error("✗ Instance not found")
                return None
            else:
                logger.error(f"✗ Failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return None

    def get_instance_access(self, instance_id: str) -> Optional[Dict]:
        """
        Get access URLs for a running instance.
        """
        logger.info(f"Fetching access URLs for: {instance_id}")
        url = self._get_url(f"/lab-instances/{instance_id}/access")
        
        try:
            response = self.session.get(url, headers=self._get_headers())
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✓ Access URLs retrieved:")
                for key, value in data.get('access_urls', {}).items():
                    logger.info(f"  - {key}: {value}")
                return data
            else:
                logger.error(f"✗ Failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return None

    def stop_instance(self, instance_id: str, reason: str = "User requested stop") -> Optional[Dict]:
        """
        Stop a lab instance.
        """
        logger.info(f"Stopping instance: {instance_id}")
        url = self._get_url(f"/lab-instances/{instance_id}/stop")
        params = {"reason": reason}
        
        try:
            response = self.session.post(
                url,
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✓ Instance stop initiated")
                logger.info(f"  New status: {data.get('status')}")
                return data
            else:
                logger.error(f"✗ Failed: {response.status_code}")
                logger.error(response.text)
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return None

    def extend_instance(self, instance_id: str, additional_minutes: int) -> Optional[Dict]:
        """
        Extend lab instance time.
        """
        logger.info(f"Extending instance {instance_id} by {additional_minutes} minutes")
        url = self._get_url(f"/lab-instances/{instance_id}/extend")
        params = {"additional_minutes": additional_minutes}
        
        try:
            response = self.session.post(
                url,
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✓ Instance extended")
                logger.info(f"  New expiry: {data.get('expires_at')}")
                return data
            else:
                logger.error(f"✗ Failed: {response.status_code}")
                logger.error(response.text)
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return None

    def logout(self) -> bool:
        logger.info("Logging out...")
        url = self._get_url("/auth/logout")
        
        try:
            response = self.session.post(url, headers=self._get_headers())
            return response.status_code in [200, 204]
        except:
            return False


def wait_for_status(client: LabInstanceAPIClient, instance_id: str, 
                    target_statuses: List[str], timeout: int = 300, 
                    poll_interval: int = 10) -> Optional[str]:
    """
    Poll instance status until it reaches one of the target statuses.
    """
    logger.info(f"Waiting for instance to reach {target_statuses}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        details = client.get_instance_details(instance_id)
        
        if not details:
            logger.error("Failed to get instance details while waiting")
            return None
        
        current_status = details.get('status')
        logger.info(f"Current status: {current_status}")
        
        if current_status in target_statuses:
            logger.info(f"✓ Reached target status: {current_status}")
            return current_status
        
        if current_status == 'failed':
            logger.error("✗ Instance provisioning failed!")
            return 'failed'
        
        logger.info(f"Waiting {poll_interval}s before next check...")
        time.sleep(poll_interval)
    
    logger.error(f"Timeout after {timeout}s")
    return None


def main():
    logger.info("=" * 60)
    logger.info("Lab Instance API Test")
    logger.info(f"User: {USER['username']}")
    logger.info("=" * 60)
    
    client = LabInstanceAPIClient()
    
    # Step 1: Login
    if not client.login():
        logger.error("Cannot proceed without authentication")
        return 1
    
    # Step 2: Verify auth
    if not client.check_auth():
        logger.error("Auth check failed")
        return 1
    
    # Step 3: List available public labs
    labs = client.list_public_labs(limit=10)
    
    if not labs:
        logger.error("No public labs available to instantiate")
        client.logout()
        return 1
    
    # Select first available lab
    selected_lab = labs[0]
    lab_id = selected_lab['id']
    lab_name = selected_lab['name']
    
    logger.info(f"\nSelected lab: {lab_name} (ID: {lab_id})")
    
    # Step 4: Check if we already have instances
    existing_instances = client.get_my_instances()
    
    # Step 5: Create new lab instance
    logger.info("\n--- Creating Lab Instance ---")
    instance = client.create_lab_instance(
        lab_definition_id=lab_id,
        user_notes=f"Test instance created at {datetime.now().isoformat()}"
    )
    
    if not instance:
        logger.error("Failed to create instance")
        client.logout()
        return 1
    
    instance_id = instance['id']
    
    # Step 6: Monitor provisioning (optional - can take minutes)
    logger.info("\n--- Monitoring Provisioning ---")
    logger.info("Note: Provisioning may take 2-5 minutes. Press Ctrl+C to skip monitoring.")
    
    try:
        final_status = wait_for_status(
            client, 
            instance_id, 
            target_statuses=['running', 'failed'],
            timeout=300,  # 5 minutes max
            poll_interval=10
        )
        
        if final_status == 'running':
            logger.info("\n--- Getting Access URLs ---")
            client.get_instance_access(instance_id)
            
            logger.info("\n--- Full Instance Details ---")
            client.get_instance_details(instance_id)
            
            # Optional: Extend time
            # logger.info("\n--- Extending Instance ---")
            # client.extend_instance(instance_id, additional_minutes=30)
            
            # Optional: Stop instance after testing
            # logger.info("\n--- Stopping Instance ---")
            # client.stop_instance(instance_id, reason="Test completed")
            
        elif final_status == 'failed':
            logger.error("Instance failed to provision")
            client.get_instance_details(instance_id)  # Get error details
        
    except KeyboardInterrupt:
        logger.info("\nMonitoring interrupted by user")
        logger.info(f"Instance ID for manual check: {instance_id}")
    
    # Step 7: List all my instances at end
    logger.info("\n--- Final Instance List ---")
    client.get_my_instances()
    
    # Step 8: Logout
    client.logout()
    
    logger.info("=" * 60)
    logger.info("Test completed!")
    logger.info(f"Created Instance ID: {instance_id}")
    logger.info("=" * 60)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())