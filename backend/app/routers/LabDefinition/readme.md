# LabDefinition Router Structure

app/
├── schemas/LabDefinition/
│   ├── __init__.py
│   ├── core.py                 # LabDefinitionBase, Create, Update, Response
│   ├── LabVM.py               # LabVM schemas
│   ├── VMTemplate.py          # VMTemplate schemas
│   └── full_lab.py            # NEW: FullLabDefinitionCreate, FullLabDefinitionResponse, LabVMItemCreate
└── routers/LabDefinition/
    ├── __init__.py
    ├── dependencies.py         # Shared auth utilities
    ├── labs.py                 # Main aggregator (no schemas)
    ├── ListLabDefinition.py
    ├── CreateLabDefinition.py  # Imports from app.schemas.LabDefinition.full_lab
    ├── GetLabDefinition.py     # Imports from app.schemas.LabDefinition.full_lab
    ├── UpdateLabDefinition.py
    ├── PublishLabDefinition.py
    ├── DeleteLabDefinition.py
    └── LabVMManagement.py


## Overview

This module contains all routers related to **Lab Definitions** in the application.  
It is organized in a modular way where each file handles a specific responsibility.

## Modules Breakdown

### `dependencies.py`
Shared utilities for:
- Authentication
- Authorization
- Ownership validation

### `schemas.py`
Contains all **Pydantic models** used across LabDefinition endpoints.

### `labs.py`
Acts as the **main router aggregator**, combining all sub-routers into a single entry point.

---

## Endpoint Modules

### `ListLabDefinition.py`
- `GET /`
- Lists all lab definitions

### `CreateLabDefinition.py`
- `POST /`
- `POST /full`
- Creates new lab definitions

### `GetLabDefinition.py`
- `GET /{lab_id}`
- `GET /slug/{slug}`
- Retrieves a specific lab definition

### `UpdateLabDefinition.py`
- `PUT /{lab_id}`
- Updates an existing lab definition

### `PublishLabDefinition.py`
- `POST /{lab_id}/publish`
- Publishes a lab definition

### `DeleteLabDefinition.py`
- `DELETE /{lab_id}`
- Deletes a lab definition

### `LabVMManagement.py`
Handles all VM-related operations for a lab definition.

---

## Design Notes

- Each endpoint group is separated into its own module for **clean architecture**
- Shared logic is centralized in `dependencies.py`
- Models are reused via `schemas.py`
- `labs.py` acts as the unified router entry point