# app/services/file_upload_service.py
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from PIL import Image
import aiofiles

# Configuration
UPLOAD_DIR = Path("uploads/images")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class FileUploadService:
    def __init__(self):
        self.upload_dir = UPLOAD_DIR
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _validate_image(self, file: UploadFile) -> None:
        """Validate file type and size."""
        # Check content type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
            )

        # Check extension
        file_ext = Path(file.filename or "").suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

    async def _validate_image_content(self, file_path: Path) -> None:
        """Validate that file is actually a valid image."""
        try:
            with Image.open(file_path) as img:
                img.verify()  # Verify it's a valid image
        except Exception:
            # Clean up invalid file
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=400, detail="Invalid or corrupted image file")

    async def save_lab_thumbnail(
        self, 
        file: UploadFile, 
        lab_id: uuid.UUID,
        max_dimensions: tuple[int, int] = (800, 600)
    ) -> str:
        """
        Save lab thumbnail image.
        
        Args:
            file: Uploaded file from FastAPI
            lab_id: UUID of the lab definition
            max_dimensions: Max width/height for resizing
            
        Returns:
            Relative URL path to the saved image
        """
        self._validate_image(file)

        # Create lab-specific directory: /images/{lab_uuid}/
        lab_dir = self.upload_dir / str(lab_id)
        lab_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename with original extension
        file_ext = Path(file.filename or "").suffix.lower()
        # Use a simple name since we only store 1 image per lab
        file_name = f"thumbnail{file_ext}"
        file_path = lab_dir / file_name

        # Save uploaded file temporarily
        temp_path = lab_dir / f"temp_{uuid.uuid4()}{file_ext}"
        
        try:
            # Write file in chunks to handle large files
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"
                )

            async with aiofiles.open(temp_path, 'wb') as f:
                await f.write(content)

            # Validate image content
            await self._validate_image_content(temp_path)

            # Process image: resize if needed, optimize
            with Image.open(temp_path) as img:
                # Convert to RGB if necessary (handles PNG with transparency)
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if larger than max_dimensions (maintaining aspect ratio)
                img.thumbnail(max_dimensions, Image.Resampling.LANCZOS)
                
                # Save optimized image
                save_kwargs = {"quality": 85, "optimize": True}
                if file_ext in [".png"]:
                    save_kwargs = {"optimize": True}
                
                img.save(file_path, **save_kwargs)

            # Clean up temp file
            temp_path.unlink(missing_ok=True)

            # Return relative URL path
            # This will be served by your static files middleware
            return f"/images/{lab_id}/{file_name}"

        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            # Clean up on error
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

    def delete_lab_images(self, lab_id: uuid.UUID) -> None:
        """Delete all images for a lab when lab is deleted."""
        lab_dir = self.upload_dir / str(lab_id)
        if lab_dir.exists():
            shutil.rmtree(lab_dir, ignore_errors=True)

    def get_image_path(self, lab_id: uuid.UUID, filename: str) -> Optional[Path]:
        """Get full path to an image file."""
        file_path = self.upload_dir / str(lab_id) / filename
        if file_path.exists():
            return file_path
        return None


# Singleton instance
file_upload_service = FileUploadService()