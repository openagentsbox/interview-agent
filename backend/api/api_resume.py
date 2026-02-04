"""
Resume API - Three endpoints
Using Supabase REST API (no supabase-py client needed)
"""
import tempfile
import traceback
import httpx
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Header
from pydantic import BaseModel
from typing import Optional

from backend.config import SUPABASE_REST_URL, SUPABASE_HEADERS
from backend.tools.resume_parser import parse_resume

HEADERS = SUPABASE_HEADERS

# Headers for UPSERT (update or insert)
UPSERT_HEADERS = {**SUPABASE_HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"}

router = APIRouter(prefix="/api/resume", tags=["resume"])


class ResumeResponse(BaseModel):
    """履歷回應 - 對應 ResumeSchema"""
    id: str
    user_id: Optional[str] = None
    basic_info: dict
    professional_summary: str
    interview_hooks: list
    work_experience: list
    projects: list
    education: list
    status: str


@router.post("", response_model=ResumeResponse)
async def parse_and_save_resume(
    file: UploadFile = File(...),
    user_id: str = Query(...),
    x_openai_key: str = Header(...)
):
    """
    一條龍：上傳 PDF → 解析 → 存資料庫 → 回傳結果
    """
    # 驗證 PDF
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="只接受 PDF 檔案")

    # Parse PDF
    try:
        content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        print(f"[DEBUG] Parsing PDF: {tmp_path}")
        parsed = parse_resume(tmp_path, x_openai_key)
        print(f"[DEBUG] Parse result: {parsed}")
        Path(tmp_path).unlink(missing_ok=True)

    except Exception as e:
        print(f"[ERROR] Parse failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Parse failed: {str(e)}")

    # Save to Supabase (using REST API)
    try:
        record = {
            "user_id": user_id,
            "basic_info": parsed.get("basic_info", {}),
            "professional_summary": parsed.get("professional_summary", ""),
            "interview_hooks": parsed.get("interview_hooks", []),
            "work_experience": parsed.get("work_experience", []),
            "projects": parsed.get("projects", []),
            "education": parsed.get("education", []),
            "status": "completed"
        }

        print(f"[DEBUG] Saving to Supabase (UPSERT): {record}")

        # Use UPSERT - update if user_id exists, insert if not
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_REST_URL}/resumes?on_conflict=user_id",
                headers=UPSERT_HEADERS,
                json=record
            )

        print(f"[DEBUG] Supabase response: {response.status_code} - {response.text}")

        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail=f"Save failed: {response.text}")

        saved = response.json()[0]

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Save failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")

    return ResumeResponse(
        id=saved["id"],
        user_id=saved.get("user_id"),
        basic_info=saved.get("basic_info", {}),
        professional_summary=saved.get("professional_summary", ""),
        interview_hooks=saved.get("interview_hooks", []),
        work_experience=saved.get("work_experience", []),
        projects=saved.get("projects", []),
        education=saved.get("education", []),
        status=saved.get("status", "completed")
    )


class ResumeUpdateRequest(BaseModel):
    """更新履歷的請求 - 對應 ResumeSchema"""
    basic_info: Optional[dict] = None
    professional_summary: Optional[str] = None
    interview_hooks: Optional[list] = None
    work_experience: Optional[list] = None
    projects: Optional[list] = None
    education: Optional[list] = None


@router.put("/{user_id}", response_model=ResumeResponse)
async def update_user_resume(user_id: str, data: ResumeUpdateRequest):
    """
    Update user's resume data (manual edit, not PDF upload)
    Uses UPSERT - creates if not exists, updates if exists
    """
    try:
        record = {
            "user_id": user_id,
            "basic_info": data.basic_info or {},
            "professional_summary": data.professional_summary or "",
            "interview_hooks": data.interview_hooks or [],
            "work_experience": data.work_experience or [],
            "projects": data.projects or [],
            "education": data.education or [],
            "status": "completed"
        }

        print(f"[DEBUG] Updating resume for user {user_id}: {record}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_REST_URL}/resumes?on_conflict=user_id",
                headers=UPSERT_HEADERS,
                json=record
            )

        print(f"[DEBUG] Supabase response: {response.status_code} - {response.text}")

        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail=f"Update failed: {response.text}")

        saved = response.json()[0]

        return ResumeResponse(
            id=saved["id"],
            user_id=saved.get("user_id"),
            basic_info=saved.get("basic_info", {}),
            professional_summary=saved.get("professional_summary", ""),
            interview_hooks=saved.get("interview_hooks", []),
            work_experience=saved.get("work_experience", []),
            projects=saved.get("projects", []),
            education=saved.get("education", []),
            status=saved.get("status", "completed")
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Update failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.get("/{user_id}", response_model=ResumeResponse)
async def get_user_resume(user_id: str):
    """
    Get user's resume by user_id
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_REST_URL}/resumes",
                headers=HEADERS,
                params={
                    "user_id": f"eq.{user_id}",
                    "order": "created_at.desc",
                    "limit": "1"
                }
            )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"查詢失敗: {response.text}")

        data = response.json()
        if not data:
            raise HTTPException(status_code=404, detail="找不到履歷")

        resume = data[0]

        return ResumeResponse(
            id=resume["id"],
            user_id=resume.get("user_id"),
            basic_info=resume.get("basic_info", {}),
            professional_summary=resume.get("professional_summary", ""),
            interview_hooks=resume.get("interview_hooks", []),
            work_experience=resume.get("work_experience", []),
            projects=resume.get("projects", []),
            education=resume.get("education", []),
            status=resume.get("status", "completed")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢失敗: {str(e)}")
