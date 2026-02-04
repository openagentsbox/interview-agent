"""
Company/Application API
CRUD operations for job applications
"""
import traceback
import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from pydantic import BaseModel
from typing import Optional, List

from backend.config import SUPABASE_REST_URL, SUPABASE_HEADERS

HEADERS = SUPABASE_HEADERS

router = APIRouter(prefix="/api/company", tags=["company"])


# Request/Response Models
class ApplicationCreateRequest(BaseModel):
    """Create application request"""
    user_id: str
    company_name: str
    job_title: str
    job_description: Optional[str] = None
    industry: Optional[str] = None
    job_grade: Optional[str] = None


class ApplicationUpdateRequest(BaseModel):
    """Update application request"""
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    industry: Optional[str] = None
    job_grade: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Application response"""
    id: str
    user_id: str
    company_name: str
    job_title: str
    job_description: Optional[str] = None
    industry: Optional[str] = None
    job_grade: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ==================== CRUD Endpoints ====================

@router.post("", response_model=ApplicationResponse)
@limiter.limit("10/minute")
async def create_application(request: Request, data: ApplicationCreateRequest):
    """
    Create a new job application
    """
    try:
        record = {
            "user_id": data.user_id,
            "company_name": data.company_name,
            "job_title": data.job_title,
            "job_description": data.job_description,
            "industry": data.industry,
            "job_grade": data.job_grade,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_REST_URL}/applications",
                headers=HEADERS,
                json=record
            )

        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail=f"Create failed: {response.text}")

        saved = response.json()[0]
        return _to_response(saved)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Create application failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Create failed: {str(e)}")


@router.get("/user/{user_id}", response_model=List[ApplicationResponse])
async def get_user_applications(user_id: str):
    """
    Get all applications for a user
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_REST_URL}/applications",
                headers=HEADERS,
                params={
                    "user_id": f"eq.{user_id}",
                    "order": "created_at.desc"
                }
            )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Query failed: {response.text}")

        data = response.json()
        return [_to_response(item) for item in data]

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Get applications failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(application_id: str):
    """
    Get a specific application by ID
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_REST_URL}/applications",
                headers=HEADERS,
                params={"id": f"eq.{application_id}"}
            )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Query failed: {response.text}")

        data = response.json()
        if not data:
            raise HTTPException(status_code=404, detail="Application not found")

        return _to_response(data[0])

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Get application failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(application_id: str, data: ApplicationUpdateRequest):
    """
    Update an existing application
    """
    try:
        # Build update record (only include non-None fields)
        record = {}
        if data.company_name is not None:
            record["company_name"] = data.company_name
        if data.job_title is not None:
            record["job_title"] = data.job_title
        if data.job_description is not None:
            record["job_description"] = data.job_description
        if data.industry is not None:
            record["industry"] = data.industry
        if data.job_grade is not None:
            record["job_grade"] = data.job_grade

        if not record:
            raise HTTPException(status_code=400, detail="No fields to update")

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{SUPABASE_REST_URL}/applications?id=eq.{application_id}",
                headers=HEADERS,
                json=record
            )

        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=500, detail=f"Update failed: {response.text}")

        result = response.json()
        if not result:
            raise HTTPException(status_code=404, detail="Application not found")

        return _to_response(result[0])

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Update application failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.delete("/{application_id}")
@limiter.limit("10/minute")
async def delete_application(request: Request, application_id: str):
    """
    Delete an application
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{SUPABASE_REST_URL}/applications?id=eq.{application_id}",
                headers=HEADERS
            )

        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=500, detail=f"Delete failed: {response.text}")

        return {"success": True, "message": "Application deleted"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Delete application failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


# Helper function
def _to_response(data: dict) -> ApplicationResponse:
    return ApplicationResponse(
        id=data["id"],
        user_id=data["user_id"],
        company_name=data["company_name"],
        job_title=data["job_title"],
        job_description=data.get("job_description"),
        industry=data.get("industry"),
        job_grade=data.get("job_grade"),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )
