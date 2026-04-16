# app/scripts/lab_definition.py
#!/usr/bin/env python3
"""
create_lab_definition.py

Test script for Lab Definition API workflow:
1. Authenticate users
2. Check auth
3. Create lab definition
4. List labs
5. Create guide blocks
6. Publish lab
"""

import requests
import json
import logging
import sys
from typing import Dict, List, Optional
from uuid import UUID

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust to your backend URL
API_PREFIX = "/"  # Adjust based on your API prefix

# Test Users
USERS = [
    {
        "username": "testadmin",
        "email": "testadmin@local.test",
        "firstName": "Test",
        "lastName": "Admin",
        "password": "testadmin123",
        "role": "admin"
    },
    {
        "username": "testmoderator",
        "email": "testmoderator@local.test",
        "firstName": "Test",
        "lastName": "Moderator",
        "password": "testmoderator123",
        "role": "moderator"
    },
    {
        "username": "testmoderator2",
        "email": "testmoderator2@local.test",
        "firstName": "Test",
        "lastName": "Moderator",
        "password": "testmoderator123",
        "role": "moderator"
    },
    {
        "username": "testmoderator3",
        "email": "testmoderator3@local.test",
        "firstName": "Test",
        "lastName": "Moderator",
        "password": "testmoderator123",
        "role": "moderator"
    },
    {
        "username": "testtrainee",
        "email": "testtrainee@local.test",
        "firstName": "Test",
        "lastName": "Trainee",
        "password": "testtrainee123",
        "role": "trainee"
    },
]


