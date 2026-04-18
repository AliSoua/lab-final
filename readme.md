# Lab Platform Production Setup

## Requirements

Before starting, make sure you have:

* Docker installed and running
* Docker Compose available
* A Unix-like shell for running the `init` script

## Setup

### 1) Go to the project root

```bash
cd lab-final
```

### 2) Run the init script

This script copies all `.env.docker` files into `.env` files.

```bash
chmod +x init
./init
```

Or, if needed:

```bash
bash init
```

### 3) Start the stack

Run the production compose file with the project name:

```bash
docker compose -p lab-platform-prod -f docker-compose.prod.yml up --build
```

## Stop the stack

```bash
docker compose -p lab-platform-prod -f docker-compose.prod.yml down
```

## Notes

* The `init` script must be run from the `lab-final` directory.
* It creates these files if the matching `.env.docker` files exist:

  * `.env`
  * `backend/.env`
  * `frontend/.env`
* If one of the `.env.docker` files is missing, the script will warn you.

## Example flow

```bash
cd lab-final
bash init
docker compose -p lab-platform-prod -f docker-compose.prod.yml up --build
```
