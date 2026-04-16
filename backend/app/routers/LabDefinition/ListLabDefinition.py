# app/routers/LabDefinition/ListLabDefinition.py
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.config.connection.postgres_client import get_db
from app.schemas.LabDefinition.core import LabDefinitionResponse, PublicLabDefinitionResponse
from app.models.LabDefinition.core import LabDefinition
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions

router = APIRouter()

# Pre-configured dependency for admin OR moderator
require_admin_or_moderator = require_any_role(["admin", "moderator"])

@router.get(
    "/",
    response_model=List[LabDefinitionResponse],
    summary="List lab definitions",
)
def list_lab_definitions(
    skip: int = 0,
    limit: int = 100,
    category: str | None = None,
    difficulty: str | None = None,
    status: str | None = None,
    search: str | None = None, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
    response: Response = None  
):
    """
    List labs with filtering options.
    
    - **Admin**: sees all lab definitions
    - **Moderator**: sees only lab definitions they created
    """
    query = db.query(LabDefinition)
    
    # Apply role-based filtering using service layer
    query = LabPermissions.filter_by_ownership(query, current_user)
    
    if category:
        query = query.filter(LabDefinition.category == category)
    if difficulty:
        query = query.filter(LabDefinition.difficulty == difficulty)
    if status:
        query = query.filter(LabDefinition.status == status)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (LabDefinition.name.ilike(search_term)) |
            (LabDefinition.slug.ilike(search_term)) |
            (LabDefinition.description.ilike(search_term))
        )
    
    total_count = query.count()
    
    results = query.offset(skip).limit(limit).all()
    
    if response:
        response.headers["X-Total-Count"] = str(total_count)
        response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    
    return results


@router.get(
    "/public",
    response_model=List[PublicLabDefinitionResponse],
    summary="List published lab definitions (Any authenticated user)",
)
def list_public_lab_definitions(
    skip: int = 0,
    limit: int = 100,
    category: str | None = None,
    difficulty: str | None = None,
    db: Session = Depends(get_db)
):
    """
    List published lab definitions available to all logged-in users.
    
    Returns only essential catalog information without audit fields.
    """
    query = db.query(LabDefinition).filter(LabDefinition.status == "published")
    
    if category:
        query = query.filter(LabDefinition.category == category)
    if difficulty:
        query = query.filter(LabDefinition.difficulty == difficulty)
    
    return query.offset(skip).limit(limit).all()


@router.get(
    "/featured",
    response_model=List[PublicLabDefinitionResponse],
    summary="Get featured lab definitions for hero section",
)
def list_featured_lab_definitions(
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    Get featured/promoted lab definitions for the hero section.
    
    Returns labs marked as is_featured=true, ordered by featured_priority.
    Only published labs are returned.
    """
    query = db.query(LabDefinition).filter(
        LabDefinition.status == "published",
        LabDefinition.is_featured == True
    ).order_by(LabDefinition.featured_priority.asc().nulls_last())
    
    return query.limit(limit).all()

@router.get(
    "/labs/{slug}",
    response_model=PublicLabDefinitionResponse,
    summary="Get published lab by slug (Public access)",
)
def get_public_lab_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Get a single published lab definition by its slug.
    
    Public endpoint - no authentication required.
    Returns only essential catalog information without audit fields.
    """
    lab = db.query(LabDefinition).filter(
        LabDefinition.slug == slug,
        LabDefinition.status == "published"
    ).first()
    
    if not lab:
        raise HTTPException(
            status_code=404,
            detail=f"Lab with slug '{slug}' not found or not published"
        )
    
    return lab