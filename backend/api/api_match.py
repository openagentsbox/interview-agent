"""
Match Analysis API
Analyze resume-job fit
"""
import traceback
import httpx
from fastapi import APIRouter, HTTPException, Header, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from typing import Optional

from backend.config import SUPABASE_REST_URL, SUPABASE_HEADERS
from backend.tools.critic import get_critic_async

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/match", tags=["match"])


class MatchRequest(BaseModel):
    """Match analysis request"""
    user_id: str
    application_id: str


class MatchResponse(BaseModel):
    """Match analysis response"""
    score: int
    label: str
    score_reason: str


def get_score_label(score: int) -> str:
    """Convert score to label"""
    if score >= 8:
        return "Strong Match"
    elif score >= 6:
        return "Good Fit"
    elif score >= 4:
        return "Potential"
    else:
        return "Needs Work"


@router.get("/{application_id}", response_model=Optional[MatchResponse])
async def get_match_analysis(application_id: str):
    """
    Get existing match analysis for an application
    """
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{SUPABASE_REST_URL}/match_analyses",
                headers=SUPABASE_HEADERS,
                params={"application_id": f"eq.{application_id}"}
            )

        if res.status_code != 200:
            return None

        data = res.json()
        if not data:
            return None

        analysis = data[0]
        return MatchResponse(
            score=analysis["score"],
            label=analysis["label"],
            score_reason=analysis["score_reason"],
        )

    except Exception as e:
        print(f"[ERROR] Get match analysis failed: {e}")
        return None


@router.post("", response_model=MatchResponse)
@limiter.limit("5/minute")
async def analyze_match(
    request: Request,
    data: MatchRequest,
    x_openai_key: Optional[str] = Header(None),
):
    """
    Analyze resume-job fit and save to database
    """
    if not x_openai_key:
        raise HTTPException(status_code=401, detail="OpenAI API key required")

    try:
        # Fetch resume data
        async with httpx.AsyncClient() as client:
            resume_res = await client.get(
                f"{SUPABASE_REST_URL}/resumes",
                headers=SUPABASE_HEADERS,
                params={"user_id": f"eq.{data.user_id}"}
            )

        if resume_res.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch resume")

        resume_data = resume_res.json()
        if not resume_data:
            raise HTTPException(status_code=404, detail="Resume not found. Please upload your resume first.")

        resume = resume_data[0]

        # Fetch application data
        async with httpx.AsyncClient() as client:
            app_res = await client.get(
                f"{SUPABASE_REST_URL}/applications",
                headers=SUPABASE_HEADERS,
                params={"id": f"eq.{data.application_id}"}
            )

        if app_res.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch application")

        app_data = app_res.json()
        if not app_data:
            raise HTTPException(status_code=404, detail="Application not found")

        application = app_data[0]

        # Build input for critic
        basic_info = resume.get("basic_info", {}) or {}

        input_data = {
            "company_name": application.get("company_name", ""),
            "job_title": application.get("job_title", ""),
            "job_description": application.get("job_description", "") or "Not provided",
            "industry": application.get("industry", "") or "Not specified",
            "name": basic_info.get("name", ""),
            "education": _format_education(resume.get("education", [])),
            "hard_skill": ", ".join(basic_info.get("hard_skills", [])),
            "soft_skill": ", ".join(basic_info.get("soft_skills", [])),
            "interview_hook": _format_hooks(resume.get("interview_hooks", [])),
            "professional_summary": resume.get("professional_summary", ""),
            "work_experience": _format_work_experience(resume.get("work_experience", [])),
        }

        # Call critic
        result = await get_critic_async(input_data, x_openai_key)

        label = get_score_label(result.score)

        # Save to database (upsert)
        async with httpx.AsyncClient() as client:
            # Try to upsert (insert or update on conflict)
            save_res = await client.post(
                f"{SUPABASE_REST_URL}/match_analyses",
                headers={
                    **SUPABASE_HEADERS,
                    "Prefer": "resolution=merge-duplicates"
                },
                json={
                    "application_id": data.application_id,
                    "score": result.score,
                    "label": label,
                    "score_reason": result.score_reason,
                }
            )

            if save_res.status_code not in [200, 201]:
                print(f"[WARN] Failed to save match analysis: {save_res.text}")

        return MatchResponse(
            score=result.score,
            label=label,
            score_reason=result.score_reason,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Match analysis failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def _format_education(education: list) -> str:
    if not education:
        return "Not provided"
    parts = []
    for edu in education:
        if edu:
            school = edu.get("school", "")
            degree = edu.get("degree", "")
            major = edu.get("major", "")
            parts.append(f"{degree} in {major} from {school}".strip())
    return "; ".join(parts) if parts else "Not provided"


def _format_hooks(hooks: list) -> str:
    if not hooks:
        return "Not provided"
    parts = []
    for hook in hooks:
        if hook:
            name = hook.get("topic_name", "")
            details = hook.get("key_details", "")
            parts.append(f"{name}: {details}")
    return "; ".join(parts) if parts else "Not provided"


def _format_work_experience(experiences: list) -> str:
    if not experiences:
        return "Not provided"
    parts = []
    for exp in experiences:
        if exp:
            company = exp.get("company", "")
            role = exp.get("role", "")
            resp = exp.get("responsibilities_and_achievements", "")
            parts.append(f"{role} at {company}: {resp}")
    return "; ".join(parts) if parts else "Not provided"
