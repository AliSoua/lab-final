#!/usr/bin/env python3
"""
lab-definition-test2.py

Creates a FULL lab definition with VMs and detailed guide blocks
as testmoderator user (using /lab-definitions/full endpoint)
"""

import requests
import json
import logging
import sys
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

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

# Testmoderator credentials
USER = {
    "username": "testmoderator",
    "password": "testmoderator123"
}


class LabAPIClient:
    def __init__(self):
        self.base_url = BASE_URL.rstrip('/')
        self.api_prefix = API_PREFIX
        self.access_token: Optional[str] = None
        self.session = requests.Session()
        logger.info(f"Initialized client: {self.base_url}")

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
                logger.info(f"  Token: {self.access_token[:30]}...")
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
                return True
            return False
        except Exception as e:
            logger.error(f"✗ Auth check failed: {e}")
            return False

    def create_full_lab(self, lab_data: Dict) -> Optional[Dict]:
        """
        Create FULL lab definition with VMs and guide blocks
        Uses POST /lab-definitions/full
        """
        logger.info("Creating FULL lab definition...")
        logger.info(f"Name: {lab_data.get('name')}")
        logger.info(f"Slug: {lab_data.get('slug')}")
        logger.info(f"VMs: {len(lab_data.get('vms', []))}")
        logger.info(f"Guide Blocks: {len(lab_data.get('guide_blocks', []))}")
        
        url = self._get_url("/lab-definitions/full")
        
        try:
            response = self.session.post(
                url,
                json=lab_data,
                headers=self._get_headers()
            )
            
            logger.debug(f"Request payload: {json.dumps(lab_data, indent=2)}")
            
            if response.status_code == 201:
                data = response.json()
                logger.info("✓ Full lab created successfully!")
                logger.info(f"  Lab ID: {data.get('id')}")
                logger.info(f"  Status: {data.get('status')}")
                logger.info(f"  VMs created: {len(data.get('vms', []))}")
                logger.info(f"  Guide blocks: {len(data.get('guide_blocks', []))}")
                return data
            elif response.status_code == 409:
                logger.error("✗ Lab with this slug already exists")
                return None
            else:
                logger.error(f"✗ Failed: {response.status_code}")
                logger.error(response.text)
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return None

    def get_lab(self, lab_id: str) -> Optional[Dict]:
        """Get full lab details"""
        logger.info(f"Fetching lab {lab_id}...")
        url = self._get_url(f"/lab-definitions/{lab_id}")
        
        try:
            response = self.session.get(url, headers=self._get_headers())
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error: {e}")
            return None

    def publish_lab(self, lab_id: str) -> bool:
        """Publish the lab"""
        logger.info(f"Publishing lab {lab_id}...")
        url = self._get_url(f"/lab-definitions/{lab_id}/publish")
        
        try:
            response = self.session.post(url, headers=self._get_headers())
            if response.status_code == 200:
                logger.info("✓ Lab published")
                return True
            else:
                logger.error(f"✗ Publish failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error: {e}")
            return False

    def logout(self) -> bool:
        logger.info("Logging out...")
        url = self._get_url("/auth/logout")
        
        try:
            response = self.session.post(url, headers=self._get_headers())
            return response.status_code in [200, 204]
        except:
            return False


def create_lab_payload() -> Dict:
    """Create the full lab payload with unique timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # VM Template IDs (you should replace these with actual IDs from your DB)
    # Using placeholder UUIDs - replace with real source_vm_ids
    vm_template_ubuntu = "11111111-1111-1111-1111-111111111111"
    
    return {
        "name": f"Advanced NGINX Web Server Lab - {timestamp}",
        "slug": f"nginx-advanced-lab-{timestamp}",
        "description": "Complete guide to installing and configuring NGINX web server with SSL, reverse proxy, and load balancing. Includes hands-on exercises for production deployment scenarios.",
        "short_description": "Master NGINX configuration from basics to production",
        "category": "web_development",
        "difficulty": "intermediate",
        "duration_minutes": 120,
        "objectives": [
            "Install NGINX from official repository",
            "Configure virtual hosts and server blocks",
            "Set up SSL/TLS certificates with Let's Encrypt",
            "Implement reverse proxy for backend applications",
            "Configure load balancing across multiple servers",
            "Optimize NGINX for production performance"
        ],
        "prerequisites": [
            "Basic Linux command line knowledge",
            "Understanding of HTTP/HTTPS protocols",
            "Familiarity with vim or nano editor"
        ],
        "tags": ["nginx", "web-server", "ssl", "reverse-proxy", "load-balancing", "devops"],
        
        # VMs configuration (2 VMs for this lab)
        "vms": [
            {
                "name": "nginx-main",
                "description": "Primary NGINX web server",
                "source_vm_id": vm_template_ubuntu,
                "cpu_cores": 2,
                "memory_mb": 2048,
                "disk_gb": 20,
                "network_config": {
                    "ip_address": "192.168.1.10",
                    "subnet": "255.255.255.0",
                    "gateway": "192.168.1.1"
                },
                "startup_delay": 0,
                "order": 0
            },
            {
                "name": "nginx-backend-01",
                "description": "Backend application server for reverse proxy demo",
                "source_vm_id": vm_template_ubuntu,
                "cpu_cores": 1,
                "memory_mb": 1024,
                "disk_gb": 15,
                "network_config": {
                    "ip_address": "192.168.1.11",
                    "subnet": "255.255.255.0"
                },
                "startup_delay": 10,
                "order": 1
            }
        ],
        
        # Detailed Guide Blocks
        "guide_blocks": [
            # Introduction
            {
                "block_type": "text",
                "title": "Welcome to NGINX Lab",
                "content": """# Advanced NGINX Configuration Lab

