import requests

# === 1. AUTHENTICATE AND GET TOKEN ===
login_url = "http://localhost:8000/auth/login"
login_credentials = {
  "username": "testmoderator",
  "password": "testmoderator123"
}

login_response = requests.post(login_url, json=login_credentials)
login_response.raise_for_status() # Will raise an exception if login fails

# Assuming the API returns {"access_token": "ey..."}
bearer_token = login_response.json().get("access_token")

# === CONFIG ===
url = "http://localhost:8000/lab-guides/"

# === PAYLOAD ===
payload = {
    "title": "Python Developer Tools Fundamentals",
    "is_published": True,
    "created_by": "testmoderator",
    "steps": [
        {
            "title": "Step 1: Virtual Environments",
            "description": "Learn how to isolate your Python projects.",
            "theory_content": "### Virtual Environments\nA virtual environment is a self-contained directory tree that contains a Python installation for a particular version of Python, plus a number of additional packages. This prevents dependency conflicts between projects.",
            "commands": [
                {
                    "label": "Create Venv",
                    "command": "python3 -m venv .venv",
                    "description": "Creates a new virtual environment named .venv in the current directory.",
                    "timeout": 60,
                    "sudo": False,
                    "working_directory": "/home/user",
                    "target": {
                        "vm_name": "Linux-Template"
                    }
                }
            ],
            "tasks": [
                {
                    "description": "Activate the virtual environment manually via your terminal.",
                    "is_required": True
                }
            ],
            "hints": [
                {
                    "level": 1,
                    "content": "You need to use the `source` command on Linux."
                },
                {
                    "level": 3,
                    "content": "Run the exact command: `source .venv/bin/activate`"
                }
            ],
            "validations": [
                {
                    "type": "file_exists",
                    "description": "Check if the virtual environment directory was created successfully.",
                    "target": {
                        "vm_name": "Linux-Template"
                    },
                    "file_path": "/home/user/.venv/bin/activate",
                    "timeout": 30,
                    "is_blocking": True,
                    "points": 10
                }
            ],
            "quiz": {
                "question": "Which module is included in the Python 3 standard library to create virtual environments?",
                "type": "multiple_choice",
                "description": "Testing standard library knowledge.",
                "options": [
                    "virtualenv",
                    "venv",
                    "pipenv",
                    "poetry"
                ],
                "correct_answer": "venv",
                "case_sensitive": False,
                "points": 10
            },
            "points": 20,
            "order": 0
        },
        {
            "title": "Step 2: Installing Packages with Pip",
            "description": "Use pip to install a third-party package into your virtual environment.",
            "theory_content": "### Package Management\n`pip` is the package installer for Python. You can use it to install packages from the Python Package Index (PyPI).",
            "commands": [
                {
                    "label": "Install Requests Library",
                    "command": "/home/user/.venv/bin/pip install requests",
                    "description": "Installs the popular 'requests' HTTP library directly into the venv.",
                    "timeout": 120,
                    "sudo": False,
                    "working_directory": "/home/user",
                    "target": {
                        "vm_name": "Linux-Template"
                    }
                }
            ],
            "tasks": [
                {
                    "description": "Verify the package was installed by listing all installed packages.",
                    "is_required": False
                }
            ],
            "hints": [
                {
                    "level": 1,
                    "content": "Use the pip list or pip freeze command."
                }
            ],
            "validations": [
                {
                    "type": "command_output",
                    "description": "Verify the requests library is installed",
                    "target": {
                        "vm_name": "Linux-Template"
                    },
                    "command": "/home/user/.venv/bin/pip show requests",
                    "expected_output_pattern": "Name: requests",
                    "timeout": 30,
                    "is_blocking": False,
                    "points": 15
                }
            ],
            "quiz": {
                "question": "What pip command is used to output installed packages in a requirements.txt format?",
                "type": "short_answer",
                "correct_answer": "pip freeze",
                "case_sensitive": False,
                "points": 10
            },
            "points": 25,
            "order": 1
        }
    ]
}

# === HEADERS ===
headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {bearer_token}",
    "Content-Type": "application/json"
}

# === REQUEST ===
response = requests.post(url, headers=headers, json=payload)

# === OUTPUT ===
print("Status Code:", response.status_code)
print("Response:")
print(response.text)