class LabAPIClient:
    """Client for interacting with the Lab Definition API"""
    
    def __init__(self, base_url: str = BASE_URL, api_prefix: str = API_PREFIX):
        self.base_url = base_url.rstrip('/')
        self.api_prefix = api_prefix
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.current_user: Optional[Dict] = None
        self.session = requests.Session()
        
        logger.info(f"Initialized LabAPIClient with base URL: {self.base_url}")
    
    def _get_url(self, endpoint: str) -> str:
        """Construct full URL from endpoint"""
        return f"{self.base_url}{self.api_prefix}{endpoint}"
    
    def _get_headers(self, auth: bool = True) -> Dict:
        """Get headers with optional authentication"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
            logger.debug("Added Authorization header")
        return headers
    
    def login(self, username: str, password: str) -> bool:
        """
        Authenticate user and store tokens
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            bool: True if login successful
        """
        logger.info(f"Attempting login for user: {username}")
        
        url = self._get_url("/auth/login")
        payload = {
            "username": username,
            "password": password
        }
        
        try:
            logger.debug(f"POST {url}")
            logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
            
            response = self.session.post(
                url,
                json=payload,
                headers=self._get_headers(auth=False)
            )
            
            logger.debug(f"Response Status: {response.status_code}")
            logger.debug(f"Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.refresh_token = data.get("refresh_token")
                self.current_user = {
                    "username": username,
                    "role": next((u["role"] for u in USERS if u["username"] == username), None)
                }
                
                logger.info(f"✓ Login successful for {username}")
                logger.info(f"  - Token type: {data.get('token_type', 'N/A')}")
                logger.info(f"  - Expires in: {data.get('expires_in', 'N/A')} seconds")
                logger.info(f"  - Scope: {data.get('scope', 'N/A')}")
                logger.info(f"  - Access token: {self.access_token[:20]}...")
                
                return True
            else:
                logger.error(f"✗ Login failed: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError as e:
            logger.error(f"✗ Connection error: {e}")
            logger.error("Is the backend server running?")
            return False
        except Exception as e:
            logger.error(f"✗ Login error: {e}")
            return False
    
    def check_auth(self) -> bool:
        """
        Verify current token is valid
        
        Returns:
            bool: True if token is valid
        """
        if not self.access_token:
            logger.warning("No access token available")
            return False
        
        logger.info("Checking authentication status...")
        url = self._get_url("/auth/check")
        
        try:
            logger.debug(f"GET {url}")
            response = self.session.get(
                url,
                headers=self._get_headers()
            )
            
            logger.debug(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info("✓ Auth check successful - Token is valid")
                logger.info(f"Response: {json.dumps(response.json(), indent=2)}")
                return True
            else:
                logger.error(f"✗ Auth check failed: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"✗ Auth check error: {e}")
            return False
    
    def logout(self) -> bool:
        """
        Logout current user
        
        Returns:
            bool: True if logout successful
        """
        if not self.access_token:
            logger.warning("No access token to logout")
            return False
        
        logger.info("Logging out...")
        url = self._get_url("/auth/logout")
        
        payload = {
            "refresh_token": self.refresh_token
        } if self.refresh_token else {}
        
        try:
            logger.debug(f"POST {url}")
            response = self.session.post(
                url,
                json=payload,
                headers=self._get_headers()
            )
            
            if response.status_code in [200, 204]:
                logger.info("✓ Logout successful")
                self.access_token = None
                self.refresh_token = None
                self.current_user = None
                return True
            else:
                logger.error(f"✗ Logout failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"✗ Logout error: {e}")
            return False
    
    def create_lab_definition(self, lab_data: Dict) -> Optional[Dict]:
        """
        Create a basic lab definition
        
        Args:
            lab_data: Lab definition data
            
        Returns:
            Dict: Created lab data or None if failed
        """
        logger.info("Creating lab definition...")
        logger.info(f"Lab name: {lab_data.get('name')}")
        logger.info(f"Lab slug: {lab_data.get('slug')}")
        
        url = self._get_url("/lab-definitions/")
        
        try:
            logger.debug(f"POST {url}")
            logger.debug(f"Payload: {json.dumps(lab_data, indent=2)}")
            
            response = self.session.post(
                url,
                json=lab_data,
                headers=self._get_headers()
            )
            
            logger.debug(f"Response Status: {response.status_code}")
            
            if response.status_code == 201:
                data = response.json()
                logger.info("✓ Lab definition created successfully")
                logger.info(f"  - ID: {data.get('id')}")
                logger.info(f"  - Name: {data.get('name')}")
                logger.info(f"  - Status: {data.get('status')}")
                logger.info(f"  - Created by: {data.get('created_by')}")
                return data
            elif response.status_code == 403:
                logger.error("✗ Permission denied - User needs admin or moderator role")
                return None
            else:
                logger.error(f"✗ Failed to create lab: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error creating lab: {e}")
            return None
    
    def list_lab_definitions(self, skip: int = 0, limit: int = 100, **filters) -> List[Dict]:
        """
        List lab definitions with optional filters
        
        Args:
            skip: Pagination skip
            limit: Pagination limit
            **filters: Optional filters (category, difficulty, status)
            
        Returns:
            List[Dict]: List of lab definitions
        """
        logger.info(f"Listing lab definitions (skip={skip}, limit={limit})...")
        
        url = self._get_url("/lab-definitions/")
        params = {"skip": skip, "limit": limit}
        params.update(filters)
        
        try:
            logger.debug(f"GET {url}")
            logger.debug(f"Params: {params}")
            
            response = self.session.get(
                url,
                params=params,
                headers=self._get_headers()
            )
            
            logger.debug(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Retrieved {len(data)} lab definitions")
                
                for lab in data:
                    logger.info(f"  - {lab.get('name')} ({lab.get('slug')}) [{lab.get('status')}]")
                
                return data
            else:
                logger.error(f"✗ Failed to list labs: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"✗ Error listing labs: {e}")
            return []
    
    def get_lab_definition(self, lab_id: str) -> Optional[Dict]:
        """
        Get specific lab definition by ID
        
        Args:
            lab_id: UUID of lab
            
        Returns:
            Dict: Lab data or None
        """
        logger.info(f"Fetching lab definition: {lab_id}")
        
        url = self._get_url(f"/lab-definitions/{lab_id}")
        
        try:
            logger.debug(f"GET {url}")
            response = self.session.get(
                url,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✓ Lab definition retrieved")
                return data
            else:
                logger.error(f"✗ Failed to get lab: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error fetching lab: {e}")
            return None
    
    def add_guide_block(self, lab_id: str, block_data: Dict) -> Optional[Dict]:
        """
        Add a guide block to a lab
        
        Args:
            lab_id: UUID of lab
            block_data: Guide block data
            
        Returns:
            Dict: Created block data or None
        """
        block_type = block_data.get("block_type")
        title = block_data.get("title", "Untitled")
        
        logger.info(f"Adding guide block to lab {lab_id}...")
        logger.info(f"  Type: {block_type}")
        logger.info(f"  Title: {title}")
        
        url = self._get_url(f"/lab-definitions/{lab_id}/guide-blocks")
        
        try:
            logger.debug(f"POST {url}")
            logger.debug(f"Payload: {json.dumps(block_data, indent=2)}")
            
            response = self.session.post(
                url,
                json=block_data,
                headers=self._get_headers()
            )
            
            logger.debug(f"Response Status: {response.status_code}")
            
            if response.status_code == 201:
                data = response.json()
                logger.info("✓ Guide block added successfully")
                logger.info(f"  - Block ID: {data.get('id')}")
                logger.info(f"  - Order: {data.get('order')}")
                return data
            else:
                logger.error(f"✗ Failed to add guide block: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error adding guide block: {e}")
            return None
    
    def publish_lab(self, lab_id: str) -> Optional[Dict]:
        """
        Publish a lab definition
        
        Args:
            lab_id: UUID of lab
            
        Returns:
            Dict: Updated lab data or None
        """
        logger.info(f"Publishing lab definition: {lab_id}")
        
        url = self._get_url(f"/lab-definitions/{lab_id}/publish")
        
        try:
            logger.debug(f"POST {url}")
            response = self.session.post(
                url,
                headers=self._get_headers()
            )
            
            logger.debug(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✓ Lab published successfully")
                logger.info(f"  - Status: {data.get('status')}")
                logger.info(f"  - Published at: {data.get('published_at')}")
                return data
            else:
                logger.error(f"✗ Failed to publish lab: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error publishing lab: {e}")
            return None
    
    def reorder_guide_blocks(self, lab_id: str, block_ids: List[str]) -> Optional[List[Dict]]:
        """
        Reorder guide blocks
        
        Args:
            lab_id: UUID of lab
            block_ids: List of block IDs in new order
            
        Returns:
            List[Dict]: Updated blocks or None
        """
        logger.info(f"Reordering guide blocks for lab {lab_id}...")
        logger.info(f"New order: {block_ids}")
        
        url = self._get_url(f"/lab-definitions/{lab_id}/guide-blocks/reorder")
        
        try:
            logger.debug(f"POST {url}")
            response = self.session.post(
                url,
                json=block_ids,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✓ Guide blocks reordered successfully")
                return data
            else:
                logger.error(f"✗ Failed to reorder: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error reordering: {e}")
            return None


def test_user_workflow(client: LabAPIClient, user: Dict) -> Optional[str]:
    """
    Test complete workflow for a specific user
    
    Args:
        client: API client instance
        user: User dict with credentials
        
    Returns:
        Optional[str]: Created lab ID or None
    """
    username = user["username"]
    role = user["role"]
    
    logger.info("=" * 60)
    logger.info(f"TESTING WORKFLOW FOR USER: {username} (Role: {role})")
    logger.info("=" * 60)
    
    # Step 1: Login
    if not client.login(username, user["password"]):
        logger.error(f"Cannot proceed without login for {username}")
        return None
    
    # Step 2: Check Auth
    if not client.check_auth():
        logger.warning("Auth check failed but proceeding...")
    
    # Only admin and moderator can create labs
    if role not in ["admin", "moderator"]:
        logger.info(f"User {username} is a {role}, attempting to create lab (should fail)...")
        test_lab = {
            "slug": f"test-lab-{username}",
            "name": f"Test Lab by {username}",
            "description": "This should fail for trainees"
        }
        result = client.create_lab_definition(test_lab)
        if result is None:
            logger.info("✓ Correctly rejected lab creation for trainee")
        else:
            logger.warning("✗ Trainee was able to create lab (check permissions!)")
        
        # Logout
        client.logout()
        return None
    
    # Step 3: Create Lab Definition
    lab_data = {
        "slug": f"postgresql-lab-{username}",
        "name": f"PostgreSQL Installation Lab - {username}",
        "description": "Learn to install and configure PostgreSQL on Ubuntu",
        "short_description": "Beginner-friendly PostgreSQL installation guide",
        "difficulty": "beginner",
        "category": "database",
        "duration_minutes": 90,
        "max_concurrent_users": 5,
        "cooldown_minutes": 30,
        "track": "Database Administration",
        "tags": ["postgresql", "database", "linux", "ubuntu"]
    }
    
    created_lab = client.create_lab_definition(lab_data)
    if not created_lab:
        client.logout()
        return None
    
    lab_id = created_lab["id"]
    
    # Step 4: List Labs (should see the newly created one)
    labs = client.list_lab_definitions(limit=10)
    
    # Step 5: Get specific lab
    lab_details = client.get_lab_definition(lab_id)
    
    # Step 6: Create Guide Blocks
    guide_blocks = [
        {
            "block_type": "text",
            "title": "Introduction",
            "content": "# Installing PostgreSQL\n\nIn this lab, you will learn how to install PostgreSQL on Ubuntu 22.04.",
            "order": 0,
            "block_metadata": {
                "syntax_highlighting": "markdown"
            }
        },
        {
            "block_type": "text",
            "content": "First, let's update the package list to ensure we have the latest information.",
            "order": 1,
            "block_metadata": {}
        },
        {
            "block_type": "cmd",
            "title": "Update Package List",
            "content": "sudo apt update",
            "order": 2,
            "block_metadata": {
                "sudo": True,
                "timeout": 60,
                "description": "Updates the package repository information",
                "confirmation_required": False
            }
        },
        {
            "block_type": "text",
            "content": "Now we'll install PostgreSQL along with its contrib package which provides additional features.",
            "order": 3,
            "block_metadata": {}
        },
        {
            "block_type": "cmd",
            "title": "Install PostgreSQL",
            "content": "sudo apt install postgresql postgresql-contrib -y",
            "order": 4,
            "block_metadata": {
                "sudo": True,
                "timeout": 300,
                "description": "Installs PostgreSQL server and additional utilities",
                "confirmation_required": True,
                "working_directory": "/tmp"
            }
        },
        {
            "block_type": "cmd",
            "title": "Check Service Status",
            "content": "sudo systemctl status postgresql --no-pager",
            "order": 5,
            "block_metadata": {
                "sudo": True,
                "timeout": 10,
                "expect_output": "Active: active (running)",
                "description": "Verify PostgreSQL service is running"
            }
        },
        {
            "block_type": "text",
            "content": "Excellent! PostgreSQL is now installed and running. You can now connect to it using:\n\n```bash\nsudo -u postgres psql\n```",
            "order": 6,
            "block_metadata": {
                "syntax_highlighting": "markdown",
                "collapsible": True,
                "collapsed_by_default": False
            }
        }
    ]
    
    created_blocks = []
    for block in guide_blocks:
        result = client.add_guide_block(lab_id, block)
        if result:
            created_blocks.append(result)
    
    logger.info(f"Created {len(created_blocks)} guide blocks")
    
    # Step 7: Reorder blocks (example: move command to position 0)
    if len(created_blocks) > 2:
        block_ids = [b["id"] for b in created_blocks]
        # Move first block to end as an example
        reordered = block_ids[1:] + [block_ids[0]]
        client.reorder_guide_blocks(lab_id, reordered)
    
    # Step 8: Publish Lab
    published_lab = client.publish_lab(lab_id)
    
    # Step 9: List labs again to see published status
    labs = client.list_lab_definitions(status="published")
    
    # Step 10: Logout
    client.logout()
    
    return lab_id


def main():
    """Main execution function"""
    logger.info("Starting Lab Definition API Test Script")
    logger.info("=" * 60)
    
    # Create client
    client = LabAPIClient()
    
    # Test with different users
    results = {}
    
    # Test with admin first
    admin = next((u for u in USERS if u["role"] == "admin"), None)
    if admin:
        lab_id = test_user_workflow(client, admin)
        results[admin["username"]] = lab_id
    
    # Test with first moderator
    moderator = next((u for u in USERS if u["role"] == "moderator"), None)
    if moderator:
        lab_id = test_user_workflow(client, moderator)
        results[moderator["username"]] = lab_id
    
    # Test with trainee (should fail on creation)
    trainee = next((u for u in USERS if u["role"] == "trainee"), None)
    if trainee:
        test_user_workflow(client, trainee)
    
    # Summary
    logger.info("=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    for username, lab_id in results.items():
        if lab_id:
            logger.info(f"✓ {username}: Created lab {lab_id}")
        else:
            logger.info(f"✗ {username}: Failed to create lab")
    
    logger.info("Script completed")


if __name__ == "__main__":
    main()