Welcome! In this comprehensive lab, you'll learn how to deploy NGINX as a production-grade web server.

## What You'll Build
- **NGINX Main Server**: Primary web server with SSL
- **Backend Server**: Application server behind reverse proxy
- **Load Balancer**: Distributing traffic across instances

## Architecture Diagram
[Internet] → [NGINX Main] → [Backend Server]
↓
[SSL/TLS Termination]
""",
                "order": 0,
                "block_metadata": {
                    "syntax_highlighting": "markdown",
                    "collapsible": False
                }
            },
            
            # Step 1: Update system
            {
                "block_type": "text",
                "content": "Let's start by updating the system packages to ensure we have the latest security patches.",
                "order": 1,
                "block_metadata": {}
            },
            {
                "block_type": "cmd",
                "title": "Update System Packages",
                "content": "sudo apt update && sudo apt upgrade -y",
                "order": 2,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 180,
                    "description": "Updates all system packages to latest versions",
                    "confirmation_required": False
                }
            },
            
            # Step 2: Install NGINX
            {
                "block_type": "text",
                "content": "Now let's install NGINX from the official Ubuntu repository. This is the stable version maintained by the NGINX team.",
                "order": 3,
                "block_metadata": {}
            },
            {
                "block_type": "cmd",
                "title": "Install NGINX",
                "content": "sudo apt install nginx -y",
                "order": 4,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 120,
                    "description": "Installs NGINX web server and dependencies",
                    "confirmation_required": True,
                    "working_directory": "/tmp"
                }
            },
            {
                "block_type": "cmd",
                "title": "Verify NGINX Installation",
                "content": "nginx -v",
                "order": 5,
                "block_metadata": {
                    "sudo": False,
                    "timeout": 5,
                    "description": "Check installed NGINX version",
                    "expect_output": "nginx version"
                }
            },
            
            # Step 3: Configure Firewall
            {
                "block_type": "text",
                "content": "Before we can access NGINX from the browser, we need to configure the firewall to allow HTTP (port 80) and HTTPS (port 443) traffic.",
                "order": 6,
                "block_metadata": {}
            },
            {
                "block_type": "cmd",
                "title": "Allow NGINX through Firewall",
                "content": "sudo ufw allow 'Nginx Full' && sudo ufw allow OpenSSH",
                "order": 7,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 10,
                    "description": "Opens ports 80 and 443 for web traffic",
                    "confirmation_required": True
                }
            },
            {
                "block_type": "cmd",
                "title": "Enable Firewall",
                "content": "sudo ufw enable",
                "order": 8,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Activates the firewall rules",
                    "confirmation_required": True
                }
            },
            
            # Step 4: Check service status
            {
                "block_type": "text",
                "content": "Let's verify that NGINX is running and enabled to start on boot.",
                "order": 9,
                "block_metadata": {}
            },
            {
                "block_type": "cmd",
                "title": "Check NGINX Service Status",
                "content": "sudo systemctl status nginx --no-pager",
                "order": 10,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Verify NGINX is active and running",
                    "expect_output": "Active: active (running)"
                }
            },
            
            # Step 5: Create first server block
            {
                "block_type": "text",
                "title": "Virtual Host Configuration",
                "content": """## Setting Up Virtual Hosts

