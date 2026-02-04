"""
Message API - Chat message management for interview sessions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Literal
import httpx

from backend.config import SUPABASE_REST_URL, SUPABASE_HEADERS

router = APIRouter(prefix="/api/message", tags=["message"])

HEADERS = SUPABASE_HEADERS


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class MessageCreateRequest(BaseModel):
    session_id: str
    role: Literal["interviewer", "user"]
    content: str


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.post("", response_model=MessageResponse)
async def create_message(data: MessageCreateRequest):
    """Create a new message in a session"""
    async with httpx.AsyncClient() as client:
        payload = {
            "session_id": data.session_id,
            "role": data.role,
            "content": data.content,
        }

        response = await client.post(
            f"{SUPABASE_REST_URL}/messages",
            headers={**HEADERS, "Prefer": "return=representation"},
            json=payload,
        )

        if response.status_code != 201:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        result = response.json()
        return result[0] if isinstance(result, list) else result


@router.get("/session/{session_id}", response_model=List[MessageResponse])
async def get_session_messages(session_id: str):
    """Get all messages for a session (ordered by created_at)"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_REST_URL}/messages",
            headers=HEADERS,
            params={
                "session_id": f"eq.{session_id}",
                "order": "created_at.asc",
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return response.json()


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(message_id: str):
    """Get a specific message"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_REST_URL}/messages",
            headers=HEADERS,
            params={"id": f"eq.{message_id}"},
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        result = response.json()
        if not result:
            raise HTTPException(status_code=404, detail="Message not found")

        return result[0]


@router.delete("/{message_id}")
async def delete_message(message_id: str):
    """Delete a message"""
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{SUPABASE_REST_URL}/messages",
            headers=HEADERS,
            params={"id": f"eq.{message_id}"},
        )

        if response.status_code != 204:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return {"success": True, "message": "Message deleted"}


@router.delete("/session/{session_id}")
async def delete_session_messages(session_id: str):
    """Delete all messages for a session"""
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{SUPABASE_REST_URL}/messages",
            headers=HEADERS,
            params={"session_id": f"eq.{session_id}"},
        )

        if response.status_code != 204:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return {"success": True, "message": "All messages deleted"}
