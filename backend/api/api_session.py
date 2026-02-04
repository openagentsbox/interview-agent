"""
Session API - Interview session management
"""
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from pydantic import BaseModel
from typing import Optional, List, Literal
import httpx

from backend.config import SUPABASE_REST_URL, SUPABASE_HEADERS
from backend.api.api_chat import clear_info_cache
from backend.graph.checkpointer import delete_thread_checkpoints

router = APIRouter(prefix="/api/session", tags=["session"])

HEADERS = SUPABASE_HEADERS


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class SessionCreateRequest(BaseModel):
    application_id: str
    user_id: str
    type: Literal["recruiter", "technical", "behavioral", "hiring_manager"]
    mode: Literal["practice", "real"] = "practice"
    technical_level: Optional[Literal["beginner", "intermediate", "advanced"]] = None
    interviewer_name: Optional[str] = None
    additional_notes: Optional[str] = None
    must_ask_questions: Optional[List[str]] = None


class SessionUpdateRequest(BaseModel):
    status: Optional[Literal["active", "paused", "completed"]] = None
    interviewer_name: Optional[str] = None
    additional_notes: Optional[str] = None
    must_ask_questions: Optional[List[str]] = None


class SessionResponse(BaseModel):
    id: str
    application_id: str
    user_id: str
    type: str
    mode: str = "practice"
    technical_level: Optional[str] = None
    interviewer_name: Optional[str] = None
    additional_notes: Optional[str] = None
    must_ask_questions: list = []
    status: str
    created_at: str
    updated_at: str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.post("", response_model=SessionResponse)
@limiter.limit("10/minute")
async def create_session(request: Request, data: SessionCreateRequest):
    """Create a new interview session"""
    # Validate must_ask_questions: max 5 items
    questions = data.must_ask_questions or []
    if len(questions) > 5:
        raise HTTPException(status_code=400, detail="Must-ask questions cannot exceed 5")

    async with httpx.AsyncClient() as client:
        payload = {
            "application_id": data.application_id,
            "user_id": data.user_id,
            "type": data.type,
            "mode": data.mode,
            "technical_level": data.technical_level,
            "interviewer_name": data.interviewer_name,
            "additional_notes": data.additional_notes,
            "must_ask_questions": questions,
            "status": "active",
        }

        response = await client.post(
            f"{SUPABASE_REST_URL}/sessions",
            headers={**HEADERS, "Prefer": "return=representation"},
            json=payload,
        )

        if response.status_code != 201:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        result = response.json()
        return result[0] if isinstance(result, list) else result


@router.get("/application/{application_id}", response_model=List[SessionResponse])
async def get_application_sessions(application_id: str):
    """Get all sessions for an application"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_REST_URL}/sessions",
            headers=HEADERS,
            params={
                "application_id": f"eq.{application_id}",
                "order": "created_at.desc",
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return response.json()


@router.get("/user/{user_id}", response_model=List[SessionResponse])
async def get_user_sessions(user_id: str):
    """Get all sessions for a user"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_REST_URL}/sessions",
            headers=HEADERS,
            params={
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return response.json()


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Get a specific session"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_REST_URL}/sessions",
            headers=HEADERS,
            params={"id": f"eq.{session_id}"},
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        result = response.json()
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        return result[0]


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, data: SessionUpdateRequest):
    """Update a session"""
    async with httpx.AsyncClient() as client:
        payload = {}
        if data.status is not None:
            payload["status"] = data.status
        if data.interviewer_name is not None:
            payload["interviewer_name"] = data.interviewer_name
        if data.additional_notes is not None:
            payload["additional_notes"] = data.additional_notes
        if data.must_ask_questions is not None:
            if len(data.must_ask_questions) > 5:
                raise HTTPException(status_code=400, detail="Must-ask questions cannot exceed 5")
            payload["must_ask_questions"] = data.must_ask_questions

        if not payload:
            raise HTTPException(status_code=400, detail="No fields to update")

        response = await client.patch(
            f"{SUPABASE_REST_URL}/sessions",
            headers={**HEADERS, "Prefer": "return=representation"},
            params={"id": f"eq.{session_id}"},
            json=payload,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        result = response.json()
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        return result[0]


@router.delete("/{session_id}")
@limiter.limit("10/minute")
async def delete_session(request: Request, session_id: str):
    """Delete a session (also deletes all related messages and checkpoints)"""
    async with httpx.AsyncClient() as client:
        # 1. Delete session from sessions table
        response = await client.delete(
            f"{SUPABASE_REST_URL}/sessions",
            headers=HEADERS,
            params={"id": f"eq.{session_id}"},
        )

        print(f"🔍 DELETE /sessions response: {response.status_code}")
        if response.status_code not in (200, 204):
            raise HTTPException(status_code=response.status_code, detail=response.text)

    # 2. Delete LangGraph checkpoints
    await delete_thread_checkpoints(session_id)

    # 3. Clear info cache for this session
    clear_info_cache(session_id)

    return {"success": True, "message": "Session and checkpoints deleted"}
