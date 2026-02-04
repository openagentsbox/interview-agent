"""
Feedback API - Grammar correction and Score/Better version
"""
import traceback
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from backend.graph import get_graph
from backend.api.api_chat import get_session_info
from backend.tools.feedback import get_grammar_async, get_score_better_async

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


# ==================== Grammar Correction ====================

class GrammarRequest(BaseModel):
    text: str


class GrammarResponse(BaseModel):
    corrected_version: str


@router.post("/grammar", response_model=GrammarResponse)
async def get_grammar(data: GrammarRequest, x_openai_key: str = Header(...)):
    """
    Grammar correction for user's answer
    """
    try:
        result = await get_grammar_async({"text": data.text}, x_openai_key)
        return GrammarResponse(corrected_version=result.corrected_version)
    except Exception as e:
        print(f"[ERROR] Grammar correction failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Grammar correction failed: {str(e)}")


# ==================== Score & Better Version ====================

class ScoreRequest(BaseModel):
    session_id: str
    question: str
    answer: str
    task_topic: str = ""
    task_instruction: str = ""


class ScoreResponse(BaseModel):
    score: int
    reasoning: str
    better_version: str


@router.post("/score", response_model=ScoreResponse)
async def get_score(data: ScoreRequest, x_openai_key: str = Header(...)):
    """
    Score and better version for user's answer
    Gets full context from session info and LangGraph state
    """
    try:
        # Get session info (resume, application, session data)
        interview_type, info = await get_session_info(data.session_id)

        # Use provided task_topic/instruction, or fallback to current LangGraph state
        current_task_topic = data.task_topic
        current_task_instruction = data.task_instruction

        if not current_task_topic:
            # Fallback: get from current LangGraph state
            graph = get_graph()
            config = {"configurable": {"thread_id": data.session_id}}
            state = await graph.aget_state(config)
            if state.values:
                current_task_topic = state.values.get("current_task_topic", "")
                current_task_instruction = state.values.get("current_task_instruction", "")

        # Format education and work_experience
        education = _format_education(info.get("education", []))
        work_experience = _format_work_experience(info.get("work_experience", []))

        # Build input for score_better
        input_data = {
            "name": info.get("name", "Candidate"),
            "education": education,
            "work_experience": work_experience,
            "professional_summary": info.get("professional_summary", ""),
            "company_name": info.get("company_name", ""),
            "job_description": info.get("job_description", "") or "Not provided",
            "additional_notes": info.get("additional_notes", "") or "",
            "interview_type": interview_type,
            "current_task_topic": current_task_topic or "General Question",
            "current_topic_instruction": current_task_instruction or "Evaluate the candidate's response",
            "last_question": data.question,
            "last_user_reply": data.answer,
        }

        result = await get_score_better_async(input_data, x_openai_key)

        return ScoreResponse(
            score=result.score,
            reasoning=result.reasoning,
            better_version=result.better_version,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Score feedback failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Score feedback failed: {str(e)}")


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