NGINX uses **server blocks** (similar to Apache's virtual hosts) to host multiple websites on a single server.

We'll create a configuration for `lab.example.com`.""",
                "order": 11,
                "block_metadata": {
                    "syntax_highlighting": "markdown"
                }
            },
            {
                "block_type": "cmd",
                "title": "Create Web Root Directory",
                "content": "sudo mkdir -p /var/www/lab.example.com/html && sudo chown -R $USER:$USER /var/www/lab.example.com/html",
                "order": 12,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Creates directory structure for the website"
                }
            },
            {
                "block_type": "cmd",
                "title": "Set Permissions",
                "content": "sudo chmod -R 755 /var/www/lab.example.com",
                "order": 13,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Sets proper read permissions for web content"
                }
            },
            
            # Step 6: Create index file
            {
                "block_type": "text",
                "content": "Now let's create a simple HTML page to test our configuration.",
                "order": 14,
                "block_metadata": {}
            },
            {
                "block_type": "cmd",
                "title": "Create Test HTML Page",
                "content": "echo '<html><body><h1>Welcome to NGINX Lab!</h1><p>Server block is working correctly.</p></body></html>' | sudo tee /var/www/lab.example.com/html/index.html",
                "order": 15,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Creates index.html test page"
                }
            },
            
            # Step 7: Create NGINX server block config
            {
                "block_type": "text",
                "content": "Now we need to create the actual NGINX configuration file for our server block.",
                "order": 16,
                "block_metadata": {}
            },
            {
                "block_type": "cmd",
                "title": "Create Server Block Config",
                "content": "sudo tee /etc/nginx/sites-available/lab.example.com << 'EOF'\nserver {\n    listen 80;\n    listen [::]:80;\n\n    root /var/www/lab.example.com/html;\n    index index.html index.htm index.nginx-debian.html;\n\n    server_name lab.example.com www.lab.example.com;\n\n    location / {\n        try_files $uri $uri/ =404;\n    }\n\n    error_page 404 /404.html;\n    error_page 500 502 503 504 /50x.html;\n\n    location = /50x.html {\n        root /var/www/lab.example.com/html;\n    }\n}\nEOF",
                "order": 17,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Creates NGINX server block configuration file"
                }
            },
            {
                "block_type": "cmd",
                "title": "Enable Server Block",
                "content": "sudo ln -s /etc/nginx/sites-available/lab.example.com /etc/nginx/sites-enabled/",
                "order": 18,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Creates symbolic link to enable the site"
                }
            },
            
            # Step 8: Test and reload
            {
                "block_type": "text",
                "content": "Before applying changes, let's test the NGINX configuration for syntax errors.",
                "order": 19,
                "block_metadata": {}
            },
            {
                "block_type": "cmd",
                "title": "Test NGINX Configuration",
                "content": "sudo nginx -t",
                "order": 20,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 5,
                    "description": "Validates NGINX configuration syntax",
                    "expect_output": "syntax is ok"
                }
            },
            {
                "block_type": "cmd",
                "title": "Reload NGINX",
                "content": "sudo systemctl reload nginx",
                "order": 21,
                "block_metadata": {
                    "sudo": True,
                    "timeout": 10,
                    "description": "Applies configuration changes without downtime",
                    "confirmation_required": False
                }
            },
            
            # Conclusion
            {
                "block_type": "text",
                "title": "Lab Complete!",
                "content": """## 🎉 Congratulations!

You have successfully:
- ✅ Installed NGINX web server
- ✅ Configured firewall rules
- ✅ Created a virtual host (server block)
- ✅ Deployed a static HTML website

### Next Steps
In the advanced section, you'll configure SSL with Let's Encrypt and set up a reverse proxy to the backend VM.

### Verification
You should now be able to access your website at `http://lab.example.com` (or the server IP address).""",
                "order": 22,
                "block_metadata": {
                    "syntax_highlighting": "markdown",
                    "collapsible": False
                }
            }
        ]
    }


def main():
    logger.info("=" * 60)
    logger.info("Lab Definition Test 2 - Full Lab Creation")
    logger.info("User: testmoderator")
    logger.info("=" * 60)
    
    client = LabAPIClient()
    
    # Step 1: Login
    if not client.login():
        logger.error("Cannot proceed without authentication")
        return
    
    # Step 2: Verify auth
    if not client.check_auth():
        logger.error("Auth check failed")
        return
    
    # Step 3: Create full lab with VMs and guide
    lab_data = create_lab_payload()
    created_lab = client.create_full_lab(lab_data)
    
    if not created_lab:
        logger.error("Lab creation failed")
        client.logout()
        return
    
    lab_id = created_lab["id"]
    
    # Step 4: Verify by fetching
    logger.info("Verifying created lab...")
    fetched = client.get_lab(lab_id)
    if fetched:
        logger.info(f"✓ Verified: {fetched.get('name')}")
        logger.info(f"  VMs: {len(fetched.get('vms', []))}")
        logger.info(f"  Guide blocks: {len(fetched.get('guide_blocks', []))}")
    
    # Step 5: Publish
    client.publish_lab(lab_id)
    
    # Step 6: Logout
    client.logout()
    
    logger.info("=" * 60)
    logger.info("Script completed successfully!")
    logger.info(f"Created Lab ID: {lab_id}")
    logger.info(f"Slug: {lab_data['slug']}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()