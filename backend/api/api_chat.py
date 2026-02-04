"""
Chat API - Interview conversation endpoint
Connects frontend to the LangGraph interview graph.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
import httpx

from backend.config import SUPABASE_REST_URL, SUPABASE_HEADERS
from backend.graph import get_graph

HEADERS = SUPABASE_HEADERS

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Info cache: session_id -> (interview_type, info dict)
_info_cache: dict[str, tuple[str, dict]] = {}


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    finished: bool = False
    total_round: int = 0
    task_topic: str = ""
    task_instruction: str = ""


# ─────────────────────────────────────────────
# Build graph config from DB
# ─────────────────────────────────────────────

async def get_session_info(session_id: str) -> tuple[str, dict]:
    """
    Fetch session / resume / application from Supabase,
    build the `info` dict that graph nodes expect.
    Returns (interview_type, info).
    """
    if session_id in _info_cache:
        return _info_cache[session_id]

    import asyncio

    async with httpx.AsyncClient() as client:
        # 1) Session (must fetch first — need user_id & application_id)
        res = await client.get(
            f"{SUPABASE_REST_URL}/sessions",
            headers=HEADERS,
            params={"id": f"eq.{session_id}"},
        )
        if res.status_code != 200 or not res.json():
            raise HTTPException(status_code=404, detail="Session not found")
        session = res.json()[0]

        # 2) Resume + Application in parallel
        resume_req = client.get(
            f"{SUPABASE_REST_URL}/resumes",
            headers=HEADERS,
            params={"user_id": f"eq.{session['user_id']}", "limit": "1"},
        )
        app_req = client.get(
            f"{SUPABASE_REST_URL}/applications",
            headers=HEADERS,
            params={"id": f"eq.{session['application_id']}"},
        )
        resume_res, app_res = await asyncio.gather(resume_req, app_req)

        if resume_res.status_code != 200 or not resume_res.json():
            raise HTTPException(status_code=404, detail="Resume not found")
        resume = resume_res.json()[0]

        if app_res.status_code != 200 or not app_res.json():
            raise HTTPException(status_code=404, detail="Application not found")
        application = app_res.json()[0]

    basic_info = resume.get("basic_info") or {}
    interview_type = session.get("type", "recruiter")

    info = {
        # Resume
        "name": basic_info.get("name") or "Candidate",
        "location": basic_info.get("location") or "",
        "professional_summary": resume.get("professional_summary") or "",
        "work_experience": resume.get("work_experience", []),
        "projects": resume.get("projects", []),
        "education": resume.get("education", []),
        "skills": {
            "hard_skills": basic_info.get("hard_skills", []),
            "soft_skills": basic_info.get("soft_skills", []),
            "languages": basic_info.get("languages", []),
        },
        "interview_hooks": resume.get("interview_hooks", []),
        # Application
        "company_name": application.get("company_name") or "",
        "job_title": application.get("job_title") or "",
        "job_description": application.get("job_description") or "",
        "industry": application.get("industry") or "",
        "job_grade": application.get("job_grade") or "",
        # Session
        "interviewer_name": session.get("interviewer_name") or "Interviewer",
        "additional_notes": session.get("additional_notes") or "",
        "technical_level": session.get("technical_level") or "",
        "selected_topics": session.get("must_ask_questions", []),
    }

    _info_cache[session_id] = (interview_type, info)
    return interview_type, info


def clear_info_cache(session_id: str = None):
    """Clear info cache"""
    if session_id:
        _info_cache.pop(session_id, None)
    else:
        _info_cache.clear()


# ─────────────────────────────────────────────
# Internal: invoke graph
# ─────────────────────────────────────────────

async def invoke_graph(session_id: str, message: str, api_key: str) -> tuple[str, bool, int, str, str]:
    """
    Invoke the interview graph for a session.
    Returns (ai_response, finished, total_round, task_topic, task_instruction).
    """
    interview_type, info = await get_session_info(session_id)

    config = {
        "configurable": {
            "thread_id": session_id,
            "interview_type": interview_type,
            "info": info,
            "api_key": api_key,
        }
    }

    graph = get_graph()

    # Check if state already exists (i.e. not the first call)
    existing = await graph.aget_state(config)
    is_first_call = not existing.values

    if is_first_call:
        graph_input = {
            "messages": [HumanMessage(content=message)],
            "total_round": 0,
            "max_round": 20,
            "task_queue": [],
            "current_task_topic": "",
            "current_task_instruction": "",
            "current_topic_count": 0,
            "completed_topics": [],
        }
    else:
        graph_input = {
            "messages": [HumanMessage(content=message)],
        }

    result = await graph.ainvoke(graph_input, config=config)
    ai_response = result["messages"][-1].content
    finished = result.get("current_task_topic") == "end"
    total_round = result.get("total_round", 0)
    task_topic = result.get("current_task_topic", "")
    task_instruction = result.get("current_task_instruction", "")
    return ai_response, finished, total_round, task_topic, task_instruction


# ─────────────────────────────────────────────
# Chat Endpoint
# ─────────────────────────────────────────────

@router.post("/{session_id}/start", response_model=ChatResponse)
async def start_interview(session_id: str, x_openai_key: str = Header(...)):
    """
    Initialize the interview graph for a session.
    Sends 'START' to trigger init_task_node + respond_node.
    Called automatically after session creation.
    """
    ai_response, finished, total_round, task_topic, task_instruction = await invoke_graph(session_id, "START", x_openai_key)
    return ChatResponse(
        response=ai_response,
        finished=finished,
        total_round=total_round,
        task_topic=task_topic,
        task_instruction=task_instruction,
    )


@router.post("/{session_id}", response_model=ChatResponse)
async def chat(session_id: str, data: ChatRequest, x_openai_key: str = Header(...)):
    """Send a message and get AI interviewer response"""
    ai_response, finished, total_round, task_topic, task_instruction = await invoke_graph(session_id, data.message, x_openai_key)

    # Auto-complete session in DB when interview ends
    if finished:
        try:
            async with httpx.AsyncClient() as client:
                patch_res = await client.patch(
                    f"{SUPABASE_REST_URL}/sessions",
                    headers=HEADERS,
                    params={"id": f"eq.{session_id}"},
                    json={"status": "completed"},
                )
                if patch_res.status_code not in (200, 204):
                    print(f"⚠️ Failed to mark session {session_id} as completed: {patch_res.status_code}")
        except Exception as e:
            print(f"⚠️ Failed to mark session {session_id} as completed: {e}")

    return ChatResponse(
        response=ai_response,
        finished=finished,
        total_round=total_round,
        task_topic=task_topic,
        task_instruction=task_instruction,
    )


@router.get("/{session_id}/history")
async def get_chat_history(session_id: str):
    """Get conversation history from checkpointer (filters out 'START')"""
    config = {"configurable": {"thread_id": session_id}}

    graph = get_graph()
    state = await graph.aget_state(config)

    if not state.values:
        return {"messages": [], "total_round": 0}

    messages = []
    for msg in state.values.get("messages", []):
        # Hide the internal 'START' trigger from the user
        if msg.type == "human" and msg.content == "START":
            continue
        messages.append({
            "role": "user" if msg.type == "human" else "assistant",
            "content": msg.content,
        })

    total_round = state.values.get("total_round", 0)
    return {"messages": messages, "total_round": total_round}
